import { Page } from "@playwright/test";
import { generateAccessToken, generateRefreshToken } from "@/lib/utils/jwt";

export async function loginAsAdmin(page: Page) {
  const payload = {
    user_id: "60f000000000000000000001",
    school_id: null,
    role: "super_admin",
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const user = {
    id: "60f000000000000000000001",
    name: "Super Admin",
    email: "admin@school.com",
    role: "super_admin",
    school_id: null,
    must_change_password: false,
  };

  // Mock settings permissions endpoint to prevent 401 logout
  await page.route("**/api/settings/permissions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: {} }),
    });
  });

  await page.addInitScript(
    ({ access, refresh, usr }) => {
      window.localStorage.setItem("sm_access_token", access);
      window.localStorage.setItem("sm_refresh_token", refresh);
      window.localStorage.setItem("sm_user", JSON.stringify(usr));
    },
    { access: accessToken, refresh: refreshToken, usr: user }
  );
}
