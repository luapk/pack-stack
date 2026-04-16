// Client-side image silhouette extraction.
// Given a source image and a normalised bounding box, returns a polygon path
// that roughly traces the foreground silhouette within that box, suitable for
// feeding into THREE.Shape + ExtrudeGeometry.

export type Point = { x: number; y: number };

// Luminance-based background/foreground classification.
// We sample the corners of the bbox (assumed background) and threshold against them.
export async function extractSilhouette(
  imageUrl: string,
  bbox: [number, number, number, number],
  targetSize = 128,
): Promise<{ points: Point[]; width: number; height: number; averageColor: string } | null> {
  const img = await loadImage(imageUrl);

  const [bx, by, bw, bh] = bbox;
  const sx = Math.max(0, Math.floor(bx * img.naturalWidth));
  const sy = Math.max(0, Math.floor(by * img.naturalHeight));
  const sw = Math.min(img.naturalWidth  - sx, Math.floor(bw * img.naturalWidth));
  const sh = Math.min(img.naturalHeight - sy, Math.floor(bh * img.naturalHeight));

  if (sw < 8 || sh < 8) return null;

  // Normalise crop to targetSize on the longer axis
  const aspect = sw / sh;
  const cw = aspect >= 1 ? targetSize : Math.round(targetSize * aspect);
  const ch = aspect >= 1 ? Math.round(targetSize / aspect) : targetSize;

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);

  const imageData = ctx.getImageData(0, 0, cw, ch);
  const data = imageData.data;

  // Sample corners for background estimate
  const corners = [
    [0, 0], [cw - 1, 0], [0, ch - 1], [cw - 1, ch - 1],
    [Math.floor(cw / 2), 0], [Math.floor(cw / 2), ch - 1],
    [0, Math.floor(ch / 2)], [cw - 1, Math.floor(ch / 2)],
  ];
  let br = 0, bg = 0, bb = 0;
  corners.forEach(([x, y]) => {
    const i = (y * cw + x) * 4;
    br += data[i]; bg += data[i + 1]; bb += data[i + 2];
  });
  br /= corners.length; bg /= corners.length; bb /= corners.length;

  // Foreground mask — pixels that differ enough from background average
  const mask = new Uint8Array(cw * ch);
  let fgR = 0, fgG = 0, fgB = 0, fgCount = 0;
  const threshold = 40;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      const dr = data[i] - br;
      const dg = data[i + 1] - bg;
      const db = data[i + 2] - bb;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist > threshold) {
        mask[y * cw + x] = 1;
        fgR += data[i]; fgG += data[i + 1]; fgB += data[i + 2];
        fgCount++;
      }
    }
  }
  const avgColor = fgCount > 0
    ? `rgb(${Math.round(fgR / fgCount)},${Math.round(fgG / fgCount)},${Math.round(fgB / fgCount)})`
    : '#8B6F4E';

  // If fewer than 5% of pixels classified as foreground, silhouette extraction
  // failed — return null so the caller can use a fallback shape.
  if (fgCount < cw * ch * 0.05) return null;

  // Morphological cleanup: dilate then erode to fill gaps, plus border clamp
  const dilated = dilate(mask, cw, ch);
  const cleaned = erode(dilated, cw, ch);

  // Find the largest connected component to reject stray pixels
  const largest = largestComponent(cleaned, cw, ch);
  if (!largest) return null;

  // Trace the boundary of the component
  const contour = traceContour(largest, cw, ch);
  if (contour.length < 8) return null;

  // Simplify with Douglas-Peucker to get a reasonable polygon
  const simplified = douglasPeucker(contour, 1.5);
  if (simplified.length < 6) return null;

  return {
    points: simplified,
    width: cw,
    height: ch,
    averageColor: avgColor,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function dilate(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let on = 0;
      for (let dy = -1; dy <= 1 && !on; dy++) {
        for (let dx = -1; dx <= 1 && !on; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (mask[ny * w + nx]) on = 1;
        }
      }
      out[y * w + x] = on;
    }
  }
  return out;
}

function erode(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let all = 1;
      for (let dy = -1; dy <= 1 && all; dy++) {
        for (let dx = -1; dx <= 1 && all; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) { all = 0; break; }
          if (!mask[ny * w + nx]) all = 0;
        }
      }
      out[y * w + x] = all;
    }
  }
  return out;
}

function largestComponent(mask: Uint8Array, w: number, h: number): Uint8Array | null {
  const labels = new Int32Array(w * h);
  let nextLabel = 1;
  const sizes: Record<number, number> = {};
  const stack: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!mask[idx] || labels[idx]) continue;
      const label = nextLabel++;
      stack.push(idx);
      let count = 0;
      while (stack.length) {
        const i = stack.pop()!;
        if (labels[i] || !mask[i]) continue;
        labels[i] = label;
        count++;
        const px = i % w, py = (i - px) / w;
        if (px > 0)     stack.push(i - 1);
        if (px < w - 1) stack.push(i + 1);
        if (py > 0)     stack.push(i - w);
        if (py < h - 1) stack.push(i + w);
      }
      sizes[label] = count;
    }
  }

  let bestLabel = 0, bestSize = 0;
  for (const [l, s] of Object.entries(sizes)) {
    if (s > bestSize) { bestSize = s; bestLabel = parseInt(l); }
  }
  if (!bestLabel) return null;

  const out = new Uint8Array(w * h);
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === bestLabel) out[i] = 1;
  }
  return out;
}

// Moore neighbour boundary tracing
function traceContour(mask: Uint8Array, w: number, h: number): Point[] {
  // Find first foreground pixel (top-left scan)
  let startX = -1, startY = -1;
  outer: for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) { startX = x; startY = y; break outer; }
    }
  }
  if (startX < 0) return [];

  const contour: Point[] = [];
  const dirs = [
    [0, -1], [1, -1], [1, 0], [1, 1],
    [0, 1],  [-1, 1], [-1, 0], [-1, -1],
  ];
  let cx = startX, cy = startY;
  let dir = 0;
  const maxSteps = (w + h) * 4;
  let steps = 0;

  do {
    contour.push({ x: cx, y: cy });
    let found = false;
    for (let k = 0; k < 8; k++) {
      const d = (dir + 6 + k) % 8;
      const nx = cx + dirs[d][0];
      const ny = cy + dirs[d][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (mask[ny * w + nx]) {
        cx = nx; cy = ny; dir = d; found = true;
        break;
      }
    }
    if (!found) break;
    steps++;
  } while (!(cx === startX && cy === startY) && steps < maxSteps);

  return contour;
}

function douglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left  = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  const num = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x);
  const den = Math.hypot(dx, dy);
  return num / den;
}
