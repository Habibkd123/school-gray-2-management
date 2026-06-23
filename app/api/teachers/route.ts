import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Teacher from "@/lib/models/Teacher";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";
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
  return `${firstName}${dobDay}.${slug}@gmail.com`;
}

// GET: Fetch all teachers for the logged-in user's school
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    // Optional query params
    const url = new URL(req.url);
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const query: any = { school_id: schoolId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { employee_id: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { subject_specialization: { $regex: search, $options: "i" } },
      ];
    }

    const status = url.searchParams.get("status");
    if (status && status !== "all" && status !== "Select") {
      query.is_active = status.toLowerCase() === "active";
    }

    // Date Range preset filter
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
        query.createdAt = dateFilter;
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

    const [teachers, total] = await Promise.all([
      Teacher.find(query)
        .populate("user_id", "name email role is_active plain_password")
        .populate("class_id", "name section")
        .populate("class_ids", "name section")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Teacher.countDocuments(query),
    ]);

    return NextResponse.json(
      { success: true, data: { teachers, total, page, limit } },
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } }
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
      experience_years, join_date, languages, password, class_id, class_ids,
      father_name, mother_name, marital_status, previous_school_name,
      previous_school_address, previous_school_phone, permanent_address,
      pan_number, notes, epf_no, basic_salary, contract_type,
      work_shift, work_location, date_of_leaving, medical_leaves,
      casual_leaves, maternity_leaves, sick_leaves, account_name,
      account_number, bank_name, ifsc_code, branch_name, transport_route,
      transport_vehicle, transport_pickup_point, hostel_name, hostel_room_no,
      facebook_url, instagram_url, linkedin_url, youtube_url, twitter_url,
      resume_url, joining_letter_url
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });
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
        password_hash: password || "password123", // use provided password or default
        plain_password: password || "password123",
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
      subject_specialization: subject_specialization?.trim(),
      experience_years: experience_years ? parseInt(experience_years) : 0,
      join_date: join_date ? new Date(join_date) : undefined,
      languages: Array.isArray(languages) ? languages : undefined,
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

    return NextResponse.json(
      {
        success: true,
        data: teacher,
        credentials: {
          loginId: teacherLoginEmail,
          password: password || "password123",
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
