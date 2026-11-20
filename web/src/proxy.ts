import { NextResponse, type NextRequest } from "next/server";

/**
 * Maps public addresses onto the app's language folders (app/[lang]/...).
 *
 *   /product/teak-frame     -> shown from /en/product/teak-frame (address unchanged)
 *   /ta/product/teak-frame  -> served as it is
 *   /en/product/teak-frame  -> redirected to /product/teak-frame, so each page
 *                              has one English address for search engines
 *
 * The admin panel (/admin), the API (/api), Next.js's own files (/_next) and
 * files with an extension (favicon.ico, images) are left alone; see `matcher`.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/ta" || pathname.startsWith("/ta/")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|admin|_next|.*\\..*).*)"],
};
