import * as THREE from 'three';

// Every recipe returns a THREE.Group of low-poly primitives, roughly normalised
// to fit in a 1x1x1 bounding box so the scene composer can place them consistently.
// Keep poly counts low: spheres at 8-12 segments, cylinders at 6-8 segments.

export type ObjectType =
  | 'football'
  | 'basketball'
  | 'tennis_ball'
  | 'golf_clubs'
  | 'baseball_bat'
  | 'sports_bag'
  | 'backpack'
  | 'suitcase'
  | 'books_stack'
  | 'vinyl_record'
  | 'vinyl_stack'
  | 'guitar'
  | 'lamp'
  | 'plant_pot'
  | 'coffee_mug'
  | 'wine_bottle'
  | 'cardboard_box'
  | 'toy_block'
  | 'shoe'
  | 'cable_bundle'
  | 'picture_frame'
  | 'pillow';

const mat = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true });

export const OBJECT_RECIPES: Record<ObjectType, (color: string, accent?: string) => THREE.Group> = {

  football: (color = '#6B4423') => {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), mat(color));
    ball.scale.set(1, 0.7, 1);
    g.add(ball);
    // Laces hint — a small darker stripe
    const laces = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), mat('#F5F1E8'));
    laces.position.set(0, 0.32, 0);
    g.add(laces);
    return g;
  },

  basketball: (color = '#D2691E') => {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), mat(color));
    g.add(ball);
    // Seam lines — two torus rings
    const seam1 = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.01, 4, 12), mat('#0A0A0A'));
    g.add(seam1);
    const seam2 = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.01, 4, 12), mat('#0A0A0A'));
    seam2.rotation.x = Math.PI / 2;
    g.add(seam2);
    return g;
  },

  tennis_ball: (color = '#D4E157') => {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat(color));
    g.add(ball);
    return g;
  },

  golf_clubs: (color = '#C0C0C0', accent = '#2A2A2A') => {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6), mat(color));
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.04), mat(accent));
      head.position.y = -0.45;
      head.position.x = 0.05;
      const club = new THREE.Group();
      club.add(shaft);
      club.add(head);
      club.position.x = (i - 1) * 0.08;
      club.rotation.z = (i - 1) * 0.15;
      g.add(club);
    }
    // Bag body
    const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.5, 8), mat('#2A4A2A'));
    bag.position.y = -0.25;
    g.add(bag);
    return g;
  },

  baseball_bat: (color = '#8B6F4E') => {
    const g = new THREE.Group();
    const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.9, 8), mat(color));
    g.add(bat);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8), mat('#2A2A2A'));
    grip.position.y = -0.4;
    g.add(grip);
    return g;
  },

  sports_bag: (color = '#1A3A5A', accent = '#0A0A0A') => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 10), mat(color));
    body.rotation.z = Math.PI / 2;
    g.add(body);
    // End caps
    const cap1 = new THREE.Mesh(new THREE.CircleGeometry(0.25, 10), mat(color));
    cap1.position.x = 0.4;
    cap1.rotation.y = Math.PI / 2;
    g.add(cap1);
    const cap2 = cap1.clone();
    cap2.position.x = -0.4;
    cap2.rotation.y = -Math.PI / 2;
    g.add(cap2);
    // Handles
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 4, 8, Math.PI), mat(accent));
    handle.position.y = 0.25;
    handle.rotation.x = Math.PI / 2;
    g.add(handle);
    return g;
  },

  backpack: (color = '#2F4F4F') => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), mat(color));
    g.add(body);
    // Top pocket
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), mat(color));
    pocket.position.set(0, 0.1, 0.17);
    g.add(pocket);
    // Straps
    const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.05), mat('#1A1A1A'));
    strap1.position.set(-0.15, -0.05, -0.17);
    g.add(strap1);
    const strap2 = strap1.clone();
    strap2.position.x = 0.15;
    g.add(strap2);
    return g;
  },

  suitcase: (color = '#2A2A2A') => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.25), mat(color));
    g.add(body);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 4, 8, Math.PI), mat('#8A8A8A'));
    handle.position.y = 0.5;
    handle.rotation.x = Math.PI / 2;
    g.add(handle);
    // Wheels
    const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8), mat('#1A1A1A'));
    w1.rotation.z = Math.PI / 2;
    w1.position.set(-0.3, -0.45, 0);
    g.add(w1);
    const w2 = w1.clone();
    w2.position.x = 0.3;
    g.add(w2);
    return g;
  },

  books_stack: (color = '#8B0000') => {
    const g = new THREE.Group();
    const colors = [color, '#2A4A6B', '#6B4E2A', '#4A2A4A', '#2A4A4A'];
    for (let i = 0; i < 4; i++) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.45 + Math.random() * 0.1, 0.06, 0.35),
        mat(colors[i % colors.length])
      );
      book.position.y = -0.3 + i * 0.065;
      book.rotation.y = (Math.random() - 0.5) * 0.2;
      g.add(book);
    }
    return g;
  },

  vinyl_record: (color = '#0A0A0A') => {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.01, 20), mat(color));
    g.add(disc);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.012, 16), mat('#D4A574'));
    g.add(label);
    return g;
  },

  vinyl_stack: (color = '#0A0A0A') => {
    const g = new THREE.Group();
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.02), mat(color));
    for (let i = 0; i < 5; i++) {
      const s = sleeve.clone();
      s.material = mat(['#D4A574', '#8B0000', '#2A4A6B', '#4A2A4A', '#6B4423'][i]);
      s.position.z = -0.2 + i * 0.025;
      g.add(s);
    }
    return g;
  },

  guitar: (color = '#8B4513') => {
    const g = new THREE.Group();
    // Body — two spheres squashed
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), mat(color));
    body.scale.set(1, 1.2, 0.25);
    g.add(body);
    // Neck
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.05), mat('#5A2E0A'));
    neck.position.y = 0.55;
    g.add(neck);
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 0.04), mat('#5A2E0A'));
    head.position.y = 0.95;
    g.add(head);
    // Sound hole
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), mat('#0A0A0A'));
    hole.position.set(0, 0.05, 0.13);
    g.add(hole);
    return g;
  },

  lamp: (color = '#D4A574') => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.05, 10), mat('#2A2A2A'));
    base.position.y = -0.4;
    g.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), mat('#2A2A2A'));
    stem.position.y = -0.1;
    g.add(stem);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.3, 10, 1, true), mat(color));
    shade.position.y = 0.3;
    g.add(shade);
    return g;
  },

  plant_pot: (color = '#C87A5A') => {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.3, 10), mat(color));
    pot.position.y = -0.25;
    g.add(pot);
    // Leaves
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.35, 5), mat('#3A6B3A'));
      const angle = (i / 5) * Math.PI * 2;
      leaf.position.set(Math.cos(angle) * 0.08, 0.05, Math.sin(angle) * 0.08);
      leaf.rotation.z = Math.cos(angle) * 0.3;
      leaf.rotation.x = Math.sin(angle) * 0.3;
      g.add(leaf);
    }
    return g;
  },

  coffee_mug: (color = '#F5F1E8') => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.35, 12), mat(color));
    g.add(body);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 4, 8, Math.PI), mat(color));
    handle.position.x = 0.2;
    handle.rotation.y = Math.PI / 2;
    g.add(handle);
    return g;
  },

  wine_bottle: (color = '#1A3A1A') => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 10), mat(color));
    body.position.y = -0.1;
    g.add(body);
    const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.15, 10), mat(color));
    shoulder.position.y = 0.23;
    g.add(shoulder);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 8), mat(color));
    neck.position.y = 0.43;
    g.add(neck);
    return g;
  },

  cardboard_box: (color = '#B5956E') => {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), mat(color));
    g.add(box);
    // Tape line
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.02, 0.1), mat('#D4A574'));
    tape.position.y = 0.26;
    g.add(tape);
    return g;
  },

  toy_block: (color = '#E74C3C') => {
    const g = new THREE.Group();
    const colors = [color, '#3498DB', '#F1C40F', '#2ECC71'];
    for (let i = 0; i < 4; i++) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mat(colors[i]));
      const angle = (i / 4) * Math.PI * 2;
      block.position.set(Math.cos(angle) * 0.2, Math.sin(i) * 0.1, Math.sin(angle) * 0.2);
      block.rotation.y = angle;
      g.add(block);
    }
    return g;
  },

  shoe: (color = '#FFFFFF', accent = '#0A0A0A') => {
    const g = new THREE.Group();
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.3), mat(accent));
    sole.position.y = -0.2;
    g.add(sole);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.25, 0.28), mat(color));
    body.position.y = -0.03;
    g.add(body);
    const heel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.28), mat(color));
    heel.position.set(-0.2, 0.08, 0);
    g.add(heel);
    return g;
  },

  cable_bundle: (color = '#2A2A2A') => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.3, -0.2 + i * 0.05, (Math.random() - 0.5) * 0.3),
        new THREE.Vector3(-0.1, 0.1 + i * 0.05, (Math.random() - 0.5) * 0.3),
        new THREE.Vector3(0.1, -0.05 + i * 0.05, (Math.random() - 0.5) * 0.3),
        new THREE.Vector3(0.3, 0.2 + i * 0.05, (Math.random() - 0.5) * 0.3),
      ]);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 12, 0.015, 5, false),
        mat(['#2A2A2A', '#E74C3C', '#F1C40F', '#FFFFFF'][i])
      );
      g.add(tube);
    }
    return g;
  },

  picture_frame: (color = '#8B4513') => {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.03), mat(color));
    g.add(frame);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.035), mat('#D4C5A0'));
    g.add(inner);
    return g;
  },

  pillow: (color = '#F5D76E') => {
    const g = new THREE.Group();
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.5), mat(color));
    // Slight bevel with corner spheres
    for (const [x, z] of [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]]) {
      const corner = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), mat(color));
      corner.position.set(x, 0, z);
      pillow.add(corner);
    }
    g.add(pillow);
    return g;
  },
};

export const OBJECT_TYPES: ObjectType[] = Object.keys(OBJECT_RECIPES) as ObjectType[];
