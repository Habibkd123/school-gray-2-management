import School from "@/lib/models/School";
import connectDB from "@/lib/db";


export async function resolveSchoolIdServer(
  headersList: { get: (name: string) => string | null },
  urlStr?: string
): Promise<string | null> {
  let schoolId: string | null = null;
  let schoolSlug: string | null = null;

  // 1. Parse URLSearchParams if urlStr is provided
  if (urlStr) {
    try {
      const url = new URL(urlStr, "http://localhost");
      schoolId = url.searchParams.get("school_id");
      schoolSlug = url.searchParams.get("school");
    } catch {
      // ignore
    }
  }

  // 2. Try to extract from Host header (subdomain)
  const host = headersList.get("host") || "";
  if (!schoolId && !schoolSlug && host) {
    const hostname = host.split(":")[0];
    const parts = hostname.split(".");
    // e.g. greenwood-academy.localhost:3000 -> ["greenwood-academy", "localhost"]
    if (parts.length > 1) {
      if (parts[parts.length - 1] === "localhost" && parts.length === 2) {
        schoolSlug = parts[0];
      } else if (parts.length >= 3) {
        schoolSlug = parts[0];
      }
    }
  }

  // 3. Try to extract from Referer header (subdomains or query params of the parent browser page)
  const referer = headersList.get("referer");
  if (!schoolId && !schoolSlug && referer) {
    try {
      const refUrl = new URL(referer);
      schoolId = refUrl.searchParams.get("school_id");
      schoolSlug = refUrl.searchParams.get("school");

      if (!schoolId && !schoolSlug) {
        const refHostname = refUrl.hostname;
        const parts = refHostname.split(".");
        if (parts.length > 1) {
          if (parts[parts.length - 1] === "localhost" && parts.length === 2) {
            schoolSlug = parts[0];
          } else if (parts.length >= 3) {
            schoolSlug = parts[0];
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 4. Resolve slug to school_id
  if (schoolId) {
    return schoolId;
  }
  if (schoolSlug) {
    await connectDB();
    const school = await School.findOne({ slug: schoolSlug }).select("_id").lean();
    if (school) {
      return school._id.toString();
    }
  }

  // 5. Fallback to environment variable
  return process.env.NEXT_PUBLIC_SCHOOL_ID || null;
}
