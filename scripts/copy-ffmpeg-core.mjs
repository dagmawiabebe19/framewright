import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcDir = path.join(root, "node_modules", "@ffmpeg", "core", "dist", "esm");
const destDir = path.join(root, "public", "ffmpeg");

try {
  if (!fs.existsSync(srcDir)) {
    console.warn(
      "[copy-ffmpeg-core] @ffmpeg/core not found; skip (run npm install)."
    );
    process.exit(0);
  }
  fs.mkdirSync(destDir, { recursive: true });
  for (const f of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
    fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
  }
  console.log("[copy-ffmpeg-core] Copied ffmpeg core to public/ffmpeg/");
} catch (e) {
  console.warn("[copy-ffmpeg-core]", e);
  process.exit(0);
}
