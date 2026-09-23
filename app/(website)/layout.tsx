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

import { getLandingData } from "@/lib/landing/getLandingData";

export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getLandingData();

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
