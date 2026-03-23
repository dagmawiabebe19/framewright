import Anthropic from "@anthropic-ai/sdk";
import { buildShowContextBlock, type AiRouteContext } from "@/lib/ai/build-show-context";
import { assertShowAccess } from "@/lib/ai/assert-show-access";
import {
  aiContextCacheKey,
  getCachedAiContext,
  setCachedAiContext,
} from "@/lib/ai/context-cache";
import { buildAiSystemPrompt } from "@/lib/ai/system-prompt";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as {
    message?: string;
    showId?: string;
    episodeId?: string | null;
    context?: AiRouteContext;
  };

  const message = body.message?.trim();
  if (!message || !body.showId) {
    return new Response("Bad request", { status: 400 });
  }

  const show = await assertShowAccess(supabase, user.id, body.showId);
  if (!show) {
    return new Response("Forbidden", { status: 403 });
  }

  const ctx = body.context ?? "general";
  const key = aiContextCacheKey(
    user.id,
    body.showId,
    body.episodeId ?? null,
    ctx
  );

  let dataBlock = getCachedAiContext(key);
  if (!dataBlock) {
    dataBlock = await buildShowContextBlock(supabase, {
      showId: body.showId,
      episodeId: body.episodeId ?? undefined,
      context: ctx,
    });
    setCachedAiContext(key, dataBlock);
  }

  const system = buildAiSystemPrompt(show.name, dataBlock);
  const keyAnthropic = process.env.ANTHROPIC_API_KEY;
  if (!keyAnthropic) {
    return new Response(
      "AI is not configured (ANTHROPIC_API_KEY). Ask your admin to add the key.",
      {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }

  const client = new Anthropic({ apiKey: keyAnthropic });
  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system,
    messages: [{ role: "user", content: message }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
