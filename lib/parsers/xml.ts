import type { ParseResult, VfxShot } from "../types";
import { framesToTc, presetFromFps } from "../timecode";

function num(el: Element | null, tag: string): number {
  const n = el?.querySelector(tag)?.textContent;
  return n ? parseInt(n, 10) : 0;
}

function text(el: Element | null, tag: string): string {
  return el?.querySelector(tag)?.textContent?.trim() ?? "";
}

export function parsePremiereXml(content: string): ParseResult {
  const doc = new DOMParser().parseFromString(content, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid or unreadable Premiere XML.");
  }

  const sequence = doc.querySelector("sequence");
  let tb = 24;
  const timebaseEl = sequence?.querySelector("rate > timebase");
  if (timebaseEl?.textContent) {
    tb = parseFloat(timebaseEl.textContent);
  }
  const ntsc = sequence?.querySelector("rate > ntsc")?.textContent === "TRUE";
  let fps = tb;
  let dropFrame = false;
  if (ntsc && Math.abs(tb - 30) < 0.1) {
    fps = 30000 / 1001;
    // Premiere XMEML: NTSC 30 timebase is 29.97; use drop-frame TC by default
    dropFrame = true;
  }
  const preset = presetFromFps(fps, dropFrame);

  const shots: VfxShot[] = [];
  const items = doc.querySelectorAll("clipitem");

  for (const item of items) {
    if (!item.querySelector("marker")) continue;

    const name = text(item, "name");
    const start = num(item, "start");
    const end = num(item, "end");
    const cin = num(item, "in");
    const cout = num(item, "out");

    const fileEl = item.querySelector("file");
    const fileName = text(fileEl, "name");
    const reel =
      fileName ||
      text(item, "masterclipid") ||
      name;

    const markers = item.querySelectorAll(":scope > marker");
    for (const marker of markers) {
      const mName = text(marker, "name");
      const mComment = text(marker, "comment");
      const mIn = num(marker, "in");
      const desc = [mName, mComment].filter(Boolean).join(" — ");

      const timelineFrame = start + (mIn - cin);
      const thumbTc = framesToTc(timelineFrame, preset);

      const dur = Math.max(0, end - start);

      shots.push({
        reel,
        tcInRec: framesToTc(start, preset),
        tcOutRec: framesToTc(end, preset),
        tcInSrc: framesToTc(cin, preset),
        tcOutSrc: framesToTc(cout, preset),
        framesDuration: dur,
        vfxDescription: desc || mName || "VFX marker",
        thumbnailTc: thumbTc,
        thumbnailFrame: timelineFrame,
        fps,
        dropFrame,
      });
    }
  }

  return { shots, fps, dropFrame, format: "xml" };
}
