import type { ParseResult, VfxShot } from "../types";
import { tcStringToInternalFrames } from "../timecode";

function splitAleLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trimEnd());
}

function parseAleTable(content: string): {
  headers: string[];
  rows: string[][];
} {
  const lines = splitAleLines(content);
  let headers: string[] = [];
  let i = 0;
  for (; i < lines.length; i++) {
    if (lines[i] === "Column") {
      i += 1;
      if (i < lines.length && lines[i].includes("\t")) {
        headers = lines[i].split("\t").map((h) => h.trim());
      }
      i += 1;
      break;
    }
  }

  const rows: string[][] = [];
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line === "Data") continue;
    if (!line || line.startsWith("#")) continue;
    if (!line.includes("\t")) {
      if (/^(Column|Heading)$/i.test(line)) break;
      continue;
    }
    if (headers.length) {
      rows.push(line.split("\t").map((c) => c.trim()));
    }
  }

  return { headers, rows };
}

function colIndex(headers: string[], names: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  for (const n of names) {
    const idx = lower.indexOf(n.toLowerCase());
    if (idx >= 0) return idx;
  }
  return -1;
}

function inferFpsFromAle(headers: string[], rows: string[][]): number {
  const fpsIdx = colIndex(headers, ["FPS", "TcFPS", "Speed"]);
  if (fpsIdx >= 0 && rows[0]?.[fpsIdx]) {
    const v = parseFloat(rows[0][fpsIdx]);
    if (!Number.isNaN(v) && v > 0) return v;
  }
  return 24;
}

function buildDescription(headers: string[], cells: string[]): string {
  const parts: string[] = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h || !cells[i]) continue;
    if (/vfx|note|comment|description|marker|effect/i.test(h)) {
      parts.push(`${h}: ${cells[i]}`);
    }
  }
  if (parts.length) return parts.join(" | ");
  const nameIdx = colIndex(headers, ["Name", "Clip Name"]);
  if (nameIdx >= 0 && cells[nameIdx]) return cells[nameIdx];
  return "ALE row";
}

export function parseAle(content: string): ParseResult {
  const { headers, rows } = parseAleTable(content);
  if (!headers.length) {
    throw new Error("ALE file has no Column header row.");
  }

  const fps = inferFpsFromAle(headers, rows);
  const dropFrame = false;
  const nominal = Math.round(fps) || 24;

  const nameI = colIndex(headers, ["Name", "Clip Name"]);
  const tapeI = colIndex(headers, ["Tape", "Source File", "Reel"]);
  const startI = colIndex(headers, ["Start", "Start Timecode", "Src In"]);
  const endI = colIndex(headers, ["End", "End Timecode", "Src Out"]);
  const sceneI = colIndex(headers, ["Scene", "Sc"]);
  const takeI = colIndex(headers, ["Take", "Tk"]);

  if (startI < 0 || endI < 0) {
    throw new Error("ALE must include Start and End columns.");
  }

  /** If a dedicated VFX column exists, keep only rows with it populated */
  const vfxColIdx = headers.findIndex((h) => /\bvfx\b/i.test(h));
  const filterVfxOnly = vfxColIdx >= 0;

  const shots: VfxShot[] = [];

  for (const cells of rows) {
    if (cells.length < Math.max(startI, endI) + 1) continue;
    if (filterVfxOnly && !(cells[vfxColIdx] ?? "").trim()) continue;
    const start = cells[startI];
    const end = cells[endI];
    if (!start || !end) continue;

    const scene = sceneI >= 0 ? cells[sceneI] : undefined;
    const take = takeI >= 0 ? cells[takeI] : undefined;
    const name = nameI >= 0 ? cells[nameI] : "";
    const tape = tapeI >= 0 ? cells[tapeI] : "";

    const sF = tcStringToInternalFrames(start, nominal, false);
    const eF = tcStringToInternalFrames(end, nominal, false);
    const dur =
      sF !== null && eF !== null ? Math.max(0, eF - sF) : 0;

    const desc = buildDescription(headers, cells);

    shots.push({
      reel: tape || name || "clip",
      scene: scene || undefined,
      tcInRec: start,
      tcOutRec: end,
      tcInSrc: start,
      tcOutSrc: end,
      framesDuration: dur,
      vfxDescription: [desc, take ? `Take ${take}` : ""]
        .filter(Boolean)
        .join(" — "),
      thumbnailTc: start,
      fps,
      dropFrame,
    });
  }

  return { shots, fps, dropFrame, format: "ale" };
}
