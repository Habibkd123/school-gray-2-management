import React from "react";
import { Hero } from "../components/landing/Hero";
import { Highlights } from "../components/landing/Highlights";
import { AboutSchool } from "../components/landing/AboutSchool";
import { WhyChooseUs } from "../components/landing/WhyChooseUs";
import { AcademicPrograms } from "../components/landing/AcademicPrograms";
import { Facilities } from "../components/landing/Facilities";
import { Achievements } from "../components/landing/Achievements";
import { Gallery } from "../components/landing/Gallery";
import { VirtualCampusTour } from "../components/landing/VirtualCampusTour";
import { Testimonials } from "../components/landing/Testimonials";
import { AdmissionProcess } from "../components/landing/AdmissionProcess";
import { LatestNews } from "../components/landing/LatestNews";
import { FAQ } from "../components/landing/FAQ";
import { Contact } from "../components/landing/Contact";

// ─── Data Fetchers ──────────────────────────────────────────────────────────
async function getLandingData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const isDev = process.env.NODE_ENV === "development";
    const res = await fetch(`${baseUrl}/api/public/landing`, {
      ...(isDev ? { cache: "no-store" } : { next: { revalidate: 60 } }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

async function getLayoutConfig() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/layout`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.layoutConfig : null;
  } catch {
    return null;
  }
}

<<<<<<< Updated upstream
  return (
    <main className="w-full">
      <Hero data={landingData} />
      <Highlights data={landingData} />
      <AboutSchool data={landingData?.about} />
      <WhyChooseUs data={landingData} />
      <AcademicPrograms data={landingData?.academics} />
      <Facilities data={landingData} />
      <Achievements data={landingData?.student_life} />
      <Gallery data={landingData?.gallery} />
      <VirtualCampusTour data={landingData?.gallery} />
      <Testimonials data={landingData} />
      <AdmissionProcess data={landingData?.admissions} />
      <LatestNews data={landingData?.news_notices} />
      <FAQ data={landingData} />
      <Contact data={landingData?.contact} />
=======
// ─── Section Config → Component mapping ─────────────────────────────────────
// Maps each homepage section configuration to the React component

function renderSection(section: any, landingData: any): React.ReactNode {
  const sectionId = section.id;
  const bgImage = section.backgroundImage || "";

  switch (sectionId) {
    case "hero":
      return landingData && (
        landingData?.about?.hero_tagline ||
        landingData?.about?.hero_description ||
        landingData?.about?.hero_side_image_url ||
        landingData?.about?.hero_video_url ||
        landingData?.admissions?.apply_url
      ) ? <Hero key={sectionId} data={landingData} backgroundImage={bgImage} /> : null;

    case "welcome":
    case "highlights":
      return landingData?.highlights?.length
        ? <Highlights key={sectionId} data={landingData} />
        : null;

    case "about":
      return landingData?.about && (
        landingData.about.hero_tagline ||
        landingData.about.history ||
        landingData.about.vision ||
        landingData.about.infrastructure ||
        landingData.about.management_team?.length
      ) ? <AboutSchool key={sectionId} data={landingData?.about} /> : null;

    case "why-us":
    case "why-choose-us":
      return landingData?.why_choose_us?.length
        ? <WhyChooseUs key={sectionId} data={landingData} />
        : null;

    case "academics":
      return landingData?.academics && (
        landingData.academics.programs?.length ||
        landingData.academics.faculty?.length ||
        landingData.academics.curriculum_overview ||
        landingData.academics.class_structure
      ) ? <AcademicPrograms key={sectionId} data={landingData?.academics} /> : null;

    case "facilities":
      return landingData?.facilities?.length
        ? <Facilities key={sectionId} data={landingData} />
        : null;

    case "achievements":
    case "student-life":
      return landingData?.student_life && (
        landingData.student_life.achievements?.length ||
        landingData.student_life.sports ||
        landingData.student_life.cultural_activities ||
        landingData.student_life.clubs_societies
      ) ? <Achievements key={sectionId} data={landingData?.student_life} /> : null;

    case "gallery":
      return landingData?.gallery?.photos?.length
        ? <Gallery key={sectionId} data={landingData?.gallery} />
        : null;

    case "video-gallery":
      return landingData?.gallery?.videos?.length
        ? <VirtualCampusTour key={sectionId} data={landingData?.gallery} />
        : null;

    case "testimonials":
      return landingData?.testimonials?.length
        ? <Testimonials key={sectionId} data={landingData} />
        : null;

    case "admissions":
      return landingData?.admissions && (
        landingData.admissions.how_to_apply ||
        landingData.admissions.apply_url ||
        landingData.admissions.documents_required?.length ||
        landingData.admissions.fee_structure?.length ||
        landingData.admissions.admission_open !== undefined
      ) ? <AdmissionProcess key={sectionId} data={landingData?.admissions} /> : null;

    case "news-events":
    case "notice-board":
    case "news":
      return landingData?.news_notices?.some((item: any) => item.is_published)
        ? <LatestNews key={sectionId} data={landingData?.news_notices} />
        : null;

    case "faq":
      return landingData?.faqs?.length
        ? <FAQ key={sectionId} data={landingData} />
        : null;

    case "contact":
      return landingData?.contact && (
        landingData.contact.address ||
        landingData.contact.phone ||
        landingData.contact.email ||
        landingData.contact.map_embed_url
      ) ? <Contact key={sectionId} data={landingData?.contact} /> : null;

    default:
      return null;
  }
}

// ─── DEFAULT section order (fallback if layout server is down) ───────────────
const DEFAULT_SECTION_ORDER = [
  { id: "hero", enabled: true },
  { id: "highlights", enabled: true },
  { id: "about", enabled: true },
  { id: "why-choose-us", enabled: true },
  { id: "academics", enabled: true },
  { id: "facilities", enabled: true },
  { id: "achievements", enabled: true },
  { id: "gallery", enabled: true },
  { id: "video-gallery", enabled: true },
  { id: "testimonials", enabled: true },
  { id: "admissions", enabled: true },
  { id: "news-events", enabled: true },
  { id: "faq", enabled: true },
  { id: "contact", enabled: true },
];

// ─── Page Component ──────────────────────────────────────────────────────────
export default async function Home() {
  const [landingData, layoutConfig] = await Promise.all([
    getLandingData(),
    getLayoutConfig(),
  ]);

  // Build ordered, enabled section list from layout config
  let sections: any[] = DEFAULT_SECTION_ORDER;

  if (layoutConfig?.homepageSections?.length) {
    sections = (layoutConfig.homepageSections as Array<{
      id: string;
      enabled: boolean;
      order: number;
      backgroundImage?: string;
    }>)
      .filter((s) => s.enabled)
      .sort((a, b) => a.order - b.order);
  }

  return (
    <main className="w-full">
      {sections.map((section) => renderSection(section, landingData))}
>>>>>>> Stashed changes
    </main>
  );
}
