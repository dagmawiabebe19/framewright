/**
 * Avid-style LOC body after timecode: [COLOR] [SHOT_ID] [SC…] … human note
 */

const LOC_COLORS = new Set([
  "RED",
  "YELLOW",
  "GREEN",
  "WHITE",
  "BLUE",
  "CYAN",
  "MAGENTA",
]);

/** Leading VFX id token (VFX_001, VFX-12, etc.) */
const VFX_LEAD_RE = /^(VFX[_\s-]?\d{2,6})\b/i;

/** Leading scene token: SC12, SC_12, SCENE 12 */
const SC_LEAD_RE = /^(SC(?:ENE)?[_\s-]?\d+)\b/i;

function firstWord(s: string): string | undefined {
  const m = s.trim().match(/^(\S+)/);
  return m?.[1];
}

function normalizeSceneToken(tok: string): string | undefined {
  const t = tok.replace(/\s+/g, "").toUpperCase();
  const m = t.match(/^SC(?:ENE)?[_-]?(\d+)$/i);
  return m ? `SC${m[1]}` : undefined;
}

function stripLeadingColor(s: string): string {
  const trimmed = s.trimStart();
  const w = firstWord(trimmed);
  if (w && LOC_COLORS.has(w.toUpperCase())) {
    return trimmed.slice(w.length).trimStart();
  }
  return trimmed;
}

export interface ParsedLocBody {
  description: string;
  scene?: string;
  explicitVfxId?: string;
}

/**
 * Strip locator color, explicit VFX id, and leading scene tokens; remainder is the note.
 */
export function parseLocBodyAfterTc(raw: string): ParsedLocBody {
  let s = raw.trim();
  let scene: string | undefined;
  let explicitVfxId: string | undefined;

  let guard = 0;
  while (s.length && guard++ < 20) {
    const before = s;
    s = stripLeadingColor(s);

    const vfx = s.match(VFX_LEAD_RE);
    if (vfx) {
      if (!explicitVfxId) {
        explicitVfxId = vfx[1].replace(/\s+/g, "_").toUpperCase();
      }
      s = s.slice(vfx[0].length).trimStart();
      continue;
    }

    const sc = s.match(SC_LEAD_RE);
    if (sc) {
      const norm = normalizeSceneToken(sc[1]);
      if (norm) scene = norm;
      s = s.slice(sc[0].length).trimStart();
      continue;
    }

    if (s === before) break;
  }

  let description = s.trim();

  if (explicitVfxId) {
    const esc = explicitVfxId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    description = description
      .replace(new RegExp(`\\b${esc}\\b`, "gi"), " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  return { description, scene, explicitVfxId };
}
