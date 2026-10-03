import { NextResponse, type NextRequest } from "next/server";

/**
 * OPTIMISTIC auth gate only (Next.js guidance): redirect when there is no
 * session cookie at all. It does NOT verify the session - every page, server
 * action and route handler re-verifies against the database via `requireUser()`.
 * Never redirect *away* from /login here (a stale cookie would loop).
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    const login = new URL("/login", request.url);
    const next = request.nextUrl.pathname + request.nextUrl.search;
    login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/editor/:path*"],
};
