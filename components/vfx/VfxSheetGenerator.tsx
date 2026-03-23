"use client";

import {
  finalizeVfxSheetDeliverable,
  getNextVfxSheetVersion,
  type FinalizeShotPayload,
} from "@/app/actions/vfx-sheet";
import { createClient } from "@/lib/supabase/client";
import {
  assignShotIds,
  showIdForDownload,
  toRevisionNumber,
} from "@/lib/shotId";
import { buildDownloadFileName, buildVfxExcel } from "@/lib/excelBuilder";
import {
  detectTcMismatch,
  extractThumbnails,
  ffmpegWasmSupported,
} from "@/lib/frameExtractor";
import { parseSequenceFile } from "@/lib/parsers/index";
import type { ShowMeta } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type VfxEpisodeOption = {
  id: string;
  episode_number: string;
  title: string;
  orgId: string;
  showId: string;
  orgSlug: string;
  showSlug: string;
};

export type VfxSaveContext = {
  episodes: VfxEpisodeOption[];
  defaultEpisodeId?: string | null;
};

export type VfxSheetGeneratorProps = {
  saveContext?: VfxSaveContext | null;
};

type ProgressPhase =
  | "idle"
  | "parsing"
  | "loading"
  | "extracting"
  | "building"
  | "done";

const STATUS: Record<ProgressPhase, string> = {
  idle: "",
  parsing: "Parsing sequence file...",
  loading: "Loading video...",
  extracting: "Extracting frames...",
  building: "Building Excel sheet...",
  done: "Done!",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function probeVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v.duration) ? v.duration : 0);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata."));
    };
    v.src = url;
  });
}

function triggerDownload(buffer: ArrayBuffer, name: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function VfxSheetGenerator({
  saveContext = null,
}: VfxSheetGeneratorProps = {}) {
  const [seqFile, setSeqFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [showName, setShowName] = useState("");
  /** Synced on every keystroke so async generate() never reads a stale show name */
  const showNameRef = useRef("");
  const [episode, setEpisode] = useState("");
  const [cutVersion, setCutVersion] = useState("");
  const [date, setDate] = useState(todayIso);
  const [vfxSupervisor, setVfxSupervisor] = useState("");
  const [editor, setEditor] = useState("");
  const [videoStartTc, setVideoStartTc] = useState("01:00:00:00");
  const [projectType, setProjectType] = useState<"feature" | "episodic">(
    "episodic"
  );
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [vfxSequenceCode, setVfxSequenceCode] = useState("");
  const [imageType, setImageType] = useState("mp");
  const [vendorCode, setVendorCode] = useState("");
  const [revision, setRevision] = useState(1);

  const [phase, setPhase] = useState<ProgressPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [extractDetail, setExtractDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(() => {
    const eps = saveContext?.episodes;
    if (!eps?.length) return "";
    const def = saveContext?.defaultEpisodeId;
    if (def && eps.some((e) => e.id === def)) return def;
    return eps[eps.length - 1].id;
  });
  const [lastSave, setLastSave] = useState<{
    deliverableId: string;
    version: number;
  } | null>(null);
  const lastDownloadRef = useRef<{
    buffer: ArrayBuffer;
    name: string;
  } | null>(null);

  const statusMessage =
    phase === "extracting" && extractDetail
      ? extractDetail.trim()
      : STATUS[phase] + (extractDetail ? ` ${extractDetail}` : "");

  const meta: ShowMeta = useMemo(
    () => ({
      showName,
      episode,
      cutVersion,
      date,
      vfxSupervisor,
      editor,
      projectType,
      seasonNumber: Math.max(1, Math.floor(seasonNumber) || 1),
      vfxSequenceCode: vfxSequenceCode.slice(0, 4),
      imageType,
      vendorCode: vendorCode.toLowerCase().replace(/[^a-z]/g, "").slice(0, 2),
      revision: toRevisionNumber(revision),
    }),
    [
      showName,
      episode,
      cutVersion,
      date,
      vfxSupervisor,
      editor,
      projectType,
      seasonNumber,
      vfxSequenceCode,
      imageType,
      vendorCode,
      revision,
    ]
  );

  useEffect(() => {
    const eps = saveContext?.episodes;
    if (!eps?.length) return;
    const preferred =
      saveContext?.defaultEpisodeId &&
      eps.some((e) => e.id === saveContext.defaultEpisodeId)
        ? saveContext.defaultEpisodeId
        : eps[eps.length - 1]?.id;
    if (preferred) setSelectedEpisodeId(preferred);
  }, [saveContext]);

  const resetAll = useCallback(() => {
    setSeqFile(null);
    setVideoFile(null);
    setShowName("");
    showNameRef.current = "";
    setEpisode("");
    setCutVersion("");
    setDate(todayIso());
    setVfxSupervisor("");
    setEditor("");
    setVideoStartTc("01:00:00:00");
    setProjectType("episodic");
    setSeasonNumber(1);
    setVfxSequenceCode("");
    setImageType("mp");
    setVendorCode("");
    setRevision(1);
    setPhase("idle");
    setProgress(0);
    setExtractDetail("");
    setError(null);
    setWarning(null);
    setSuccess(null);
    setLastSave(null);
    lastDownloadRef.current = null;
  }, []);

  const onSeqInput = (f: File | null) => {
    setSeqFile(f);
    setError(null);
    setSuccess(null);
  };

  const onVideoInput = (f: File | null) => {
    setVideoFile(f);
    setError(null);
    setSuccess(null);
  };

  const runGenerate = async () => {
    setError(null);
    setWarning(null);
    setSuccess(null);
    if (!seqFile) {
      setError("Please upload a sequence file.");
      return;
    }
    setBusy(true);
    setProgress(0);
    setPhase("parsing");

    try {
      const text = await seqFile.text();
      const parsed = parseSequenceFile(seqFile.name, text);
      if (!parsed.shots.length) {
        setError(
          "No VFX markers found. Make sure your sequence has locators/markers before exporting."
        );
        setBusy(false);
        setPhase("idle");
        return;
      }

      const rawShowTitle = (
        showNameRef.current ||
        showName ||
        meta.showName ||
        ""
      ).trim();
      const showNameForIds = rawShowTitle || "show";
      const generationMeta: ShowMeta = {
        ...meta,
        showName: rawShowTitle,
        revision: toRevisionNumber(meta.revision),
      };

      console.log("[VFX Sheet] assignShotIds input", {
        showNameState: showName,
        showNameRef: showNameRef.current,
        showNameForIds,
        showMeta: generationMeta,
      });

      const withIds = assignShotIds(showNameForIds, generationMeta, parsed.shots);
      setProgress(0.12);

      setPhase("loading");
      setProgress(0.18);
      const sabOk = ffmpegWasmSupported();
      let durationSec = 0;
      if (videoFile) {
        try {
          durationSec = await probeVideoDuration(videoFile);
        } catch {
          durationSec = 0;
        }
      }
      setProgress(0.22);

      const genWarnings: string[] = [];
      if (videoFile && !sabOk) {
        genWarnings.push(
          "Your browser doesn't support the required APIs for frame extraction. Try Chrome or Edge. The sheet will still generate without thumbnails."
        );
      }
      if (
        videoFile &&
        durationSec > 0 &&
        detectTcMismatch(
          withIds,
          durationSec,
          videoStartTc,
          parsed.fps,
          parsed.dropFrame
        )
      ) {
        genWarnings.push(
          "Some record timecodes may fall outside the reference video's duration (after your Video Start TC offset). Thumbnails may use placeholders where extraction fails."
        );
      }
      setWarning(genWarnings.length ? genWarnings.join("\n\n") : null);

      const baseExtractOpts = {
        videoStartTc,
        sequenceFps: parsed.fps,
        sequenceDropFrame: parsed.dropFrame,
      };

      let thumbs: (Uint8Array | null)[];

      if (videoFile && sabOk) {
        setPhase("extracting");
        thumbs = await extractThumbnails(videoFile, withIds, {
          ...baseExtractOpts,
          onProgress: (cur, tot, msg) => {
            setExtractDetail(msg);
            setProgress(0.22 + (0.62 * cur) / Math.max(1, tot));
          },
        });
        const ok = thumbs.filter((t) => t && t.byteLength).length;
        setExtractDetail(`Extracted ${ok} frames successfully`);
        setProgress(0.88);
        await new Promise((r) => setTimeout(r, 700));
        setExtractDetail("");
      } else {
        thumbs = await extractThumbnails(null, withIds, {
          ...baseExtractOpts,
          onProgress: () => {},
        });
        setProgress(0.85);
      }

      setPhase("building");
      setProgress(0.92);
      const buf = await buildVfxExcel(generationMeta, withIds, thumbs);

      setPhase("done");
      setProgress(1);
      const fname = buildDownloadFileName(generationMeta);
      try {
        lastDownloadRef.current = { buffer: buf.slice(0), name: fname };
      } catch {
        lastDownloadRef.current = { buffer: buf, name: fname };
      }
      triggerDownload(buf, fname);
      const sid = showIdForDownload(generationMeta);
      const cut = generationMeta.cutVersion?.trim() || "—";

      let persistExtra = "";
      setLastSave(null);

      if (saveContext?.episodes?.length) {
        const epId =
          selectedEpisodeId ||
          saveContext.defaultEpisodeId ||
          saveContext.episodes[0]?.id;
        const epRow = saveContext.episodes.find((e) => e.id === epId);
        if (epId && epRow) {
          try {
            const verRes = await getNextVfxSheetVersion(epId);
            if (!verRes.ok) {
              throw new Error(
                "error" in verRes ? String(verRes.error) : "Version check failed"
              );
            }
            const version = verRes.version;
            const path = `${epRow.orgId}/${epRow.showId}/${epId}/vfx-sheet/v${version}.xlsx`;
            const supabase = createClient();
            const blob = new Blob([buf], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const { error: upErr } = await supabase.storage
              .from("deliverables")
              .upload(path, blob, {
                contentType:
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                upsert: false,
              });
            if (upErr) throw new Error(upErr.message);

            const shotsPayload: FinalizeShotPayload[] = [];
            for (let i = 0; i < withIds.length; i++) {
              const shot = withIds[i];
              const thumb = thumbs[i];
              const safeId = (shot.shotId || `shot_${i}`).replace(
                /[^a-zA-Z0-9_-]/g,
                "_"
              );
              let thumbPath: string | null = null;
              if (thumb && thumb.byteLength > 0) {
                const tp = `${epRow.orgId}/${epRow.showId}/${epId}/thumbnails/${safeId}.jpg`;
                const { error: tErr } = await supabase.storage
                  .from("deliverables")
                  .upload(
                    tp,
                    new Blob([new Uint8Array(thumb)], { type: "image/jpeg" }),
                    { contentType: "image/jpeg", upsert: true }
                  );
                if (!tErr) thumbPath = tp;
              }
              shotsPayload.push({
                shot_id: shot.shotId || "",
                standard_id: shot.standardId || "",
                scene: shot.scene ?? null,
                reel: shot.reel,
                tc_in: shot.tcInRec,
                tc_out: shot.tcOutRec,
                src_tc_in: shot.tcInSrc,
                src_tc_out: shot.tcOutSrc,
                frames: shot.framesDuration,
                handles: shot.handleFrames ?? 8,
                description: shot.vfxDescription || null,
                thumbnail_storage_path: thumbPath,
              });
            }

            const fin = await finalizeVfxSheetDeliverable({
              orgId: epRow.orgId,
              showId: epRow.showId,
              episodeId: epId,
              orgSlug: epRow.orgSlug,
              showSlug: epRow.showSlug,
              xlsxStoragePath: path,
              shots: shotsPayload,
              sheetMeta: {
                shotCount: withIds.length,
                showName: generationMeta.showName,
                episodeNumber: generationMeta.episode,
                cutVersion: generationMeta.cutVersion,
                generatedAt: new Date().toISOString(),
              },
            });
            if (!fin.ok) {
              throw new Error("error" in fin ? String(fin.error) : "Save failed");
            }
            setLastSave({
              deliverableId: fin.deliverableId,
              version: fin.version,
            });
            persistExtra = `\n\nSaved to FRAMEWRIGHT as v${fin.version}.`;
          } catch (pe) {
            const msg = pe instanceof Error ? pe.message : String(pe);
            persistExtra = `\n\nSheet downloaded but cloud save failed: ${msg}.`;
          }
        } else {
          persistExtra =
            "\n\nSelect an episode in Save to Episode to sync this sheet.";
        }
      }

      setSuccess(
        `✓ ${withIds.length} VFX shots — ${sid} — ${cut}\nPriority column is blank. Select High / Medium / Low from the dropdown in Excel after reviewing your shots.${persistExtra}`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Generation failed.");
      setPhase("idle");
    } finally {
      setBusy(false);
    }
  };

  const trackerEp: VfxEpisodeOption | undefined = saveContext
    ? saveContext.episodes.find((e) => e.id === selectedEpisodeId) ||
      saveContext.episodes.find((e) => e.id === saveContext.defaultEpisodeId) ||
      saveContext.episodes[0]
    : undefined;

  return (
    <main className="min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
            VFX Sheet Generator
          </h1>
          <p className="text-sm text-gray-400">
            For assistant editors on scripted productions
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <DropPanel
            label="Upload Sequence File"
            accept=".edl,.xml,.fcpxml,.ale"
            file={seqFile}
            onFile={onSeqInput}
            hint="EDL, Premiere XML, FCPXML, or ALE"
          />
          <DropPanel
            label="Upload Reference Video (for thumbnails)"
            accept=".mov,.mp4,.mxf,video/*"
            file={videoFile}
            onFile={onVideoInput}
            hint="Optional — .mov, .mp4, .mxf"
            showSize
            postSelectNote="Frames will be extracted at each VFX shot's record TC In (relative to Video Start TC below)."
            amberNotes={[
              ...(videoFile && videoFile.size > 500 * 1024 * 1024
                ? [
                    "Large file — extraction may take 30–60 seconds.",
                  ]
                : []),
              ...(videoFile &&
              videoFile.name.toLowerCase().endsWith(".mxf")
                ? [
                    "MXF files from Avid may not decode correctly. Export a ProRes .mov reference from your sequence for best results.",
                  ]
                : []),
            ]}
          />
        </div>

        <section className="rounded-xl border border-white/10 bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Show Info
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Show Name"
              value={showName}
              onChange={(v) => {
                showNameRef.current = v;
                setShowName(v);
              }}
            />
            <Field
              label="Episode Number"
              value={episode}
              onChange={setEpisode}
            />

            {saveContext && saveContext.episodes.length > 0 && (
              <label className="block space-y-1.5 text-sm sm:col-span-2">
                <span className="text-gray-400">Save to Episode</span>
                <select
                  value={selectedEpisodeId}
                  onChange={(e) => setSelectedEpisodeId(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-[#12121f] px-3 py-2 text-white outline-none ring-accent/40 focus:ring-2"
                >
                  {saveContext.episodes.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.episode_number} — {ep.title}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="space-y-1.5 text-sm">
              <span className="text-gray-400">Project Type</span>
              <div className="flex flex-wrap gap-6 pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-white">
                  <input
                    type="radio"
                    name="projectType"
                    checked={projectType === "episodic"}
                    onChange={() => setProjectType("episodic")}
                    className="h-4 w-4 border-white/20 bg-[#12121f] text-accent focus:ring-2 focus:ring-accent/60"
                  />
                  Episodic TV
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-white">
                  <input
                    type="radio"
                    name="projectType"
                    checked={projectType === "feature"}
                    onChange={() => setProjectType("feature")}
                    className="h-4 w-4 border-white/20 bg-[#12121f] text-accent focus:ring-2 focus:ring-accent/60"
                  />
                  Feature Film
                </label>
              </div>
            </div>

            {projectType === "episodic" ? (
              <NumberField
                label="Season Number"
                value={seasonNumber}
                onChange={setSeasonNumber}
                min={1}
              />
            ) : (
              <div className="hidden min-h-[2.75rem] sm:block" aria-hidden />
            )}

            <Field
              label="Cut Version"
              value={cutVersion}
              onChange={setCutVersion}
              placeholder="Director's Cut v3"
            />
            <Field type="date" label="Date" value={date} onChange={setDate} />

            <Field
              label="VFX Supervisor"
              value={vfxSupervisor}
              onChange={setVfxSupervisor}
            />
            <Field label="Editor" value={editor} onChange={setEditor} />

            <Field
              label="VFX Sequence Code"
              value={vfxSequenceCode}
              onChange={(v) => setVfxSequenceCode(v.slice(0, 4))}
              placeholder="e.g. ib, sb, sc"
              maxLength={4}
            />
            <SelectField
              label="Image Type"
              value={imageType}
              onChange={setImageType}
              options={[
                { value: "mp", label: "mp — Main Plate" },
                { value: "bg", label: "bg — Background Plate" },
                { value: "fg", label: "fg — Foreground Plate" },
                { value: "el", label: "el — Element Plate" },
                { value: "cp", label: "cp — Clean Plate" },
                { value: "comp", label: "comp — Composite" },
              ]}
            />

            <Field
              label="Vendor Code"
              value={vendorCode}
              onChange={(v) =>
                setVendorCode(v.toLowerCase().replace(/[^a-z]/g, "").slice(0, 2))
              }
              placeholder="e.g. dd, im, wt"
              maxLength={2}
            />
            <NumberField
              label="Revision Number"
              value={revision}
              onChange={setRevision}
              min={1}
            />

            <div className="sm:col-span-2">
              <Field
                label="Video Start TC"
                value={videoStartTc}
                onChange={setVideoStartTc}
                placeholder="01:00:00:00"
              />
            </div>
          </div>
        </section>

        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
        {warning && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
            {warning}
          </p>
        )}
        {success && (
          <p className="whitespace-pre-line rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
            {success}
          </p>
        )}

        {success && lastSave && trackerEp && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                const x = lastDownloadRef.current;
                if (x) triggerDownload(x.buffer, x.name);
              }}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-white/5"
            >
              Download Excel again
            </button>
            <Link
              href={`/${trackerEp.orgSlug}/${trackerEp.showSlug.toLowerCase()}/vfx/shots?deliverable=${lastSave.deliverableId}`}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/25 hover:brightness-110"
            >
              View in Shot Tracker
            </Link>
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={runGenerate}
            className="w-full rounded-lg bg-accent py-4 text-center text-lg font-semibold text-white shadow-lg shadow-accent/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Generate VFX Sheet
          </button>

          {(busy || phase === "done") && (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-400">{statusMessage}</p>
            </div>
          )}

          {success && (
            <button
              type="button"
              onClick={resetAll}
              className="w-full rounded-lg border border-white/15 py-3 text-sm font-medium text-gray-200 hover:bg-white/5"
            >
              Generate Another
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-gray-400">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-white/10 bg-[#12121f] px-3 py-2 text-white outline-none ring-accent/40 focus:ring-2"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-gray-400">{label}</span>
      <input
        type="number"
        min={min}
        value={Number.isFinite(value) ? value : min}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) ? Math.max(min, n) : min);
        }}
        className="w-full rounded-md border border-white/10 bg-[#12121f] px-3 py-2 text-white outline-none ring-accent/40 focus:ring-2"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-white/10 bg-[#12121f] px-3 py-2 text-white outline-none ring-accent/40 focus:ring-2"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DropPanel({
  label,
  accept,
  file,
  onFile,
  hint,
  showSize,
  postSelectNote,
  amberNotes,
}: {
  label: string;
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
  hint: string;
  showSize?: boolean;
  postSelectNote?: string;
  amberNotes?: string[];
}) {
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="flex flex-col rounded-xl border border-dashed border-white/20 bg-card p-6 transition hover:border-accent/50"
    >
      <h3 className="text-base font-medium text-white">{label}</h3>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
      <label className="mt-4 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border border-white/10 bg-[#12121f]/80 px-4 py-8 text-center">
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <span className="text-accent text-sm font-medium">
          Drag & drop or click to browse
        </span>
        {file && (
          <>
            <span className="mt-3 break-all text-sm text-gray-300">
              {file.name}
              {showSize ? ` · ${formatBytes(file.size)}` : ""}
            </span>
            {postSelectNote && (
              <span className="mt-2 block max-w-sm text-xs leading-relaxed text-gray-500">
                {postSelectNote}
              </span>
            )}
            {amberNotes?.map((note, idx) => (
              <span
                key={idx}
                className="mt-2 block max-w-sm rounded-md border border-amber-500/35 bg-amber-950/25 px-2.5 py-2 text-left text-xs leading-relaxed text-amber-100/95"
              >
                {note}
              </span>
            ))}
          </>
        )}
      </label>
    </div>
  );
}
