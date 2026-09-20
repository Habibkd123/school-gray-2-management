import React from "react";
import type { Metadata } from "next";
import { Header } from "../components/landing/Header";
import { Footer } from "../components/landing/Footer";

export const metadata: Metadata = {
  title: "MySchoolLife - Best School Management Software & ERP in Padukallan, Merta",
  description:
    "MySchoolLife provides complete school management software, ERP, student portals, online fees, and exam management in Padukallan, Merta City, Nagaur district.",
  keywords: [
    "MySchoolLife",
    "myschoollife",
    "myschoollife.in",
    "School Management Software Padukallan",
    "School ERP Padukallan",
    "Padukallan school",
    "Best school ERP Padukallan",
    "School Management Software Merta",
    "School ERP Merta",
    "Merta school software",
    "School management system",
    "Student portal",
    "Online fee payment school",
    "Exam management system",
    "School ERP India",
    "Nagaur school ERP",
    "school management",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: "https://myschoollife.in",
  },
  openGraph: {
    title: "MySchoolLife - Best School Management Software & ERP in Padukallan, Merta",
    description:
      "MySchoolLife provides complete school management software, ERP, student portals, online fees, and exam management in Padukallan, Merta City, Nagaur district.",
    url: "https://myschoollife.in",
    siteName: "MySchoolLife",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MySchoolLife - Best School Management Software & ERP in Padukallan, Merta",
    description:
      "MySchoolLife provides complete school management software, ERP, student portals, online fees, and exam management in Padukallan, Merta City, Nagaur district.",
  },
};

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
