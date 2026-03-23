import Anthropic from "@anthropic-ai/sdk";
import { verifyCronRequest } from "@/lib/cron/auth";
import { memberEmailsForOrg } from "@/lib/cron/member-emails";
import { digestEmailHtml } from "@/lib/email/templates/digest";
import { createAdminClient } from "@/lib/supabase/admin";
import { differenceInCalendarDays } from "date-fns";
import { Resend } from "resend";

function parseSubjectBlock(text: string): { subject: string; body: string } {
  const lines = text.trim().split("\n");
  if (lines[0]?.toLowerCase().startsWith("subject:")) {
    return {
      subject: lines[0].replace(/^subject:\s*/i, "").trim(),
      body: lines.slice(1).join("\n").trim(),
    };
  }
  const today = new Date().toLocaleDateString();
  return {
    subject: `${today} — Morning digest`,
    body: text.trim(),
  };
}

async function handleCron(request: Request) {
  if (!verifyCronRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return new Response("Misconfigured", { status: 500 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const from =
    process.env.RESEND_FROM || "FRAMEWRIGHT <onboarding@resend.dev>";

  const ai = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;
  const resend = resendKey ? new Resend(resendKey) : null;

  const { data: shows } = await admin
    .from("shows")
    .select("id, name, show_code, org_id")
    .limit(300);

  for (const show of shows ?? []) {
    const emails = await memberEmailsForOrg(admin, show.org_id, {
      prefsKey: "digest",
    });
    if (!emails.length) continue;

    const { data: org } = await admin
      .from("organizations")
      .select("slug")
      .eq("id", show.org_id)
      .maybeSingle();
    if (!org) continue;

    const { data: episodes } = await admin
      .from("episodes")
      .select(
        "id, episode_number, title, status, picture_lock_date, delivery_date"
      )
      .eq("show_id", show.id);

    const eps = episodes ?? [];
    if (!eps.length) continue;
    if (eps.every((e) => e.status === "delivered")) continue;

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: activity } = await admin
      .from("activity_log")
      .select("action, metadata, created_at")
      .eq("show_id", show.id)
      .gte("created_at", dayAgo)
      .order("created_at", { ascending: false })
      .limit(40);

    const lines: string[] = [];
    lines.push(`Show: ${show.name} (${show.show_code})`);
    lines.push("Episodes:");
    for (const e of eps) {
      lines.push(
        `  Ep ${e.episode_number} ${e.title} — ${e.status} — lock ${e.picture_lock_date ?? "n/a"} — delivery ${e.delivery_date ?? "n/a"}`
      );
      if (e.picture_lock_date) {
        const d = new Date(e.picture_lock_date + "T12:00:00");
        const days = differenceInCalendarDays(d, now);
        if (days >= 0 && days <= 14) lines.push(`    (picture lock in ${days}d)`);
      }
      if (e.delivery_date) {
        const d = new Date(e.delivery_date + "T12:00:00");
        const days = differenceInCalendarDays(d, now);
        if (days >= 0 && days <= 7) lines.push(`    (delivery in ${days}d)`);
      }
    }

    lines.push("Recent activity (24h):");
    if (!activity?.length) lines.push("  (none)");
    else {
      for (const a of activity.slice(0, 15)) {
        lines.push(`  - ${a.action} @ ${a.created_at}`);
      }
    }

    const epIds = eps.map((e) => e.id);
    let hiUnassigned = 0;
    if (epIds.length) {
      const { data: dels } = await admin
        .from("deliverables")
        .select("id")
        .eq("type", "vfx_sheet")
        .in("episode_id", epIds);
      const delIds = dels?.map((d) => d.id) ?? [];
      if (delIds.length) {
        const { data: shots } = await admin
          .from("vfx_shots")
          .select("priority, status, vendor")
          .in("deliverable_id", delIds);
        for (const s of shots ?? []) {
          if (
            s.priority === "High" &&
            s.status !== "approved" &&
            (!s.vendor || !String(s.vendor).trim())
          ) {
            hiUnassigned++;
          }
        }
      }
    }
    lines.push(`High-priority unassigned VFX shots (not approved): ${hiUnassigned}`);

    const { data: probRolls } = await admin
      .from("dailies_rolls")
      .select("id, roll_name, notes")
      .in("episode_id", epIds);
    const problems =
      probRolls?.filter(
        (r) => r.notes && /problem|issue/i.test(String(r.notes))
      ) ?? [];
    lines.push(`Dailies rolls with problem/issue notes: ${problems.length}`);

    let openNotes = 0;
    const { data: cuts } = await admin
      .from("cut_versions")
      .select("id")
      .in("episode_id", epIds);
    const cids = cuts?.map((c) => c.id) ?? [];
    if (cids.length) {
      const { count } = await admin
        .from("cut_notes")
        .select("id", { count: "exact", head: true })
        .in("cut_version_id", cids)
        .eq("status", "open");
      openNotes = count ?? 0;
    }
    lines.push(`Open cut notes: ${openNotes}`);

    const dataBlock = lines.join("\n");
    const todayLong = now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    if (!ai || !resend) continue;

    try {
      const msg = await ai.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Generate a concise morning digest email for the post production team on ${show.name}.
Today is ${todayLong}.

DATA:
${dataBlock}

Write a professional digest that:
- Opens with the most urgent item (if any)
- Lists 3-5 things that need attention today
- Notes any deadlines in the next 7 days
- Closes with a one-line status summary

Format:
- Plain text, no HTML
- Use em-dashes not bullet points
- Keep under 200 words total
- Subject line on first line: 'Subject: [SHOW] Morning Digest — [Date]'
- Blank line
- Then body`,
          },
        ],
      });
      const block = msg.content.find((c) => c.type === "text");
      const raw =
        block && block.type === "text"
          ? block.text
          : `Subject: ${show.name} Morning Digest — ${todayLong}\n\nNo AI output.`;
      const { subject, body } = parseSubjectBlock(raw);

      const showSlug = show.show_code.toLowerCase();
      const dashboardUrl = `${site}/${org.slug}/${showSlug}`;
      const settingsUrl = `${site}/${org.slug}/${showSlug}/settings`;

      const html = digestEmailHtml({
        showName: show.name,
        bodyText: body,
        dashboardUrl,
        settingsUrl,
      });

      await resend.emails.send({
        from,
        to: emails,
        subject,
        html,
      });

      await admin.from("activity_log").insert({
        org_id: show.org_id,
        show_id: show.id,
        action: "digest_sent",
        entity_type: "email",
        metadata: { recipientCount: emails.length, showId: show.id },
      });
    } catch {
      // continue other shows
    }
  }

  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  return handleCron(request);
}

/** Vercel Cron invokes scheduled routes with GET. */
export async function GET(request: Request) {
  return handleCron(request);
}
