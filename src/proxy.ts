import { NextResponse, type NextRequest } from "next/server";

/**
 * OPTIMISTIC auth gate only (Next.js guidance): redirect when there is no
 * session cookie at all. It does NOT verify the session - every page, server
 * action and route handler re-verifies against the database via `requireUser()`.
 * Never redirect *away* from /login here (a stale cookie would loop).
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/" && process.env.APP_HOST) {
    const requestHost = request.nextUrl.hostname.toLowerCase();
    const platformHost = process.env.APP_HOST.toLowerCase().split(":")[0];
    if (
      requestHost !== platformHost &&
      requestHost !== "localhost" &&
      requestHost !== "127.0.0.1"
    ) {
      const storefront = request.nextUrl.clone();
      storefront.pathname = `/seller/${requestHost}`;
      return NextResponse.rewrite(storefront);
    }
  }
  if (request.nextUrl.pathname === "/") return NextResponse.next();
  if (!request.cookies.has("session")) {
    const login = new URL("/login", request.url);
    const next = request.nextUrl.pathname + request.nextUrl.search;
    login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/editor/:path*"],
};
