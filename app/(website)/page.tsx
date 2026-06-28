import React from "react";
import { Hero } from "../components/landing/Hero";
import { Highlights } from "../components/landing/Highlights";
import { AboutSchool } from "../components/landing/AboutSchool";
import { WhyChooseUs } from "../components/landing/WhyChooseUs";
import { AcademicPrograms } from "../components/landing/AcademicPrograms";
import { ApplyNowSection } from "../components/landing/ApplyNowSection";
import { Facilities } from "../components/landing/Facilities";
import { Achievements } from "../components/landing/Achievements";
import { Gallery } from "../components/landing/Gallery";
import { VirtualCampusTour } from "../components/landing/VirtualCampusTour";
import { Testimonials } from "../components/landing/Testimonials";
import { AdmissionProcess } from "../components/landing/AdmissionProcess";
import { LatestNews } from "../components/landing/LatestNews";
import { FAQ } from "../components/landing/FAQ";
import { Contact } from "../components/landing/Contact";

async function getLandingData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const isDev = process.env.NODE_ENV === "development";
    const res = await fetch(`${baseUrl}/api/public/landing`, {
      ...(isDev
        ? { cache: "no-store" }           // always fresh in dev
        : { next: { revalidate: 60 } }),  // 60s cache in production
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const landingData = await getLandingData();

  return (
    <main className="w-full">
      <Hero data={landingData} />
      <Highlights data={landingData} />
      <AboutSchool data={landingData?.about} />
      <WhyChooseUs data={landingData} />
      <AcademicPrograms data={landingData?.academics} />
      <ApplyNowSection data={landingData} />
      <Facilities data={landingData} />
      <Achievements data={landingData?.student_life} />
      <Gallery data={landingData?.gallery} />
      <VirtualCampusTour data={landingData?.gallery} />
      <Testimonials data={landingData} />
      <AdmissionProcess data={landingData?.admissions} />
      <LatestNews data={landingData?.news_notices} />
      <FAQ data={landingData} />
      <Contact data={landingData?.contact} />
    </main>
  );
}
