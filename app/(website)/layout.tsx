import React from "react";
import { Header } from "../components/landing/Header";
import { Footer } from "../components/landing/Footer";

<<<<<<< Updated upstream
export default function WebsiteLayout({
=======
async function getLandingAndLayout() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const isDev = process.env.NODE_ENV === "development";

  const [landingRes, layoutRes] = await Promise.allSettled([
    fetch(`${baseUrl}/api/public/landing`, {
      ...(isDev ? { cache: "no-store" } : { next: { revalidate: 60 } }),
    }),
    fetch(`${baseUrl}/api/public/layout`, { cache: "no-store" }),
  ]);

  const landing =
    landingRes.status === "fulfilled" && landingRes.value.ok
      ? await landingRes.value.json().then((j: any) => (j.success ? j.data : null))
      : null;

  const layout =
    layoutRes.status === "fulfilled" && layoutRes.value.ok
      ? await layoutRes.value.json().then((j: any) => (j.success ? j.layoutConfig : null))
      : null;

  return { landing, layout };
}

export default async function WebsiteLayout({
>>>>>>> Stashed changes
  children,
}: {
  children: React.ReactNode;
}) {
<<<<<<< Updated upstream
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-grow">
        {children}
      </div>
      <Footer />
=======
  const { landing, layout } = await getLandingAndLayout();

  // Extract navigation settings from layout config
  const nav = layout?.navigation ?? {};
  const stickyHeader = nav.stickyHeader !== false; // default: true
  const topBarConfig = nav.topBar ?? { show: true };
  const admissionBtn = nav.admissionButton ?? { show: true, text: "Apply Now", link: "/admissions" };
  const loginBtn = nav.loginButton ?? { show: true, text: "Portal Login", link: "/login" };
  const socialIcons = nav.socialIcons ?? {};
  const layoutType = layout?.layoutType ?? "modern";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header
        contact={landing?.contact ?? null}
        admissions={landing?.admissions ?? null}
        // Layout config nav settings
        stickyHeader={stickyHeader}
        topBarConfig={topBarConfig}
        admissionBtn={admissionBtn}
        loginBtn={loginBtn}
        socialIcons={socialIcons}
        layoutType={layoutType}
        // Enabled pages from layout (for navigation link list)
        enabledPages={layout?.pages ?? null}
      />
      <div className="flex-grow">{children}</div>
      <Footer
        contact={landing?.contact ?? null}
        about={landing?.about ?? null}
        admissions={landing?.admissions ?? null}
        footerConfig={layout?.footer ?? null}
        socialIcons={socialIcons}
      />
>>>>>>> Stashed changes
    </div>
  );
}
