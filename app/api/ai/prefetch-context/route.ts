import { buildShowContextBlock, type AiRouteContext } from "@/lib/ai/build-show-context";
import { assertShowAccess } from "@/lib/ai/assert-show-access";
import {
  aiContextCacheKey,
  getCachedAiContext,
  setCachedAiContext,
} from "@/lib/ai/context-cache";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json()) as {
    showId?: string;
    episodeId?: string | null;
    context?: AiRouteContext;
  };

  if (!body.showId) {
    return NextResponse.json({ ok: false, error: "showId required" }, { status: 400 });
  }

  const show = await assertShowAccess(supabase, user.id, body.showId);
  if (!show) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const ctx = body.context ?? "general";
  const key = aiContextCacheKey(
    user.id,
    body.showId,
    body.episodeId ?? null,
    ctx
  );

  let block = getCachedAiContext(key);
  if (!block) {
    block = await buildShowContextBlock(supabase, {
      showId: body.showId,
      episodeId: body.episodeId ?? undefined,
      context: ctx,
    });
    setCachedAiContext(key, block);
  }

  return NextResponse.json({ ok: true, cacheKey: key, warmed: true });
}
