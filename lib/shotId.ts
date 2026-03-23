import type { ShowMeta, VfxShot } from "./types";

const VFX_ID_RE = /\b(VFX[_\s-]?\d{2,6})\b/i;
const VFX_NUM_RE = /\bVFX[_\s-]?(\d{2,6})\b/i;
const SCENE_RE = /\b(?:SC(?:ENE)?[_\s-]?(\d+)|SC(\d+))\b/i;

function showInitials(showName: string): string {
  const parts = showName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
    .filter((w) => w.length > 0);
  if (parts.length === 0) return "SHOW";
  const letters = parts.map((w) => w[0].toUpperCase()).join("");
  return letters.slice(0, 6) || "SHOW";
}

/** Scene only when it appears as a leading token (note text, not full LOC). */
function extractSceneLeading(text: string): string | undefined {
  const m = text
    .trim()
    .match(/^(SC(?:ENE)?[_\s-]?\d+)\b|^SC(\d+)\b/i);
  if (!m) return undefined;
  const digits = (m[1] || m[2] || "").replace(/\D/g, "");
  return digits ? `SC${digits.replace(/^0+(?=\d)/, "")}` : undefined;
}

function extractExplicitVfxId(text: string): string | undefined {
  const m = text.match(VFX_ID_RE);
  if (!m) return undefined;
  return m[1].replace(/\s+/g, "_").toUpperCase();
}

function extractScene(text: string): string | undefined {
  const m = text.match(SCENE_RE);
  if (!m) return undefined;
  const n = m[1] ?? m[2];
  return n ? `SC${n}` : undefined;
}

function extractVfxNumericId(text: string): number | undefined {
  const m = text.trim().match(VFX_NUM_RE);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : undefined;
}

function formatEpisodeCode(episode: string): string {
  const d = episode.replace(/\D/g, "");
  const n = d ? parseInt(d, 10) : 0;
  return String(n).padStart(3, "0");
}

export function generateShowId(
  showName: string,
  projectType: "feature" | "episodic",
  season: number,
  episode: string
): string {
  const showCode = showName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 4);
  const base = showCode || "show";
  if (projectType === "feature") {
    return base;
  }
  const s = String(Math.max(0, Math.floor(season)) || 0).padStart(2, "0");
  const e = formatEpisodeCode(episode);
  return `${base}-s${s}e${e}`;
}

export interface BuildVfxShotIdParams {
  showName: string;
  projectType: "feature" | "episodic";
  seasonNumber: number;
  episode: string;
  vfxSequence?: string;
  shotNum4: string;
  imageType?: string;
  vendorCode?: string;
  revision?: number;
}

export function toRevisionNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.max(1, Math.floor(v));
  }
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
}

export function buildVfxShotId(params: BuildVfxShotIdParams): string {
  const showId = generateShowId(
    params.showName,
    params.projectType,
    params.seasonNumber,
    params.episode
  );
  const rawSeq = (params.vfxSequence ?? "sc").toLowerCase().replace(/[^a-z0-9]/g, "");
  const vfxSeq = (rawSeq || "sc").substring(0, 4);
  const shotNum = params.shotNum4.padStart(4, "0");
  const imageType = (params.imageType ?? "mp").toLowerCase().replace(/[^a-z]/g, "") || "mp";
  const vendorRaw = (params.vendorCode ?? "xx").toLowerCase().replace(/[^a-z]/g, "");
  const vendorCode = (vendorRaw || "xx").substring(0, 2);
  const rev = toRevisionNumber(params.revision ?? 1);
  const revision = `v${String(rev).padStart(3, "0")}`;
  return [showId, vfxSeq, shotNum, imageType, vendorCode, revision]
    .join("_")
    .toLowerCase();
}

function isMarkerStyleVfxId(id: string): boolean {
  return /^VFX[_\s-]?\d/i.test(id.trim());
}

/**
 * Assigns column B shot id (marker / editorial), scene, ETC standardId, priority default.
 */
export function assignShotIds(
  showName: string,
  meta: ShowMeta,
  shots: VfxShot[]
): VfxShot[] {
  const initials = showInitials(showName);
  const perScene = new Map<string, number>();
  let autoShotOrdinal = 0;

  return shots.map((shot) => {
    const desc = shot.vfxDescription || "";
    const fromClip = shot.reel || "";
    const explicitRaw =
      shot.explicitVfxIdFromMarker ??
      extractExplicitVfxId(desc) ??
      extractExplicitVfxId(fromClip);

    const vfxNum =
      extractVfxNumericId(shot.explicitVfxIdFromMarker ?? "") ??
      extractVfxNumericId(desc) ??
      extractVfxNumericId(fromClip);

    let shotNum4: string;
    if (vfxNum !== undefined) {
      shotNum4 = String(vfxNum).padStart(4, "0");
    } else {
      autoShotOrdinal += 1;
      shotNum4 = String(autoShotOrdinal * 100).padStart(4, "0");
    }

    const standardId = buildVfxShotId({
      showName: showName || "show",
      projectType: meta.projectType,
      seasonNumber: meta.seasonNumber,
      episode: meta.episode,
      vfxSequence: meta.vfxSequenceCode?.trim() || "sc",
      shotNum4,
      imageType: meta.imageType,
      vendorCode: meta.vendorCode,
      revision: toRevisionNumber(meta.revision),
    });

    const scene =
      shot.scene ??
      extractScene(fromClip) ??
      extractSceneLeading(desc) ??
      undefined;

    let shotId: string;
    if (explicitRaw) {
      if (isMarkerStyleVfxId(explicitRaw)) {
        shotId = explicitRaw.replace(/\s+/g, "_").toUpperCase();
      } else {
        shotId = explicitRaw.trim();
      }
    } else {
      const key = scene ?? "_";
      const next = (perScene.get(key) ?? 0) + 1;
      perScene.set(key, next);
      const num = String(next).padStart(3, "0");
      shotId = scene ? `${initials}_${scene}_${num}` : `${initials}_${num}`;
    }

    return {
      ...shot,
      shotId,
      scene,
      standardId,
      priority: "" as const,
    };
  });
}

export function showIdForDownload(meta: ShowMeta): string {
  return generateShowId(
    meta.showName || "show",
    meta.projectType,
    meta.seasonNumber,
    meta.episode
  );
}
