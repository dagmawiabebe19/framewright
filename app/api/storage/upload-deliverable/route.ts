import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const path = form.get("path");
  if (!(file instanceof Blob) || typeof path !== "string") {
    return NextResponse.json({ ok: false, error: "Invalid form" }, { status: 400 });
  }

  const { error } = await supabase.storage.from("deliverables").upload(path, file, {
    upsert: true,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const { data: signed } = await supabase.storage
    .from("deliverables")
    .createSignedUrl(path, 3600);

  return NextResponse.json({ ok: true, path, signedUrl: signed?.signedUrl });
}
