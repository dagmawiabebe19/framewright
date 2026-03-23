import type { ParseResult, VfxShot } from "../types";
import { parseLocBodyAfterTc } from "../locBody";
import {
  durationFramesBetweenTc,
  presetFromFps,
  tcToFrames,
} from "../timecode";

const EVENT_RE =
  /^(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*$/;

const LOC_RE = /^\*\s*LOC:\s*(\S+)\s+(.*)$/i;
const CLIP_RE = /^\*\s*FROM\s+CLIP\s+NAME:\s*(.*)$/i;
const FCM_RE = /^FCM:\s*(.+)$/i;

interface EdlLoc {
  tc: string;
  text: string;
}

interface EdlBlock {
  eventNum: string;
  reel: string;
  srcIn: string;
  srcOut: string;
  recIn: string;
  recOut: string;
  locs: EdlLoc[];
  clipName?: string;
}

function parseFcm(line: string): { drop: boolean } | null {
  const m = line.trim().match(FCM_RE);
  if (!m) return null;
  const v = m[1].toUpperCase();
  if (v.includes("DROP")) return { drop: true };
  return { drop: false };
}

function inferFpsFromEdl(lines: string[]): { fps: number; drop: boolean } {
  let drop = false;
  for (const line of lines) {
    const fcm = parseFcm(line);
    if (fcm) drop = fcm.drop;
  }
  // Default film; many shows are 23.976 or 24
  const fps = drop ? 30000 / 1001 : 24;
  return { fps, drop };
}

function parseBlocks(text: string): EdlBlock[] {
  const rawLines = text.split(/\r?\n/);
  const blocks: EdlBlock[] = [];
  let current: EdlBlock | null = null;

  const flush = () => {
    if (current && current.locs.length > 0) blocks.push(current);
    current = null;
  };

  for (const line of rawLines) {
    const ev = line.match(EVENT_RE);
    if (ev) {
      flush();
      current = {
        eventNum: ev[1],
        reel: ev[2],
        srcIn: ev[5],
        srcOut: ev[6],
        recIn: ev[7],
        recOut: ev[8],
        locs: [],
      };
      continue;
    }
    if (!current) continue;

    const loc = line.match(LOC_RE);
    if (loc) {
      current.locs.push({ tc: loc[1].trim(), text: loc[2].trim() });
      continue;
    }
    const clip = line.match(CLIP_RE);
    if (clip) {
      current.clipName = clip[1].trim();
    }
  }
  flush();
  return blocks;
}

export function parseEdl(content: string): ParseResult {
  const lines = content.split(/\r?\n/);
  const { fps, drop } = inferFpsFromEdl(lines);
  const nominal = drop ? 30 : Math.round(fps);
  const preset = presetFromFps(fps, drop);
  const blocks = parseBlocks(content);
  const shots: VfxShot[] = [];

  for (const b of blocks) {
    const reel = b.clipName || b.reel || "";
    const dur =
      durationFramesBetweenTc(b.recIn, b.recOut, nominal, drop) ??
      Math.max(
        0,
        (tcToFrames(b.recOut, preset) ?? 0) - (tcToFrames(b.recIn, preset) ?? 0)
      );

    for (const loc of b.locs) {
      const parsed = parseLocBodyAfterTc(loc.text);
      shots.push({
        reel,
        tcInRec: b.recIn,
        tcOutRec: b.recOut,
        tcInSrc: b.srcIn,
        tcOutSrc: b.srcOut,
        framesDuration: dur,
        vfxDescription: parsed.description,
        scene: parsed.scene,
        explicitVfxIdFromMarker: parsed.explicitVfxId,
        thumbnailTc: loc.tc,
        fps,
        dropFrame: drop,
      });
    }
  }

  return { shots, fps, dropFrame: drop, format: "edl" };
}
