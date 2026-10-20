import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rafraîchit la session Supabase et redirige les visiteurs non connectés.
// C'est une vérification « optimiste » : chaque page, action et fonction SQL
// contrôle elle-même les droits.
const PUBLIC_PATHS = ["/connexion", "/mot-de-passe-oublie", "/auth/callback", "/hors-ligne", "/configuration"];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!url || !anonKey) {
    return isPublic ? NextResponse.next() : NextResponse.redirect(new URL("/configuration", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const login = new URL("/connexion", request.url);
    if (pathname !== "/") login.searchParams.set("suite", pathname);
    return NextResponse.redirect(login);
  }
  if (user && pathname === "/connexion") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|robots.txt|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
