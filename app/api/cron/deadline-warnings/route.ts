import Anthropic from "@anthropic-ai/sdk";
import { verifyCronRequest } from "@/lib/cron/auth";
import { memberEmailsForOrg } from "@/lib/cron/member-emails";
import { deadlineWarningEmailHtml } from "@/lib/email/templates/deadline-warning";
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
  return { subject: "Deadline reminder", body: text.trim() };
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

  const { data: episodes } = await admin
    .from("episodes")
    .select(
      "id, episode_number, title, status, picture_lock_date, delivery_date, show_id, shows!inner(id, name, org_id, show_code)"
    )
    .neq("status", "delivered");

  const today = new Date();

  for (const ep of episodes ?? []) {
    const show = ep.shows as unknown as {
      id: string;
      name: string;
      org_id: string;
      show_code: string;
    };

    type Warn = { type: "picture_lock" | "delivery"; date: string; days: number };
    const warns: Warn[] = [];

    if (ep.picture_lock_date) {
      const d = new Date(ep.picture_lock_date + "T12:00:00");
      const days = differenceInCalendarDays(d, today);
      if (days >= 1 && days <= 3) {
        warns.push({
          type: "picture_lock",
          date: ep.picture_lock_date,
          days,
        });
      }
    }
    if (ep.delivery_date) {
      const d = new Date(ep.delivery_date + "T12:00:00");
      const days = differenceInCalendarDays(d, today);
      if (days >= 1 && days <= 3) {
        warns.push({
          type: "delivery",
          date: ep.delivery_date,
          days,
        });
      }
    }

    if (!warns.length) continue;

    const emails = await memberEmailsForOrg(admin, show.org_id, {
      roles: ["post_supervisor", "post_coordinator"],
      prefsKey: "deadlines",
    });
    if (!emails.length || !ai || !resend) continue;

    const { data: org } = await admin
      .from("organizations")
      .select("slug")
      .eq("id", show.org_id)
      .maybeSingle();
    if (!org) continue;

    const { data: dels } = await admin
      .from("deliverables")
      .select("id, type, status")
      .eq("episode_id", ep.id);

    const delList = dels ?? [];
    const vfxIds = delList.filter((d) => d.type === "vfx_sheet").map((d) => d.id);
    let vfxPending = 0;
    if (vfxIds.length) {
      const { count } = await admin
        .from("vfx_shots")
        .select("id", { count: "exact", head: true })
        .in("deliverable_id", vfxIds)
        .neq("status", "approved");
      vfxPending = count ?? 0;
    }

    const soundPending = delList.filter(
      (d) => d.type === "sound_turnover" && d.status !== "sent"
    ).length;
    const colorPending = delList.filter(
      (d) => d.type === "color_turnover" && d.status !== "sent"
    ).length;

    const { data: cuts } = await admin
      .from("cut_versions")
      .select("id")
      .eq("episode_id", ep.id);
    const cids = cuts?.map((c) => c.id) ?? [];
    let openNotes = 0;
    if (cids.length) {
      const { count } = await admin
        .from("cut_notes")
        .select("id", { count: "exact", head: true })
        .in("cut_version_id", cids)
        .eq("status", "open");
      openNotes = count ?? 0;
    }

    const pendingLines = [
      `VFX shots not yet approved: ${vfxPending}`,
      `Sound turnovers not marked sent: ${soundPending}`,
      `Color turnovers not marked sent: ${colorPending}`,
      `Open cut notes: ${openNotes}`,
    ].join("\n");

    for (const w of warns) {
      const label =
        w.type === "picture_lock" ? "Picture lock" : "Delivery";
      try {
        const msg = await ai.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          messages: [
            {
              role: "user",
              content: `Write a deadline warning email for ${show.name} Episode ${ep.episode_number}.

${label} is in ${w.days} days on ${w.date}.

Still pending:
${pendingLines}

Write a direct, urgent but professional email. Under 120 words. No filler. List the specific pending items. End with what needs to happen today.

Subject line first: 'Subject: ⚠ ${show.name} Ep${ep.episode_number} — ${label} in ${w.days} days'`,
            },
          ],
        });
        const block = msg.content.find((c) => c.type === "text");
        const raw =
          block && block.type === "text"
            ? block.text
            : `Subject: ⚠ ${show.name} Ep${ep.episode_number}\n\n${pendingLines}`;
        const { subject, body } = parseSubjectBlock(raw);

        const showSlug = show.show_code.toLowerCase();
        const dashboardUrl = `${site}/${org.slug}/${showSlug}`;

        const html = deadlineWarningEmailHtml({
          showName: show.name,
          episodeLabel: `Ep ${ep.episode_number}`,
          bodyText: body,
          dashboardUrl,
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
          episode_id: ep.id,
          action: "deadline_warning_sent",
          entity_type: "email",
          metadata: {
            episodeId: ep.id,
            daysUntil: w.days,
            deadline_type: w.type,
          },
        });
      } catch {
        // next
      }
    }
  }

  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  return handleCron(request);
}

export async function GET(request: Request) {
  return handleCron(request);
}
