import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // set can fail in non-mutable contexts; session exchange still proceeds when possible
          }
        },
      },
    }
  );

  async function redirectForSession() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(
        new URL("/auth?error=callback_failed", requestUrl.origin)
      );
    }

    const { data: member } = await supabase
      .from("members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (member?.org_id) {
      return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
    }
    return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
  }

  // Handle PKCE code exchange (OAuth + magic link)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectForSession();
    }

    console.error("Code exchange error:", error);
    return NextResponse.redirect(
      new URL("/auth?error=callback_failed", requestUrl.origin)
    );
  }

  // Handle token_hash (email magic link fallback)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    });

    if (!error) {
      return redirectForSession();
    }

    console.error("Token verification error:", error);
    return NextResponse.redirect(
      new URL("/auth?error=callback_failed", requestUrl.origin)
    );
  }

  return NextResponse.redirect(new URL("/auth", requestUrl.origin));
}
