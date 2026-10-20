import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Retour des liens e-mail Supabase (réinitialisation du mot de passe).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const suite = request.nextUrl.searchParams.get("suite") ?? "/";
  const safe = suite.startsWith("/") && !suite.startsWith("//") ? suite : "/";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safe, request.url));
  }
  return NextResponse.redirect(new URL("/connexion?erreur=lien", request.url));
}
