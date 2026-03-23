import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function memberEmailsForOrg(
  admin: AdminClient,
  orgId: string,
  opts: {
    roles?: string[];
    prefsKey: "digest" | "deadlines" | "vfx_updates" | "cut_versions";
  }
): Promise<string[]> {
  let q = admin.from("members").select("user_id, notification_prefs, role").eq("org_id", orgId);
  if (opts.roles?.length) {
    q = q.in("role", opts.roles);
  }
  const { data: members } = await q;
  const out: string[] = [];
  for (const m of members ?? []) {
    const p = (m.notification_prefs ?? {}) as Record<string, unknown>;
    if (p[opts.prefsKey] === false) continue;
    const { data, error } = await admin.auth.admin.getUserById(m.user_id);
    if (!error && data.user?.email) out.push(data.user.email);
  }
  return [...new Set(out)];
}
