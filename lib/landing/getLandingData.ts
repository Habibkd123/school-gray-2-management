import connectDB from "@/lib/db";
import LandingContent from "@/lib/models/LandingContent";
import { resolveSchoolIdServer } from "@/lib/themes/resolveSchool";
import { headers } from "next/headers";
import mongoose from "mongoose";
import { cache } from "react";
import { unstable_cache } from "next/cache";

/**
 * getLandingData — fetches school landing/website content from MongoDB.
 *
 * Two-layer caching strategy:
 *
 * Layer 1 — `unstable_cache` (cross-request, server-side):
 *   The inner function `fetchLandingDataForSchool(schoolId)` is wrapped with
 *   unstable_cache, keyed by school_id and tagged `landing-<schoolId>`.
 *   Result is shared across ALL requests for 5 minutes.
 *   → On cache HIT: zero DB queries, instant response from memory.
 *   → On cache MISS: one DB query, result cached for all subsequent requests.
 *   → On content update: call `revalidateTag("landing-<schoolId>")` to invalidate.
 *
 * Layer 2 — React `cache()` (per-request deduplication):
 *   Outer wrapper deduplicates multiple calls within the SAME request
 *   (e.g., layout.tsx + page.tsx both call getLandingData — second call is free).
 */

// ── Inner: DB fetch, wrapped with unstable_cache (cross-request TTL) ────────
const fetchLandingDataForSchool = (schoolId: string) =>
  unstable_cache(
    async () => {
      await connectDB();
      const doc = await LandingContent.findOne({
        school_id: new mongoose.Types.ObjectId(schoolId),
      }).lean();
      if (!doc) return null;
      return JSON.parse(JSON.stringify(doc));
    },
    // Cache key — unique per school
    [`landing-data-${schoolId}`],
    {
      // Revalidate every 5 minutes — landing content changes rarely.
      // On content update from admin panel, call revalidateTag(`landing-${schoolId}`)
      revalidate: 300,
      tags: [`landing`, `landing-${schoolId}`],
    }
  )();

// ── Outer: React cache() deduplicates within the same request ───────────────
export const getLandingData = cache(
  async (headersList?: { get: (name: string) => string | null }) => {
    try {
      const hl = headersList || (await headers());

      // Resolve school ID + connect DB in parallel
      const schoolId = await resolveSchoolIdServer(hl);
      if (!schoolId) return null;

      return fetchLandingDataForSchool(schoolId);
    } catch (err) {
      console.error("[getLandingData ERROR]", err);
      return null;
    }
  }
);

