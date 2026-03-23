/**
 * Timecode utilities — NTSC drop-frame adjustment ported from FFmpeg
 * (libavutil/timecode.c, LGPL 2.1+).
 */

export type FpsPreset =
  | "23.976"
  | "24"
  | "25"
  | "29.97DF"
  | "29.97NDF"
  | "30"
  | "50"
  | "59.94"
  | "60";

export const FPS_PRESET_VALUES: Record<
  FpsPreset,
  { nominalFps: number; rational: number; dropFrame: boolean }
> = {
  "23.976": { nominalFps: 24, rational: 24000 / 1001, dropFrame: false },
  "24": { nominalFps: 24, rational: 24, dropFrame: false },
  "25": { nominalFps: 25, rational: 25, dropFrame: false },
  "29.97DF": { nominalFps: 30, rational: 30000 / 1001, dropFrame: true },
  "29.97NDF": { nominalFps: 30, rational: 30000 / 1001, dropFrame: false },
  "30": { nominalFps: 30, rational: 30, dropFrame: false },
  "50": { nominalFps: 50, rational: 50, dropFrame: false },
  "59.94": { nominalFps: 60, rational: 60000 / 1001, dropFrame: false },
  "60": { nominalFps: 60, rational: 60, dropFrame: false },
};

export interface TcParts {
  h: number;
  m: number;
  s: number;
  f: number;
}

const TC_RE = /^(\d{1,2}):(\d{2}):(\d{2})[:;.](\d{1,3})$/;

export function parseTcString(tc: string): TcParts | null {
  const t = tc.trim();
  const m = t.match(TC_RE);
  if (!m) return null;
  return {
    h: Number(m[1]),
    m: Number(m[2]),
    s: Number(m[3]),
    f: Number(m[4]),
  };
}

export function formatTc(
  parts: TcParts,
  nominalFps: number,
  dropFrame: boolean
): string {
  const sep = dropFrame ? ";" : ":";
  const ffW =
    nominalFps > 100 ? 3 : nominalFps > 30 ? 2 : nominalFps > 10 ? 2 : 2;
  const f = Math.min(parts.f, nominalFps - 1);
  const hh = String(parts.h).padStart(2, "0");
  const mm = String(parts.m).padStart(2, "0");
  const ss = String(parts.s).padStart(2, "0");
  const ff = String(f).padStart(ffW, "0");
  return `${hh}:${mm}:${ss}${sep}${ff}`;
}

/** FFmpeg av_timecode_adjust_ntsc_framenum2 — signed math */
export function ntscFrameAdjust(framenum: number, nominalFps: number): number {
  if (!nominalFps || nominalFps % 30 !== 0) return framenum;
  const dropFrames = (nominalFps / 30) * 2;
  const framesPer10Mins = (nominalFps / 30) * 17982;
  const d = Math.floor(framenum / framesPer10Mins);
  const m = framenum % framesPer10Mins;
  const inner = Math.trunc((m - dropFrames) / (framesPer10Mins / 10));
  return framenum + 9 * dropFrames * d + dropFrames * inner;
}

/**
 * Internal linear frame index used by editors (drop-frame TC → frames).
 * nominalFps is display base (30 for 29.97 DF).
 */
export function tcPartsToInternalFrames(
  p: TcParts,
  nominalFps: number,
  dropFrame: boolean
): number {
  const tmins = 60 * p.h + p.m;
  const linear =
    (p.h * 3600 + p.m * 60 + p.s) * nominalFps + p.f;
  if (!dropFrame) return linear;
  return linear - (nominalFps / 30) * 2 * (tmins - Math.floor(tmins / 10));
}

export function tcStringToInternalFrames(
  tc: string,
  nominalFps: number,
  dropFrameOverride?: boolean
): number | null {
  const raw = tc.trim();
  const isDf = raw.includes(";") || raw.includes(".");
  const dropFrame = dropFrameOverride ?? isDf;
  const normalized = raw.replace(";", ":").replace(".", ":");
  const p = parseTcString(normalized);
  if (!p) return null;
  return tcPartsToInternalFrames(p, nominalFps, dropFrame);
}

/** Seconds on the sequence timeline (uses real fps, e.g. 24000/1001). */
export function tcToSeconds(
  tc: string,
  fps: number,
  dropFrame: boolean
): number | null {
  const nominal = dropFrame ? 30 : Math.round(fps) || 24;
  const frames = tcStringToInternalFrames(tc.trim(), nominal, dropFrame);
  if (frames === null) return null;
  return frames / fps;
}

export function internalFramesToTcString(
  internalFrames: number,
  nominalFps: number,
  dropFrame: boolean
): string {
  let n = internalFrames;
  if (dropFrame) n = ntscFrameAdjust(n, nominalFps);
  const ff = ((n % nominalFps) + nominalFps) % nominalFps;
  const totalSec = Math.floor(n / nominalFps);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60) % 24;
  return formatTc({ h, m, s, f: ff }, nominalFps, dropFrame);
}

function framesToTcNonDrop(
  frames: number,
  nominalFps: number,
  rational: number
): string {
  if (Math.abs(rational - nominalFps) < 1e-6) {
    const perH = nominalFps * 3600;
    const perM = nominalFps * 60;
    const h = Math.floor(frames / perH);
    let r = frames % perH;
    const m = Math.floor(r / perM);
    r %= perM;
    const s = Math.floor(r / nominalFps);
    const f = r % nominalFps;
    return formatTc({ h, m, s, f }, nominalFps, false);
  }
  const sec = frames / rational;
  const h = Math.floor(sec / 3600);
  let rem = sec - h * 3600;
  const m = Math.floor(rem / 60);
  rem -= m * 60;
  const s = Math.floor(rem);
  const frac = rem - s;
  const f = Math.min(
    nominalFps - 1,
    Math.max(0, Math.round(frac * nominalFps))
  );
  return formatTc({ h, m, s, f }, nominalFps, false);
}

export function framesToTc(frames: number, preset: FpsPreset): string {
  const { nominalFps, rational, dropFrame } = FPS_PRESET_VALUES[preset];
  if (dropFrame) {
    return internalFramesToTcString(frames, nominalFps, true);
  }
  return framesToTcNonDrop(frames, nominalFps, rational);
}

export function tcToFrames(tc: string, preset: FpsPreset): number | null {
  const { nominalFps, rational, dropFrame } = FPS_PRESET_VALUES[preset];
  if (dropFrame) {
    return tcStringToInternalFrames(tc, nominalFps, true);
  }
  const p = parseTcString(tc.replace(";", ":").replace(".", ":"));
  if (!p) return null;
  const sec = p.h * 3600 + p.m * 60 + p.s + p.f / nominalFps;
  return Math.round(sec * rational);
}

export function durationFramesBetweenTc(
  tcIn: string,
  tcOut: string,
  nominalFps: number,
  dropFrame: boolean
): number | null {
  const a = tcStringToInternalFrames(tcIn, nominalFps, dropFrame);
  const b = tcStringToInternalFrames(tcOut, nominalFps, dropFrame);
  if (a === null || b === null) return null;
  return Math.max(0, b - a);
}

export function presetFromFps(
  fps: number,
  dropFrame: boolean
): FpsPreset {
  const tol = 0.02;
  if (dropFrame && Math.abs(fps - 30000 / 1001) < tol) return "29.97DF";
  if (!dropFrame && Math.abs(fps - 30000 / 1001) < tol) return "29.97NDF";
  if (Math.abs(fps - 24000 / 1001) < tol) return "23.976";
  if (Math.abs(fps - 60000 / 1001) < tol) return "59.94";
  if (Math.abs(fps - 24) < tol) return "24";
  if (Math.abs(fps - 25) < tol) return "25";
  if (Math.abs(fps - 30) < tol) return "30";
  if (Math.abs(fps - 50) < tol) return "50";
  if (Math.abs(fps - 60) < tol) return "60";
  return "24";
}
