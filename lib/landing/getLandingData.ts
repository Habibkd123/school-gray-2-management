import connectDB from "@/lib/db";
import LandingContent from "@/lib/models/LandingContent";
import { resolveSchoolIdServer } from "@/lib/themes/resolveSchool";
import { headers } from "next/headers";
import mongoose from "mongoose";

/**
 * Server-side helper to fetch landing content directly from MongoDB
 * using the incoming request's headers (subdomain / host).
 *
 * Prevents loopback HTTP fetches to main domain (NEXT_PUBLIC_APP_URL)
 * and guarantees 100% tenant-isolated data for the active subdomain.
 */
export async function getLandingData(headersList?: { get: (name: string) => string | null }) {
  try {
    const hl = headersList || (await headers());
    const schoolId = await resolveSchoolIdServer(hl);
    if (!schoolId) return null;

    await connectDB();
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
