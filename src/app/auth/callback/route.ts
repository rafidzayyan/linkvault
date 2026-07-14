import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth callback: tukar authorization code → sesi, lalu kembali ke app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Gagal: kembali ke beranda dengan flag error agar UI bisa memberi tahu.
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
