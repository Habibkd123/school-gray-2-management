"use client";

import React, { useState } from "react";
import { SaaSHeader } from "./SaaSHeader";
import { SaaSHero } from "./SaaSHero";
import { SaaSFeatures } from "./SaaSFeatures";
import { SaaSPortalPreview } from "./SaaSPortalPreview";
import { SaaSPartnerSchools } from "./SaaSPartnerSchools";
import { SaaSCalculator } from "./SaaSCalculator";
import { SaaSPricing } from "./SaaSPricing";
import { SaaSMobileAppBanner } from "./SaaSMobileAppBanner";
import { SaaSFooter } from "./SaaSFooter";
import { SaaSDemoModal } from "./SaaSDemoModal";
import { PartnerSchoolItem } from "@/lib/landing/getPartnerSchools";

interface SaaSPlatformHomeProps {
  partnerSchools: PartnerSchoolItem[];
}

export function SaaSPlatformHome({ partnerSchools }: SaaSPlatformHomeProps) {
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-600 selection:text-white overflow-x-hidden">
      {/* Header & Announcement Ribbon */}
      <SaaSHeader onOpenDemo={() => setDemoModalOpen(true)} />

      {/* Main SaaS Content */}
      <main className="overflow-x-hidden">
        {/* Hero Section */}
        <SaaSHero onOpenDemo={() => setDemoModalOpen(true)} />
        {/* Live Role Portal Showcase */}
        <SaaSPortalPreview />
        {/* Platform Capabilities (8 Core ERP Modules) */}
        <SaaSFeatures />



        {/* Partner Schools Ecosystem with Live Search */}
        <SaaSPartnerSchools schools={partnerSchools} />

        {/* School Efficiency & Cost Savings Calculator */}
        <SaaSCalculator onOpenDemo={() => setDemoModalOpen(true)} />

        {/* Simple Transparent Pricing */}
        <SaaSPricing onOpenDemo={() => setDemoModalOpen(true)} />

        {/* Mobile App Ecosystem Announcement */}
        <SaaSMobileAppBanner onOpenDemo={() => setDemoModalOpen(true)} />
      </main>

      {/* Footer */}
      <SaaSFooter />

      {/* Interactive Request Demo Modal */}
      <SaaSDemoModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
      />
    </div>
  );
}
