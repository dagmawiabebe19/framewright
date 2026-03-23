import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { VfxShot } from "./types";
import { tcToSeconds } from "./timecode";

let ffmpegSingleton: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

/** ffmpeg.wasm needs SharedArrayBuffer + cross-origin isolation (COOP/COEP). */
export function ffmpegWasmSupported(): boolean {
  if (typeof SharedArrayBuffer === "undefined") return false;
  const g = globalThis as typeof globalThis & { crossOriginIsolated?: boolean };
  if (typeof g.crossOriginIsolated === "boolean" && !g.crossOriginIsolated) {
    return false;
  }
  return true;
}

async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpegSingleton?.loaded) return ffmpegSingleton;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    const base = `${typeof window !== "undefined" ? window.location.origin : ""}/ffmpeg`;
    const coreURL = await toBlobURL(
      `${base}/ffmpeg-core.js`,
      "text/javascript"
    );
    const wasmURL = await toBlobURL(
      `${base}/ffmpeg-core.wasm`,
      "application/wasm"
    );
    await ffmpeg.load({ coreURL, wasmURL });
    ffmpegSingleton = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

export async function loadFfmpeg(): Promise<FFmpeg> {
  return getFfmpeg();
}

function getExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i >= 0 ? fileName.slice(i) : ".mp4";
}

async function writeInputToFfmpeg(
  ffmpeg: FFmpeg,
  videoFile: File
): Promise<string> {
  const inputName = `input_video${getExtension(videoFile.name)}`.replace(
    /[^\w.-]/g,
    "_"
  );
  await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
  return inputName;
}

/**
 * Write the video once to the ffmpeg virtual FS. Returns the input path.
 */
export async function writeVideoToFfmpeg(videoFile: File): Promise<string> {
  const ffmpeg = await loadFfmpeg();
  return writeInputToFfmpeg(ffmpeg, videoFile);
}

export function cleanupVideoInput(ffmpeg: FFmpeg, inputName: string): void {
  ffmpeg.deleteFile(inputName).catch(() => undefined);
}

/**
 * Seek to (record TC In − video start TC) and extract one 320×180 JPEG.
 */
export async function extractFrameFromLoaded(
  ffmpeg: FFmpeg,
  inputName: string,
  recordTcIn: string,
  sequenceFps: number,
  sequenceDropFrame: boolean,
  videoStartTc: string,
  shotIndex: number
): Promise<Uint8Array> {
  const recSec = tcToSeconds(recordTcIn, sequenceFps, sequenceDropFrame);
  const startSec =
    tcToSeconds(videoStartTc.trim() || "00:00:00:00", sequenceFps, sequenceDropFrame) ??
    0;
  const seekSec = Math.max(0, (recSec ?? 0) - startSec);
  const outName = `frame_${shotIndex}.jpg`;

  await ffmpeg.exec([
    "-y",
    "-ss",
    seekSec.toFixed(4),
    "-i",
    inputName,
    "-frames:v",
    "1",
    "-vf",
    "scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2",
    "-q:v",
    "3",
    outName,
  ]);

  const data = (await ffmpeg.readFile(outName)) as Uint8Array;
  await ffmpeg.deleteFile(outName).catch(() => undefined);
  return data;
}

export interface ExtractThumbnailsOptions {
  videoStartTc: string;
  sequenceFps: number;
  sequenceDropFrame: boolean;
  onProgress: (current: number, total: number, message: string) => void;
}

/**
 * Returns one buffer per shot: extracted JPEG or `null` (Excel uses placeholder).
 */
export async function extractThumbnails(
  videoFile: File | null,
  shots: VfxShot[],
  options: ExtractThumbnailsOptions
): Promise<(Uint8Array | null)[]> {
  const total = shots.length;
  const { videoStartTc, sequenceFps, sequenceDropFrame, onProgress } = options;
  const out: (Uint8Array | null)[] = shots.map(() => null);

  if (!videoFile?.size) {
    return out;
  }

  if (!ffmpegWasmSupported()) {
    return out;
  }

  let ffmpeg: FFmpeg;
  try {
    ffmpeg = await loadFfmpeg();
  } catch {
    return out;
  }

  let inputName: string;
  try {
    inputName = await writeInputToFfmpeg(ffmpeg, videoFile);
  } catch {
    return out;
  }

  try {
    for (let i = 0; i < total; i++) {
      onProgress(
        i + 1,
        total,
        `Extracting frame ${i + 1} of ${total}...`
      );
      try {
        const frame = await extractFrameFromLoaded(
          ffmpeg,
          inputName,
          shots[i].tcInRec,
          sequenceFps,
          sequenceDropFrame,
          videoStartTc,
          i
        );
        out[i] = frame.byteLength ? frame : null;
      } catch {
        out[i] = null;
      }
    }
  } finally {
    cleanupVideoInput(ffmpeg, inputName);
  }

  return out;
}

export function detectTcMismatch(
  shots: VfxShot[],
  durationSec: number,
  videoStartTc: string,
  sequenceFps: number,
  sequenceDropFrame: boolean
): boolean {
  if (durationSec <= 0) return false;
  const startSec =
    tcToSeconds(videoStartTc.trim() || "00:00:00:00", sequenceFps, sequenceDropFrame) ??
    0;
  for (const s of shots) {
    const recSec = tcToSeconds(s.tcInRec, sequenceFps, sequenceDropFrame);
    if (recSec === null) continue;
    const t = recSec - startSec;
    if (t < -0.02 || t > durationSec + 0.1) return true;
  }
  return false;
}
