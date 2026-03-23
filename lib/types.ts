/** Parsed VFX row before shot IDs / thumbnails are finalized */
export interface VfxShot {
  shotId?: string;
  scene?: string;
  reel: string;
  tcInRec: string;
  tcOutRec: string;
  tcInSrc: string;
  tcOutSrc: string;
  /** Duration in whole frames (sequence / record rate) */
  framesDuration: number;
  vfxDescription: string;
  /** Timecode used to seek reference video for thumbnail */
  thumbnailTc?: string;
  /** Optional absolute frame index for thumbnail (e.g. Premiere marker) */
  thumbnailFrame?: number;
  /** Sequence / record framerate for conversions */
  fps?: number;
  /** Use SMPTE drop-frame rules when interpreting thumbnailTc / record TC */
  dropFrame?: boolean;
  /** EDL LOC: VFX id parsed before description cleanup */
  explicitVfxIdFromMarker?: string;
  /** Handle frames (VFX house); default 8 in Excel */
  handleFrames?: number;
  /** Excel PRIORITY column (blank until AE sets in sheet) */
  priority?: "High" | "Medium" | "Low" | "";
  /** ETC / MovieLabs–style delivery ID */
  standardId?: string;
}

export type SequenceFormat = "edl" | "xml" | "fcpxml" | "ale";

export interface ParseResult {
  shots: VfxShot[];
  fps: number;
  dropFrame: boolean;
  format: SequenceFormat;
}

/** Show / project metadata (form + Excel header) */
export interface ShowMeta {
  showName: string;
  episode: string;
  cutVersion: string;
  date: string;
  vfxSupervisor: string;
  editor: string;
  projectType: "feature" | "episodic";
  seasonNumber: number;
  vfxSequenceCode: string;
  imageType: string;
  vendorCode: string;
  revision: number;
}

/** Alias for TR-VFX-IS docs naming */
export type ShowInfo = ShowMeta;
