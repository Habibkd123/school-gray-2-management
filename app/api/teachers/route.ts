import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Teacher from "@/lib/models/Teacher";
import School from "@/lib/models/School";
import User from "@/lib/models/User";
import { TeacherAssignment } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import { sendConditionalJson } from "@/lib/etag";
import mongoose from "mongoose";

const SCHOOL_SLUG = process.env.NEXT_PUBLIC_SCHOOL_SLUG || "school";

function generateTeacherLoginEmail(name: string, dob?: string): string {
  // Use only first name word, max 10 chars, no special chars
  const firstName = name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  let dobDay = "";
  if (dob) {
    const d = new Date(dob);
    if (!isNaN(d.getTime())) {
      dobDay = String(d.getDate());
    }
  }
  // Strip hyphens/spaces from school slug
  const slug = SCHOOL_SLUG.replace(/[\s-]+/g, "");
  return `${firstName}${dobDay}.${slug}.myschoollife`;
}

// ─── Helper: escape special regex characters ─────────────────
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Global server cache & in-flight deduplication (persists across HMR/Turbopack) ──
const g = globalThis as unknown as {
  _teachersServerQueryCache?: Map<string, { data: any; timestamp: number }>;
  _teachersServerInFlight?: Map<string, Promise<any>>;
  _teacherCountCache?: Map<string, { count: number; timestamp: number }>;
};

if (!g._teachersServerQueryCache) g._teachersServerQueryCache = new Map();
if (!g._teachersServerInFlight) g._teachersServerInFlight = new Map();
if (!g._teacherCountCache) g._teacherCountCache = new Map();

const _teachersServerQueryCache = g._teachersServerQueryCache;
const _teachersServerInFlight = g._teachersServerInFlight;
const _teacherCountCache = g._teacherCountCache;

const SERVER_CACHE_TTL_MS = 60_000; // 60 seconds
const COUNT_CACHE_TTL_MS = 300_000; // 5 minutes

export function invalidateTeachersServerCache() {
  _teachersServerQueryCache.clear();
  _teachersServerInFlight.clear();
  _teacherCountCache.clear();
}

// GET: Fetch all teachers for the logged-in user's school
export async function GET(req: NextRequest) {
  const { schoolId, role, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  const paramSchool = req.nextUrl.searchParams.get("school_id") || "all";
  const cacheKey = `${role}:${schoolId || paramSchool}:${req.nextUrl.search}`;
  const cached = _teachersServerQueryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < SERVER_CACHE_TTL_MS) {
    return sendConditionalJson(
      req,
      { success: true, data: cached.data },
      { cacheControl: "private, max-age=30, stale-while-revalidate=120" }
    );
  }

  if (_teachersServerInFlight.has(cacheKey)) {
    try {
      const data = await _teachersServerInFlight.get(cacheKey)!;
      return sendConditionalJson(
        req,
        { success: true, data },
        { cacheControl: "private, max-age=30, stale-while-revalidate=120" }
      );
    } catch {
      // Fall through to query on error
    }
  }

  try {
    await connectToDatabase();

    // Optional query params
    const url = new URL(req.url);
    const search = url.searchParams.get("search");
    const limitParam = url.searchParams.get("limit");
    const isAll = limitParam === "all";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = isAll ? 500 : Math.min(Math.max(1, parseInt(limitParam || "12", 10)), 500);
    const skip = isAll ? 0 : (page - 1) * limit;

    const query: any = {};
    if (role === "super_admin") {
      const pSchool = url.searchParams.get("school_id");
      if (pSchool && pSchool !== "all") {
        query.school_id = pSchool;
      }
    } else {
      query.school_id = schoolId;
    }

    if (search && search.trim()) {
      const sanitized = search.trim();
      const escaped = escapeRegex(sanitized);
      const searchRegex = new RegExp(escaped, "i");
      query.$or = [
        { name: searchRegex },
        { employee_id: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { department: searchRegex },
        { designation: searchRegex },
        { qualification: searchRegex },
        { expertise: { $elemMatch: { $regex: searchRegex } } },
      ];
    }

    const department = url.searchParams.get("department");
    if (department && department !== "all") {
      query.department = { $regex: `^${department}$`, $options: "i" };
    }

    const designation = url.searchParams.get("designation");
    if (designation && designation !== "all") {
      query.designation = { $regex: `^${designation}$`, $options: "i" };
    }

    const qualification = url.searchParams.get("qualification");
    if (qualification && qualification !== "all") {
      query.qualification = { $regex: `^${qualification}$`, $options: "i" };
    }

    const expertise = url.searchParams.get("expertise");
    if (expertise && expertise !== "all") {
      query.expertise = { $elemMatch: { $regex: `^${expertise}$`, $options: "i" } };
    }

    const status = url.searchParams.get("status");
    if (status && status !== "all" && status !== "Select") {
      query.is_active = status.toLowerCase() === "active";
    }

    // Date Range preset filter (Applied to join_date)
    const dateRange = url.searchParams.get("dateRange");
    if (dateRange && dateRange !== "All Time") {
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (dateRange === "Today") {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
      } else if (dateRange === "Yesterday") {
        startDate = new Date();
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setDate(now.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
      } else if (dateRange === "Last 7 Days") {
        startDate = new Date();
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
      } else if (dateRange === "Last 30 Days") {
        startDate = new Date();
        startDate.setDate(now.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
      } else if (dateRange === "This Year") {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      if (startDate) {
        const dateFilter: Record<string, any> = { $gte: startDate };
        if (endDate) dateFilter.$lte = endDate;
        query.join_date = dateFilter;
      }
    }

    // Sort order
    const sort = url.searchParams.get("sort") || "Ascending";
    let sortObj: Record<string, any> = { name: 1 };
    if (sort === "Descending") {
      sortObj = { name: -1 };
    } else if (sort === "Recently Added") {
      sortObj = { createdAt: -1 };
    } else if (sort === "Recently Viewed") {
      sortObj = { updatedAt: -1 };
    }

    const isFull = url.searchParams.get("full") === "true";
    const includeUser = url.searchParams.get("include_user") === "true";
    const academic_year = url.searchParams.get("academic_year");
    let queryBuilder = Teacher.find(query);

    if (!isFull) {
      queryBuilder = queryBuilder.select(
        "_id school_id user_id class_id class_ids name employee_id gender phone email photo_url qualification expertise join_date is_active designation department createdAt"
      );
    }

    if (!academic_year) {
      queryBuilder = queryBuilder
        .populate("class_id", "name section")
        .populate("class_ids", "name section")
        .populate("school_id", "name subdomain slug");
    }

    queryBuilder = queryBuilder
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    if (isFull || includeUser) {
      queryBuilder = queryBuilder.populate("user_id", "name email role is_active plain_password");
    }

    const countKey = `${role}:${schoolId || paramSchool}:${JSON.stringify(query)}`;
    const cachedCount = _teacherCountCache.get(countKey);
    let totalPromise: Promise<number>;
    if (cachedCount && (Date.now() - cachedCount.timestamp) < COUNT_CACHE_TTL_MS) {
      totalPromise = Promise.resolve(cachedCount.count);
    } else {
      totalPromise = Teacher.countDocuments(query).then((c) => {
        _teacherCountCache.set(countKey, { count: c, timestamp: Date.now() });
        return c;
      });
    }

    const [teachers, total] = await Promise.all([
      queryBuilder.lean(),
      totalPromise,
    ]);

    if (academic_year && teachers.length > 0) {
      const teacherIds = (teachers as any[]).map((t) => t._id);
      const assignments = await TeacherAssignment.find({
        school_id: schoolId,
        academic_year,
        teacher_id: { $in: teacherIds },
        is_deleted: false,
      })
        .populate("class_id", "name section")
        .select("teacher_id class_id")
        .lean();

      const classesByTeacher: Record<string, any[]> = {};
      for (const assign of assignments as any[]) {
        const tid = String(assign.teacher_id);
        if (!classesByTeacher[tid]) {
          classesByTeacher[tid] = [];
        }
        if (assign.class_id) {
          const exists = classesByTeacher[tid].some((c: any) => String(c._id) === String((assign.class_id as any)._id));
          if (!exists) {
            classesByTeacher[tid].push(assign.class_id);
          }
        }
      }

      for (const teacher of teachers as any[]) {
        const assignedClasses = classesByTeacher[String(teacher._id)] ?? [];
        teacher.class_ids = assignedClasses;
        teacher.class_id = assignedClasses.length > 0 ? assignedClasses[0] : null;
      }
    }

    const resultData = { teachers, total, page, limit };
    _teachersServerQueryCache.set(cacheKey, { data: resultData, timestamp: Date.now() });

    return sendConditionalJson(
      req,
      { success: true, data: resultData },
      { cacheControl: "private, max-age=30, stale-while-revalidate=120" }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new teacher
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const body = await req.json();
    const {
      name, employee_id, gender, dob, phone, email, address,
      photo_url, blood_group, qualification, subject_specialization,
      expertise,
      experience_years, join_date, languages, training_details, password,
      class_id, class_ids,
      father_name, mother_name, marital_status, previous_school_name,
      previous_school_address, previous_school_phone, permanent_address,
      pan_number, notes, epf_no, basic_salary, contract_type,
      work_shift, work_location, date_of_leaving, medical_leaves,
      casual_leaves, maternity_leaves, sick_leaves, account_name,
      account_number, bank_name, ifsc_code, branch_name, transport_route,
      transport_vehicle, transport_pickup_point, hostel_name, hostel_room_no,
      facebook_url, instagram_url, linkedin_url, youtube_url, twitter_url,
      resume_url, joining_letter_url,
      aadhaar_front_url, aadhaar_back_url
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });
    }

    if (phone?.trim()) {
      const normalizedPhone = phone.trim();
      const existingPhone = await Teacher.findOne({ phone: normalizedPhone, school_id: schoolId });
      if (existingPhone) {
        return NextResponse.json({ success: false, message: "A teacher with this mobile number already exists in this school" }, { status: 409 });
      }
    }

    // Always generate login email for teacher
    const teacherLoginEmail = generateTeacherLoginEmail(name.trim(), dob);

    // Check if email already exists in User table
    let userId = undefined;
    const existingUser = await User.findOne({ email: teacherLoginEmail, school_id: schoolId });
    if (existingUser) {
      userId = existingUser._id;
    } else {
      // Create user
      const user = await User.create({
        school_id: schoolId as string,
        name: name.trim(),
        email: teacherLoginEmail,
        password_hash: password || "Master#2026", // use provided password or default
        plain_password: password || "Master#2026",
        role: "teacher",
        is_active: true,
        must_change_password: true, // force password change on first login
      });
      userId = user._id;
    }

    // Determine primary class_id and class_ids array
    const resolvedClassIds = Array.isArray(class_ids) ? class_ids : (class_id ? [class_id] : []);
    const resolvedClassId = resolvedClassIds.length > 0 ? resolvedClassIds[0] : undefined;

    const teacher = await Teacher.create({
      school_id: schoolId as string,
      user_id: userId,
      class_id: resolvedClassId,
      class_ids: resolvedClassIds,
      name: name.trim(),
      employee_id: employee_id?.trim(),
      gender,
      dob: dob ? new Date(dob) : undefined,
      phone: phone?.trim(),
      email: email?.trim().toLowerCase() || teacherLoginEmail,
      address: address?.trim(),
      photo_url,
      blood_group: blood_group?.trim(),
      qualification: qualification?.trim(),
      subject_specialization: Array.isArray(expertise) && expertise.length > 0 ? expertise[0] : subject_specialization?.trim(),
      expertise: Array.isArray(expertise) ? expertise : (subject_specialization?.trim() ? [subject_specialization.trim()] : []),
      experience_years: experience_years ? parseInt(experience_years) : 0,
      join_date: join_date ? new Date(join_date) : undefined,
      languages: Array.isArray(languages) ? languages : undefined,
      training_details: Array.isArray(training_details) ? training_details : undefined,
      aadhaar_front_url: aadhaar_front_url?.trim() || undefined,
      aadhaar_back_url: aadhaar_back_url?.trim() || undefined,
      father_name: father_name?.trim(),
      mother_name: mother_name?.trim(),
      marital_status: marital_status?.trim(),
      previous_school_name: previous_school_name?.trim(),
      previous_school_address: previous_school_address?.trim(),
      previous_school_phone: previous_school_phone?.trim(),
      permanent_address: permanent_address?.trim(),
      pan_number: pan_number?.trim(),
      notes: notes?.trim(),
      epf_no: epf_no?.trim(),
      basic_salary: basic_salary ? parseFloat(basic_salary) : 0,
      contract_type: contract_type?.trim(),
      work_shift: work_shift?.trim(),
      work_location: work_location?.trim(),
      date_of_leaving: date_of_leaving ? new Date(date_of_leaving) : undefined,
      medical_leaves: medical_leaves ? parseInt(medical_leaves) : 10,
      casual_leaves: casual_leaves ? parseInt(casual_leaves) : 12,
      maternity_leaves: maternity_leaves ? parseInt(maternity_leaves) : 10,
      sick_leaves: sick_leaves ? parseInt(sick_leaves) : 10,
      account_name: account_name?.trim(),
      account_number: account_number?.trim(),
      bank_name: bank_name?.trim(),
      ifsc_code: ifsc_code?.trim(),
      branch_name: branch_name?.trim(),
      transport_route: transport_route?.trim(),
      transport_vehicle: transport_vehicle?.trim(),
      transport_pickup_point: transport_pickup_point?.trim(),
      hostel_name: hostel_name?.trim(),
      hostel_room_no: hostel_room_no?.trim(),
      facebook_url: facebook_url?.trim(),
      instagram_url: instagram_url?.trim(),
      linkedin_url: linkedin_url?.trim(),
      youtube_url: youtube_url?.trim(),
      twitter_url: twitter_url?.trim(),
      resume_url: resume_url?.trim(),
      joining_letter_url: joining_letter_url?.trim(),
    });

    if (resolvedClassId) {
      await mongoose.model("Class").findOneAndUpdate(
        { _id: resolvedClassId, school_id: schoolId },
        { class_teacher_id: teacher._id }
      );
    }

    invalidateTeachersServerCache();

    return NextResponse.json(
      {
        success: true,
        data: teacher,
        credentials: {
          loginId: teacherLoginEmail,
          password: password || "Master#2026",
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "A teacher with this Employee ID already exists in this school" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
