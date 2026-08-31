import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { safeAuthDestination } from "@/lib/account-setup";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const destination = safeAuthDestination(url.searchParams.get("next"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(new URL("/login?error=Authentication%20is%20not%20configured.", url.origin));
  }

  let response = NextResponse.redirect(new URL(destination, url.origin));
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.redirect(new URL(destination, url.origin));
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  let error = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else {
    return NextResponse.redirect(new URL("/login?error=Authentication%20link%20is%20incomplete.", url.origin));
  }

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
  }
  return response;
}
