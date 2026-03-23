/** Parse frame rate string (e.g. "23.976", "24") to a number for TC math. */
export function parseFps(frameRate: string): number {
  const n = parseFloat(frameRate);
  return Number.isFinite(n) && n > 0 ? n : 24;
}

const TC_RE = /^(\d{1,2}):(\d{2}):(\d{2}):(\d{2})$/;

export function parseTc(tc: string): { h: number; m: number; s: number; f: number } | null {
  const t = tc.trim();
  const m = t.match(TC_RE);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const s = parseInt(m[3], 10);
  const f = parseInt(m[4], 10);
  if (min > 59 || s > 59) return null;
  return { h, m: min, s, f };
}

/** Total frames from HH:MM:SS:FF at non–drop-frame rate. */
export function tcToTotalFrames(tc: string, fps: number): number | null {
  const p = parseTc(tc);
  if (!p) return null;
  const base = (p.h * 3600 + p.m * 60 + p.s) * fps + p.f;
  return Math.round(base * 1000) / 1000;
}

export function validateTcFormat(tc: string): boolean {
  return parseTc(tc) !== null;
}
