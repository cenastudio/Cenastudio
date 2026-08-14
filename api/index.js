// Vercel serverless catch-all — single Express function.
// All traffic routed through vercel.json rewrites lands here:
//   /api/* , /health , /ready  →  this function
//   everything else            →  served from dist/public (SPA shell)
// The Express app is the compiled esbuild bundle (dist/index.js), so the
// same artifact validated by `npm run build` runs in production.
export { default } from '../dist/index.js';
