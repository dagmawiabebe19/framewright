import type { createClient } from "@/lib/supabase/server";

type SB = Awaited<ReturnType<typeof createClient>>;

export async function assertShowAccess(
  supabase: SB,
  userId: string,
  showId: string
) {
  const { data: show } = await supabase
    .from("shows")
    .select("id, org_id, name")
    .eq("id", showId)
    .maybeSingle();
  if (!show) return null;
  const { data: mem } = await supabase
    .from("members")
    .select("id")
    .eq("org_id", show.org_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!mem) return null;
  return show;
}
