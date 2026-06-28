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

  const hasHero = Boolean(
    landingData?.about?.hero_tagline ||
      landingData?.about?.hero_description ||
      landingData?.about?.hero_side_image_url ||
      landingData?.about?.hero_video_url ||
      landingData?.admissions?.apply_url
  );

  const hasAbout = Boolean(
    landingData?.about &&
      (landingData.about.hero_tagline ||
        landingData.about.history ||
        landingData.about.vision ||
        landingData.about.infrastructure ||
        landingData.about.management_team?.length)
  );

  const hasHighlights = Boolean(landingData?.highlights?.length);

  const hasWhyChooseUs = Boolean(landingData?.why_choose_us?.length);

  const hasAcademics = Boolean(
    landingData?.academics &&
      (landingData.academics.programs?.length || landingData.academics.faculty?.length || landingData.academics.curriculum_overview || landingData.academics.class_structure)
  );

  const hasFacilities = Boolean(landingData?.facilities?.length);
  const hasAchievements = Boolean(
    landingData?.student_life &&
      (landingData.student_life.achievements?.length ||
        landingData.student_life.sports ||
        landingData.student_life.cultural_activities ||
        landingData.student_life.clubs_societies)
  );

  const hasGallery = Boolean(landingData?.gallery?.photos?.length);
  const hasVirtualTour = Boolean(landingData?.gallery?.videos?.length);

  const hasTestimonials = Boolean(landingData?.testimonials?.length);

  const hasAdmissions = Boolean(
    landingData?.admissions &&
      (landingData.admissions.how_to_apply ||
        landingData.admissions.apply_url ||
        landingData.admissions.documents_required?.length ||
        landingData.admissions.fee_structure?.length ||
        landingData.admissions.admission_open !== undefined)
  );

  const hasNews = Boolean(
    landingData?.news_notices?.some((item) => item.is_published)
  );

  const hasFAQs = Boolean(landingData?.faqs?.length);

  const hasContact = Boolean(
    landingData?.contact &&
      (landingData.contact.address ||
        landingData.contact.phone ||
        landingData.contact.email ||
        landingData.contact.website ||
        landingData.contact.map_embed_url ||
        landingData.contact.social?.facebook ||
        landingData.contact.social?.twitter ||
        landingData.contact.social?.instagram ||
        landingData.contact.social?.youtube)
  );

  return (
    <main className="w-full">
      {hasHero && <Hero data={landingData} />}
      {hasHighlights && <Highlights data={landingData} />}
      {hasAbout && <AboutSchool data={landingData?.about} />}
      {hasWhyChooseUs && <WhyChooseUs data={landingData} />}
      {hasAcademics && <AcademicPrograms data={landingData?.academics} />}
      {hasFacilities && <Facilities data={landingData} />}
      {hasAchievements && <Achievements data={landingData?.student_life} />}
      {hasGallery && <Gallery data={landingData?.gallery} />}
      {hasVirtualTour && <VirtualCampusTour data={landingData?.gallery} />}
      {hasTestimonials && <Testimonials data={landingData} />}
      {hasAdmissions && <AdmissionProcess data={landingData?.admissions} />}
      {hasNews && <LatestNews data={landingData?.news_notices} />}
      {hasFAQs && <FAQ data={landingData} />}
      {hasContact && <Contact data={landingData?.contact} />}
    </main>
  );
}
