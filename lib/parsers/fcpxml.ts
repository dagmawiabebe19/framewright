import type { ParseResult, VfxShot } from "../types";
import { framesToTc, presetFromFps } from "../timecode";

function parseRationalSeconds(raw: string | null | undefined): number {
  if (!raw) return 0;
  const s = raw.trim();
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)s$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const dec = s.match(/^([\d.]+)s$/);
  if (dec) return Number(dec[1]);
  return 0;
}

function sequenceFps(doc: Document): { fps: number; dropFrame: boolean } {
  const fmt =
    doc.querySelector("format") ||
    doc.querySelector("resources > format") ||
    doc.querySelector('[name="FFVideoFormat1080p2997"]');
  const fd =
    fmt?.getAttribute("frameDuration") || "1/24s";
  const frameDur = parseRationalSeconds(fd);
  const fps = frameDur > 0 ? 1 / frameDur : 24;
  let dropFrame = false;
  const name = (fmt?.getAttribute("name") || "").toUpperCase();
  if (name.includes("2997") && name.includes("DROP")) dropFrame = true;
  if (name.includes("DF")) dropFrame = true;
  return { fps, dropFrame };
}

function markerText(marker: Element): string {
  const note =
    marker.getAttribute("note") ||
    marker.getAttribute("value") ||
    marker.getAttribute("name") ||
    "";
  const children = Array.from(marker.children)
    .map((c) => c.textContent?.trim())
    .filter(Boolean)
    .join(" ");
  return [note, children].filter(Boolean).join(" — ");
}

export function parseFcpxml(content: string): ParseResult {
  const doc = new DOMParser().parseFromString(content, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid or unreadable FCPXML.");
  }

  const { fps, dropFrame } = sequenceFps(doc);
  const preset = presetFromFps(fps, dropFrame);
  const markers = Array.from(doc.getElementsByTagName("marker"));
  const shots: VfxShot[] = [];

  for (const marker of markers) {
    const host =
      marker.parentElement?.closest(
        "asset-clip, sync-clip, clip, video, audio, mc-clip"
      ) ?? marker.parentElement;
    if (!host) continue;

    const offset = parseRationalSeconds(host.getAttribute("offset"));
    const mStart = parseRationalSeconds(marker.getAttribute("start"));
    const durationHost = parseRationalSeconds(host.getAttribute("duration"));
    const clipStart = parseRationalSeconds(host.getAttribute("start"));

    const timelineSec = offset + mStart;
    const timelineFrame = Math.max(0, Math.round(timelineSec * fps));
    const thumbTc = framesToTc(timelineFrame, preset);

    const durFrames = Math.max(
      1,
      Math.round(
        (durationHost > 0 ? durationHost : 1 / fps) * fps
      )
    );

    const name =
      host.getAttribute("name") ||
      host.getAttribute("ref") ||
      "clip";

    shots.push({
      reel: name,
      tcInRec: framesToTc(timelineFrame, preset),
      tcOutRec: framesToTc(timelineFrame + durFrames, preset),
      tcInSrc: framesToTc(Math.round(clipStart * fps), preset),
      tcOutSrc: framesToTc(
        Math.round((clipStart + durationHost) * fps),
        preset
      ),
      framesDuration: durFrames,
      vfxDescription: markerText(marker) || "FCP marker",
      thumbnailTc: thumbTc,
      thumbnailFrame: timelineFrame,
      fps,
      dropFrame,
    });
  }

  return { shots, fps, dropFrame, format: "fcpxml" };
}
