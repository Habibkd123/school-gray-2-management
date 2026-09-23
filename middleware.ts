import { NextRequest, NextResponse } from "next/server";

// Root domain — change this if domain changes
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";

// Dashboard and school-specific protected routes
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/students",
  "/teachers",
  "/classes",
  "/attendance",
  "/homework",
  "/results",
  "/fees",
  "/notices",
  "/documents",
  "/transport",
  "/website",
  "/settings",
  "/student/",
];

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  const pathname = url.pathname;

  // ─── Standalone mode env vars ─────────────────────────────
  const IS_STANDALONE = process.env.NEXT_PUBLIC_IS_STANDALONE === "true";
  const STANDALONE_SUB = (process.env.NEXT_PUBLIC_STANDALONE_SUBDOMAIN || "").trim().toLowerCase();

  // ─── Subdomain Detection ─────────────────────────────────
  const hostnameWithoutPort = hostname.split(":")[0];
  const isLocalhost =
    hostnameWithoutPort === "localhost" ||
    hostnameWithoutPort === "127.0.0.1" ||
    hostnameWithoutPort.endsWith(".localhost");

  let subdomain: string | null = null;

  if (hostnameWithoutPort === "localhost" || hostnameWithoutPort === "127.0.0.1") {
    // Local dev plain: use query param ?subdomain=bajrang for testing
    subdomain = url.searchParams.get("subdomain") || null;
    // Standalone mode: treat main domain as the configured school
    if (!subdomain && IS_STANDALONE && STANDALONE_SUB) subdomain = STANDALONE_SUB;
  } else if (hostnameWithoutPort.endsWith(".localhost")) {
    // Local dev subdomain: bajrang.localhost → "bajrang"
    subdomain = hostnameWithoutPort.replace(".localhost", "");
    if (subdomain === "www") subdomain = null;
  } else if (hostnameWithoutPort.endsWith(`.${ROOT_DOMAIN}`)) {
    // Production subdomain: bajrang.myschoollife.in → "bajrang"
    subdomain = hostnameWithoutPort.replace(`.${ROOT_DOMAIN}`, "");
    if (subdomain === "www") subdomain = null;
    // Standalone mode: root domain (myschoollife.in / www.myschoollife.in) → treat as school
    if (!subdomain && IS_STANDALONE && STANDALONE_SUB) subdomain = STANDALONE_SUB;
  } else if (
    hostnameWithoutPort === ROOT_DOMAIN ||
    hostnameWithoutPort === `www.${ROOT_DOMAIN}`
  ) {
    // Exact root domain hit (production) — standalone check
    if (IS_STANDALONE && STANDALONE_SUB) subdomain = STANDALONE_SUB;
  } else if (!hostnameWithoutPort.includes("vercel.app")) {
    // Custom domain: www.bajrangschool.com — pass full hostname
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-custom-domain", hostnameWithoutPort);
    requestHeaders.set("x-hostname", hostname);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // ─── Subdomain Persistence: Check User Cookies ───────────
  // Non-API routes only
  if (!pathname.startsWith("/api/")) {
    const cookieSubdomain = request.cookies.get("sm_subdomain")?.value;
    const cookieRole = request.cookies.get("sm_role")?.value;

    const isProtectedRoute = PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    // Rule 1: School user is on main domain (subdomain is null) but accessing a protected route
    // Redirect them to their school subdomain (only for actual tenant subdomains, never for root domain school)!
    const rootSlug = ROOT_DOMAIN.split(".")[0]?.toLowerCase();
    const isRootSchool =
      cookieSubdomain === rootSlug ||
      cookieSubdomain === "www" ||
      (IS_STANDALONE && cookieSubdomain === STANDALONE_SUB);

    if (
      cookieSubdomain &&
      !isRootSchool &&
      cookieRole !== "super_admin" &&
      subdomain === null &&
      isProtectedRoute
    ) {
      const port = url.port ? `:${url.port}` : "";
      const protocol = request.headers.get("x-forwarded-proto") || (isLocalhost ? "http" : "https");
      const targetHost = isLocalhost
        ? `${cookieSubdomain}.localhost${port}`
        : `${cookieSubdomain}.${ROOT_DOMAIN}`;

      const redirectUrl = new URL(`${protocol}://${targetHost}${pathname}${url.search}`);
      return NextResponse.redirect(redirectUrl);
    }

    // Rule 2: Super Admin is on a school subdomain accessing super-admin pages
    // Redirect them to main domain
    if (
      cookieRole === "super_admin" &&
      subdomain !== null &&
      (pathname.startsWith("/super-admin") || pathname.startsWith("/schools"))
    ) {
      const port = url.port ? `:${url.port}` : "";
      const protocol = request.headers.get("x-forwarded-proto") || (isLocalhost ? "http" : "https");
      const targetHost = isLocalhost
        ? `localhost${port}`
        : ROOT_DOMAIN;

      const redirectUrl = new URL(`${protocol}://${targetHost}${pathname}${url.search}`);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // ─── Inject request headers for Server Components & Route Handlers ──
  const requestHeaders = new Headers(request.headers);
  if (subdomain) {
    requestHeaders.set("x-subdomain", subdomain);
  } else {
    // If no subdomain in URL, check if cookie has subdomain for API requests
    const cookieSubdomain = request.cookies.get("sm_subdomain")?.value;
    if (cookieSubdomain) {
      requestHeaders.set("x-subdomain", cookieSubdomain);
    }
    // No NEXT_PUBLIC_SCHOOL_ID fallback — tenant is resolved purely from hostname/subdomain
  }
  requestHeaders.set("x-hostname", hostname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (subdomain) {
    response.headers.set("x-subdomain", subdomain);
  }
  response.headers.set("x-hostname", hostname);

  return response;
}

// Run middleware on all routes except Next.js internals and static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
