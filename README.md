# VFX Sheet Generator

Next.js 14 app: upload a sequence file (EDL, Premiere XML, FCPXML, ALE) and optional reference video, then download an Excel VFX shot sheet with thumbnails (via ffmpeg.wasm in the browser).

## Develop

```bash
npm install
npm run dev
```

`postinstall` copies `@ffmpeg/core` into `public/ffmpeg/` so ffmpeg.wasm loads same-origin (required with COOP/COEP).

## Deploy on Vercel

Import the repo, use the default Next.js preset, and deploy. Headers for `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` are set in `next.config.mjs` for SharedArrayBuffer.

## Sample EDL

See `public/samples/sample.edl`.
