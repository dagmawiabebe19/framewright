import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    showName?: string;
    episodeName?: string;
    episodeNumber?: string;
    shootDay?: number;
    rolls?: {
      roll_name: string;
      camera?: string | null;
      card_count?: number | null;
      status: string;
      notes?: string | null;
    }[];
  };

  const showName = body.showName ?? "Show";
  const episodeName = body.episodeName ?? "Episode";
  const shootDay = body.shootDay ?? 1;
  const rolls = body.rolls ?? [];

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const lines = rolls
      .map(
        (r) =>
          `${r.roll_name} (${r.camera ?? "camera"}) — ${r.card_count ?? "?"} cards — ${r.status}${r.notes ? ` — ${r.notes}` : ""}`
      )
      .join("\n");
    const bodyText = `Hi team — quick dailies update on ${showName}, ${episodeName}, shoot day ${shootDay}.\n\nCurrent rolls:\n${lines}\n\nMore detail will follow as ingest finishes.`;
    return NextResponse.json({
      body: bodyText,
      fallback: true,
    });
  }

  const client = new Anthropic({ apiKey: key });
  const rollLines = rolls
    .map(
      (r) =>
        `${r.roll_name} — Camera ${r.camera ?? "—"} — ${r.card_count ?? "?"} cards — ${r.status}${r.notes ? ` — Note: ${r.notes}` : ""}`
    )
    .join("\n");

  const epNum = body.episodeNumber ?? episodeName;
  const dateStr = new Date().toLocaleDateString();

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `You are the assistant editor on ${showName}, Episode ${epNum}, Shoot Day ${shootDay} — ${dateStr}.

Write the daily dailies status email to the post production team.

ROLL STATUS:
${rollLines}

WRITE:
- First person, past tense for completed items, present for in-progress
- Specific roll names and camera IDs
- Clear flag for any problem rolls
- Estimated completion time for pending items
- Under 150 words
- 2-3 short paragraphs, no bullet points

Do not include a subject line — just the body.`,
        },
      ],
    });
    const textBlock = msg.content.find((c) => c.type === "text");
    const text =
      textBlock && textBlock.type === "text"
        ? textBlock.text
        : "Dailies status update — see roll list in FRAMEWRIGHT.";
    return NextResponse.json({
      body: text,
      fallback: false,
    });
  } catch {
    const lines = rolls.map((r) => `${r.roll_name}: ${r.status}`).join("\n");
    return NextResponse.json({
      body: `Team — quick update on shoot day ${shootDay}.\n\n${lines}`,
      fallback: true,
    });
  }
}
