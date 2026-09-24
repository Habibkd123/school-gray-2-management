import connectDB from "@/lib/db";
import LandingContent from "@/lib/models/LandingContent";
import { resolveSchoolIdServer } from "@/lib/themes/resolveSchool";
import { headers } from "next/headers";
import mongoose from "mongoose";
import { cache } from "react";

/**
 * Server-side helper to fetch landing content directly from MongoDB.
 *
 * Wrapped with React cache() so that multiple Server Components in the
 * same request (e.g. layout.tsx + page.tsx) share ONE DB query — the
 * second caller gets the memoized result instantly with zero extra round-trip.
 *
 * Prevents loopback HTTP fetches and guarantees 100% tenant-isolated data.
 */
export const getLandingData = cache(
  async (headersList?: { get: (name: string) => string | null }) => {
    try {
      const hl = headersList || (await headers());

      // Resolve school ID + connect DB in parallel
      const [schoolId] = await Promise.all([
        resolveSchoolIdServer(hl),
        connectDB(),
      ]);
      if (!schoolId) return null;

      const doc = await LandingContent.findOne({
        school_id: new mongoose.Types.ObjectId(schoolId),
      }).lean();

      if (!doc) return null;
      return JSON.parse(JSON.stringify(doc));
    } catch (err) {
      console.error("[getLandingData ERROR]", err);
      return null;
    }
  }
);
