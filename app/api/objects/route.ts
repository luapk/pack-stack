import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const VALID_TYPES = [
  'football', 'basketball', 'tennis_ball', 'golf_clubs', 'baseball_bat',
  'sports_bag', 'backpack', 'suitcase', 'books_stack', 'vinyl_record', 'vinyl_stack',
  'guitar', 'lamp', 'plant_pot', 'coffee_mug', 'wine_bottle',
  'cardboard_box', 'toy_block', 'shoe', 'cable_bundle', 'picture_frame', 'pillow',
];

const PROMPT = `Look at this room photo and identify 3 recognisable, characterful objects from the visible clutter. The objects should be distinct from each other (not three of the same type) and represent different categories of mess.

Return ONLY valid JSON, no markdown fences, no prose:

{
  "objects": [
    {"type": "<one of the valid types>", "color": "#RRGGBB", "label": "short descriptor"},
    {"type": "<one of the valid types>", "color": "#RRGGBB", "label": "short descriptor"},
    {"type": "<one of the valid types>", "color": "#RRGGBB", "label": "short descriptor"}
  ]
}

VALID TYPES (use ONLY these, never invent new ones):
${VALID_TYPES.join(', ')}

RULES:
- Pick 3 objects that are actually visible in the photo. If there are records, include vinyl_stack or vinyl_record. If there are books, books_stack. If there's sports gear, pick the specific sport.
- Variety matters: do not return three books, or three bags. Different categories.
- Colour should roughly match what you see. For a brown leather bag, use something like #6B4423. For a green plant pot, #3A6B3A. Default to sensible natural tones if you can't tell.
- label is a short human-readable descriptor like "leather football" or "stack of novels" or "brass table lamp". Maximum 4 words.
- If the photo has fewer than 3 distinct recognisable categories, repeat a type with different colours rather than returning fewer than 3 objects.
- Pick objects that would look charming rendered as low-poly 3D, not abstract things like "paperwork" or "clutter".`;

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
        max_tokens: 800,
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
    let objects = (parsed.objects || []).filter((o: any) => VALID_TYPES.includes(o.type));

    // Fallback: if Claude returned fewer than 3 valid objects, pad with defaults
    const defaults = [
      { type: 'cardboard_box', color: '#B5956E', label: 'generic box' },
      { type: 'books_stack',   color: '#8B0000', label: 'books' },
      { type: 'coffee_mug',    color: '#F5F1E8', label: 'mug' },
    ];
    while (objects.length < 3) {
      objects.push(defaults[objects.length]);
    }
    objects = objects.slice(0, 3);

    return NextResponse.json({ objects });
  } catch (e: any) {
    return NextResponse.json({
      error: e.message,
      objects: [
        { type: 'cardboard_box', color: '#B5956E', label: 'box' },
        { type: 'books_stack',   color: '#8B0000', label: 'books' },
        { type: 'coffee_mug',    color: '#F5F1E8', label: 'mug' },
      ],
    }, { status: 200 });
  }
}
