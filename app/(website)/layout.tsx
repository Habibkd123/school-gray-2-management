import React from "react";
import { Header } from "../components/landing/Header";
import { Footer } from "../components/landing/Footer";

async function getLayoutData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const isDev = process.env.NODE_ENV === "development";
    const res = await fetch(`${baseUrl}/api/public/landing`, {
      ...(isDev
        ? { cache: "no-store" }
        : { next: { revalidate: 60 } }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getLayoutData();

  return (
    <div className="min-h-screen bg-white flex flex-col dark:bg-slate-900">
      <Header
        contact={data?.contact ?? null}
        admissions={data?.admissions ?? null}
      />
      <div className="flex-grow">
        {children}
      </div>
      <Footer
        contact={data?.contact ?? null}
        about={data?.about ?? null}
        admissions={data?.admissions ?? null}
      />
    </div>
  );
}
