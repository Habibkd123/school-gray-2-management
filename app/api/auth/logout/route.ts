import { NextResponse } from "next/server";

// ─── Logout ───────────────────────────────────────────────────────
export async function POST() {
  const response = NextResponse.json(
    {
      success: true,
      message: "Logged out successfully.",
    },
    { status: 200 }
  );

  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";
  const isProduction = process.env.NODE_ENV === "production";
  const cookieDomain = isProduction ? `.${ROOT_DOMAIN}` : undefined;

  const cookiesToClear = ["sm_token", "sm_role", "sm_subdomain"];
  for (const name of cookiesToClear) {
    response.cookies.set(name, "", {
      domain: cookieDomain,
      path: "/",
      sameSite: "lax",
      secure: isProduction,
      maxAge: 0,
      expires: new Date(0),
    });
  }

  return response;
}

