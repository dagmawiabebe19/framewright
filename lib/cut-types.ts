export type CutType =
  | "assembly"
  | "editors_cut"
  | "directors_cut"
  | "producers_cut"
  | "network_cut"
  | "picture_lock";

export const CUT_TYPE_OPTIONS: { value: CutType; label: string }[] = [
  { value: "assembly", label: "Assembly" },
  { value: "editors_cut", label: "Editor's cut" },
  { value: "directors_cut", label: "Director's cut" },
  { value: "producers_cut", label: "Producer's cut" },
  { value: "network_cut", label: "Network cut" },
  { value: "picture_lock", label: "Picture lock" },
];

export function cutTypeLabel(type: string): string {
  const hit = CUT_TYPE_OPTIONS.find((o) => o.value === type);
  return hit?.label ?? type;
}
