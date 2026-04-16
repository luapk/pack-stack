# IKEA My Space v0.6

Upload or photograph a messy room. Get a Nano Banana 2 render of the same space, reorganized with real IKEA storage. Interactive hotspots show product details. A 3D architectural model builds in real time during render.

Stack: Next.js 14 App Router, Vercel, Claude Sonnet 4.5 (vision), Gemini Nano Banana 2, Three.js

## Deploy

1. Push to GitHub
2. Import to Vercel
3. Add env vars in Vercel Settings > Environment Variables:
   - ANTHROPIC_API_KEY (from console.anthropic.com)
   - GEMINI_API_KEY (from aistudio.google.com/apikey, billing enabled)
4. Redeploy
