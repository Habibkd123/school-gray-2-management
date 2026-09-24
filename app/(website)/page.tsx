import React from "react";
import { headers } from "next/headers";
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
import { getLandingData } from "@/lib/landing/getLandingData";
import { resolveSchoolMeta } from "@/lib/themes/resolveSchool";

export default async function Home() {
  const headersList = await headers();

  // Run both fetches in parallel — resolveSchoolMeta uses same cache as layout.tsx
  const [landingData, school] = await Promise.all([
    getLandingData(),
    resolveSchoolMeta(headersList),
  ]);

  // ── Build Schema.org JSON-LD for this school ───────────────────────────────
  const contact = landingData?.contact;
  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";
  const subdomain = headersList.get("x-subdomain") ?? "";
  const customDomain = headersList.get("x-custom-domain") ?? "";
  const hostname = headersList.get("host")?.split(":")[0] ?? "";
  const isLocalhost = hostname === "localhost" || hostname.endsWith(".localhost");
  const proto = isLocalhost ? "http" : "https";
  let siteUrl = `https://${ROOT_DOMAIN}`;
  if (customDomain) {
    siteUrl = `${proto}://${customDomain}`;
  } else if (subdomain && subdomain !== "www") {
    siteUrl = isLocalhost
      ? `${proto}://${subdomain}.localhost`
      : `${proto}://${subdomain}.${ROOT_DOMAIN}`;
  } else if (hostname) {
    siteUrl = `${proto}://${hostname}`;
  }

  const jsonLd = school?.school_id
    ? {
        "@context": "https://schema.org",
        "@type": ["EducationalOrganization", "School"],
        name: school.name,
        url: siteUrl,
        ...(school.og_image && { logo: school.og_image }),
        ...(contact?.address && { address: {
          "@type": "PostalAddress",
          streetAddress: contact.address,
        }}),
        ...(contact?.phone && { telephone: contact.phone }),
        ...(contact?.email && { email: contact.email }),
        ...(contact?.social?.facebook && {
          sameAs: [
            contact.social.facebook,
            contact.social.twitter,
            contact.social.instagram,
            contact.social.youtube,
          ].filter(Boolean),
        }),
      }
    : null;

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
    landingData?.news_notices?.some((item: any) => item.is_published)
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
      {/* Schema.org JSON-LD — enables Google rich snippets & local school Knowledge Panel */}
      {jsonLd && (
        <script
          id="schema-json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          suppressHydrationWarning
        />
      )}
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
