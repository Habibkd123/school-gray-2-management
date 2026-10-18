import School from "@/lib/models/School";
import connectDB from "@/lib/db";

export interface PartnerSchoolItem {
  id: string;
  name: string;
  subdomain: string;
  city: string;
  studentsCount: string;
  status: string;
  logo_url: string | null;
  features: string[];
}

let _cachedPartnerSchools: { data: PartnerSchoolItem[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 300_000; // 5 minutes

export async function getPartnerSchools(): Promise<PartnerSchoolItem[]> {
  if (_cachedPartnerSchools && Date.now() - _cachedPartnerSchools.timestamp < CACHE_TTL_MS) {
    return _cachedPartnerSchools.data;
  }

  try {
    await connectDB();
    const schools = await School.find({})
      .select("_id name subdomain slug city address logo_url")
      .lean();

    if (!schools || schools.length === 0) {
      return getFallbackSchools();
    }

    const result: PartnerSchoolItem[] = schools.map((s: any) => {
      const sub = s.subdomain || s.slug || "";
      const city = s.city || s.address?.city || (sub === "bajrang" ? "Rajasthan, India" : "India");
      const students = sub === "bajrang" ? "1,000+" : sub === "greenwood-academy" ? "850+" : "500+";

      return {
        id: s._id.toString(),
        name: s.name || (sub === "bajrang" ? "Bajrang Shikshan Sansthan" : "Partner School"),
        subdomain: sub,
        city,
        studentsCount: `${students} Students`,
        status: "Active Portal",
        logo_url: s.logo_url || null,
        features: ["Full ERP", "Online Fees", "Custom Subdomain"],
      };
    });

    _cachedPartnerSchools = { data: result, timestamp: Date.now() };
    return result;
  } catch (err) {
    console.error("Error fetching partner schools:", err);
    return getFallbackSchools();
  }
}

function getFallbackSchools(): PartnerSchoolItem[] {
  return [
    {
      id: "6ab333f5c76c479dba790075",
      name: "Bajrang Shikshan Sansthan",
      subdomain: "bajrang",
      city: "Rajasthan, India",
      studentsCount: "1,000+ Students",
      status: "Active Portal",
      logo_url: null,
      features: ["Full ERP", "Online Fees", "Custom Subdomain"],
    },
    {
      id: "6a36672f894ca7368ab49e84",
      name: "Greenwood Academy",
      subdomain: "greenwood-academy",
      city: "Delhi NCR, India",
      studentsCount: "850+ Students",
      status: "Active Portal",
      logo_url: null,
      features: ["Smart Admissions", "Student Portal", "Report Cards"],
    },
    {
      id: "6a2790ea0d99d9775d96be6a",
      name: "My School Life Model School",
      subdomain: "myschoollife",
      city: "Jaipur, Rajasthan",
      studentsCount: "1,200+ Students",
      status: "Active Portal",
      logo_url: null,
      features: ["Attendance ERP", "Fee Automation", "CBSE Grading"],
    },
    {
      id: "6a42a518968a0550f861dbd6",
      name: "New School Life Academy",
      subdomain: "new-school-life",
      city: "Uttar Pradesh, India",
      studentsCount: "600+ Students",
      status: "Active Portal",
      logo_url: null,
      features: ["Parent App", "Digital Diary", "Exam Engine"],
    },
  ];
}
