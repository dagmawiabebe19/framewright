export function activityActionLabel(
  action: string,
  metadata: Record<string, unknown> | null,
  episodeLabel?: string
): string {
  const ep = episodeLabel ? ` — ${episodeLabel}` : "";
  const meta = metadata ?? {};
  switch (action) {
    case "vfx_sheet_generated":
      return `VFX Sheet v${meta.version ?? "?"} generated${ep}`;
    case "shot_status_changed":
      return `${meta.shot_id ?? "Shot"} updated to ${meta.status ?? "new status"}${ep}`;
    case "dailies_roll_updated":
      return `Roll ${meta.roll_name ?? ""} updated${ep}`;
    case "cut_version_logged":
      return `Cut logged: ${meta.versionName ?? meta.cut_name ?? "new version"}${ep}`;
    case "deliverable_sent":
      return `Deliverable sent (${meta.type ?? "package"})${ep}`;
    case "dailies_email_sent":
      return `Dailies status email sent${ep}`;
    case "dailies_roll_created":
      return `Roll ${meta.roll_name ?? ""} added${ep}`;
    case "episode_created":
      return `Episode created${ep}`;
    case "onboarding_completed":
      return "Workspace onboarded";
    case "invitation_accepted":
      return "Invitation accepted";
    case "digest_sent":
      return `Morning digest sent (${meta.recipientCount ?? "?"} recipients)`;
    case "deadline_warning_sent":
      return `Deadline warning: ${meta.deadline_type ?? "milestone"} in ${meta.daysUntil ?? "?"}d`;
    case "ai_feedback":
      return meta.helpful === true
        ? "AI assistant — helpful"
        : "AI assistant — not helpful";
    default:
      return `${action.replace(/_/g, " ")}${ep}`;
  }
}
