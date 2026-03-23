import type { CutType } from "@/lib/cut-types";

export type DeliverableLite = {
  type: string;
  status: string;
};

export type CutLite = { cut_type: string };

export function hasCutType(cuts: CutLite[], type: CutType): boolean {
  return cuts.some((c) => c.cut_type === type);
}

export type PhaseKey =
  | "shooting"
  | "assembly"
  | "editors"
  | "directors"
  | "producers"
  | "network"
  | "picture_lock"
  | "color"
  | "sound"
  | "vfx_finals"
  | "delivery";

export type PhaseDeriveInput = {
  episodeStatus: string;
  cuts: CutLite[];
  deliverables: DeliverableLite[];
  vfxTotal: number;
  vfxApproved: number;
};

export function derivePhaseCompletion(input: PhaseDeriveInput): Record<PhaseKey, boolean> {
  const { episodeStatus, cuts, deliverables, vfxTotal, vfxApproved } = input;

  const colorOk = deliverables.some(
    (d) => d.type === "color_turnover" && d.status === "approved"
  );
  const soundOk = deliverables.some(
    (d) => d.type === "sound_turnover" && d.status === "approved"
  );

  const vfxFinals =
    vfxTotal === 0 ? true : vfxApproved === vfxTotal && vfxTotal > 0;

  return {
    shooting: episodeStatus !== "prep",
    assembly: hasCutType(cuts, "assembly"),
    editors: hasCutType(cuts, "editors_cut"),
    directors: hasCutType(cuts, "directors_cut"),
    producers: hasCutType(cuts, "producers_cut"),
    network: hasCutType(cuts, "network_cut"),
    picture_lock:
      hasCutType(cuts, "picture_lock") || episodeStatus === "locked",
    color: colorOk,
    sound: soundOk,
    vfx_finals: vfxFinals,
    delivery: episodeStatus === "delivered",
  };
}

export const PHASE_ORDER: { key: PhaseKey; label: string }[] = [
  { key: "shooting", label: "Shooting" },
  { key: "assembly", label: "Assembly cut" },
  { key: "editors", label: "Editor's cut" },
  { key: "directors", label: "Director's cut" },
  { key: "producers", label: "Producer's cut" },
  { key: "network", label: "Network cut" },
  { key: "picture_lock", label: "Picture lock" },
  { key: "color", label: "Color" },
  { key: "sound", label: "Sound mix" },
  { key: "vfx_finals", label: "VFX finals" },
  { key: "delivery", label: "Delivery" },
];

export function firstIncompleteIndex(
  complete: Record<PhaseKey, boolean>
): number {
  for (let i = 0; i < PHASE_ORDER.length; i++) {
    const k = PHASE_ORDER[i].key;
    if (!complete[k]) return i;
  }
  return -1;
}
