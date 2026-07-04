import mongoose from "mongoose";
import connectDB from "@/lib/db";

/**
 * Utility to generate unique school username (subdomain style) for a user.
 * Format: prefix.schoolslug.myschoollife (or prefix.myschoollife if no school slug is available)
 */
export async function generateUsernameForUser(
  email: string,
  schoolId?: string | mongoose.Types.ObjectId | null
): Promise<string> {
  const cleanedEmail = email.toLowerCase().trim();
  const domain = "myschoollife";
  
  // If the email already ends with .myschoollife, it is already a complete username
  if (cleanedEmail.endsWith(`.${domain}`)) {
    return cleanedEmail;
  }

  const localPart = email.split("@")[0].toLowerCase().trim().replace(/[^a-z0-9.]/g, "");

  if (schoolId) {
    await connectDB();
    const School = mongoose.models.School || mongoose.model("School");
    const school = await School.findById(schoolId).select("slug").lean() as any;
    if (school && school.slug) {
      const slug = school.slug.toLowerCase().trim().replace(/[^a-z0-9.]/g, "");
      
      if (localPart === slug) {
        return `${slug}.${domain}`;
      }
      if (localPart.endsWith(`.${slug}`)) {
        return `${localPart}.${domain}`;
      }
      return `${localPart}.${slug}.${domain}`;
    }
  }

  // Fallback or super_admin
  if (localPart.endsWith(`.${domain}`)) {
    return localPart;
  }
  return `${localPart}.${domain}`;
}
