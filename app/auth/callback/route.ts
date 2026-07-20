import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Where to send the user after auth. Password-reset links pass ?next=/reset so
  // they land on the set-new-password screen instead of home.
  const next = searchParams.get("next");

  const supabase = await createServerSupabase();

  let authed = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authed = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    authed = !error;
  }

  if (authed) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // Recovery links always go to the reset screen.
      if (next || type === "recovery") {
        return NextResponse.redirect(`${origin}${next ?? "/reset"}`);
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      return NextResponse.redirect(`${origin}${profile ? "/home" : "/welcome"}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
