import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const PROMPT = `Look at this room photo and identify 3 distinct, recognisable, characterful objects from the visible clutter. Return their bounding boxes so we can crop and silhouette them.

Return ONLY valid JSON, no markdown fences, no prose:

{
  "objects": [
    {"label": "short name", "bbox": [x, y, w, h], "dominant_color": "#RRGGBB"},
    {"label": "short name", "bbox": [x, y, w, h], "dominant_color": "#RRGGBB"},
    {"label": "short name", "bbox": [x, y, w, h], "dominant_color": "#RRGGBB"}
  ]
}

RULES:
- bbox is normalized 0-1 coordinates: [0,0] is top-left of the photo, [1,1] is bottom-right. x,y is the top-left corner of the box, w,h are width and height as fractions of the image.
- Choose objects that are clearly separated from each other in the image, not overlapping.
- Prefer objects with clear silhouettes against simpler backgrounds (a football on a rug will silhouette better than books lost in a stack).
- Variety matters: if the room has books, a bag, and a plant, pick those three rather than three books.
- label is 2-4 words describing what it is ("leather football", "red coffee mug", "potted fern").
- dominant_color is an approximate hex for the object's main colour, used as fallback shading if silhouette extraction fails.
- Bounding boxes should be TIGHT to the object's outline, minimal padding.
- Each bbox should be at least 0.08 wide AND 0.08 tall so there's enough pixels to silhouette. Avoid tiny objects.
- If there aren't 3 good candidates, still return 3 with your best choices.`;

export async function POST(req: Request) {
  try {
    const { base64, mediaType } = await req.json();
    if (!base64) return NextResponse.json({ error: 'No image' }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 }},
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Claude ${res.status}: ${text.slice(0, 200)}` }, { status: 500 });
    }
    const data = await res.json();
    const text = data.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    let objects = (parsed.objects || []).filter((o: any) =>
      o.bbox && Array.isArray(o.bbox) && o.bbox.length === 4
    ).slice(0, 3);

    while (objects.length < 3) {
      objects.push({
        label: 'item',
        bbox: [0.3 + objects.length * 0.2, 0.4, 0.15, 0.2],
        dominant_color: '#8B6F4E',
      });
    }

    return NextResponse.json({ objects });
  } catch (e: any) {
    return NextResponse.json({
      error: e.message,
      objects: [
        { label: 'item 1', bbox: [0.1, 0.4, 0.2, 0.3], dominant_color: '#8B6F4E' },
        { label: 'item 2', bbox: [0.4, 0.4, 0.2, 0.3], dominant_color: '#8B0000' },
        { label: 'item 3', bbox: [0.7, 0.4, 0.2, 0.3], dominant_color: '#2A4A6B' },
      ],
    }, { status: 200 });
  }
}
