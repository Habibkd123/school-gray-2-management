import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Student from "@/lib/models/Student";
import { Parent } from "@/lib/models";
import User from "@/lib/models/User";
import Class from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";

// ─── Helper: generate student login email ──────────────────────
const SCHOOL_SLUG = process.env.NEXT_PUBLIC_SCHOOL_SLUG || "school";

function generateStudentLoginEmail(name: string, dob?: string): string {
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


// ─── GET /api/students — List all students for the school ──────────
export async function GET(request: NextRequest) {
  const { schoolId, role, userId, error } = requireAuth(request, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("class_id");
    const search = searchParams.get("search");
    const academic_year = searchParams.get("academic_year");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, any> = { school_id: schoolId };

    if (role === "student") {
      filter.user_id = userId;
    } else if (role === "parent") {
      const parentDoc = await Parent.findOne({ user_id: userId, school_id: schoolId }).select("_id").lean();
      if (!parentDoc) {
        return NextResponse.json({
          success: true,
          data: { students: [], total: 0, page, limit },
        });
      }
      filter.parent_id = parentDoc._id;
    } else {
      const parentId = searchParams.get("parent_id");
      if (parentId) filter.parent_id = parentId;
    }

    if (classId && classId !== "all") {
      filter.class_id = classId;
    } else if (academic_year) {
      const classes = await Class.find({ academic_year, school_id: schoolId }).select("_id").lean();
      const classIds = classes.map(c => c._id);
      filter.class_id = { $in: classIds };
    }

    const gender = searchParams.get("gender");
    if (gender && gender !== "all" && gender !== "Select") {
      filter.gender = gender.toLowerCase();
    }

    const streamId = searchParams.get("stream_id");
    if (streamId) {
      filter.stream_id = streamId;
    }

    const sectionId = searchParams.get("section_id");
    if (sectionId) {
      filter.section_id = sectionId;
    }

    const status = searchParams.get("status");
    if (status && status !== "all" && status !== "Select") {
      filter.is_active = status === "Active";
    }

    // Date Range preset filter
    const dateRange = searchParams.get("dateRange");
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
        filter.createdAt = dateFilter;
      }
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { roll_no: { $regex: search, $options: "i" } },
        { admission_no: { $regex: search, $options: "i" } },
      ];
    }

    // Sort mapping
    const sort = searchParams.get("sort") || "Ascending";
    let sortObj: Record<string, any> = { name: 1 };
    if (sort === "Descending") {
      sortObj = { name: -1 };
    } else if (sort === "Recently Added") {
      sortObj = { createdAt: -1 };
    }

    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate({
          path: "class_id",
          select: "name section class_teacher_id",
          populate: {
            path: "class_teacher_id",
            select: "name"
          }
        })
        .populate("user_id", "name email role is_active plain_password must_change_password")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Student.countDocuments(filter),
    ]);

    return NextResponse.json(
      { success: true, data: { students, total, page, limit } },
      { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } }
    );
  } catch (err) {
    console.error("[GET /api/students]", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch students" },
      { status: 500 }
    );
  }
}

// ─── POST /api/students — Create new student ───────────────────────
export async function POST(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();

    const {
      name, email, class_id, roll_no, gender, dob, blood_group,
      address, phone, guardian_name, guardian_phone,
      guardian_relation, guardian_email, admission_no, admission_date,
      academic_year, photo_url, guardian_photo,
      religion, caste, category, mother_tongue, languages,
      prev_school_name, prev_school_address, bank_name, bank_branch,
      bank_ifsc, allergies, medications, medical_notes, house,
      medical_cert, migration_cert, transfer_cert, birth_cert,
      father_name, father_phone, father_email, father_occupation, father_photo,
      mother_name, mother_phone, mother_email, mother_occupation, mother_photo,
      guardian_type, guardian_occupation, guardian_address, permanent_address, other_info,
      aadhaar_no
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "Student name is required" },
        { status: 400 }
      );
    }
    if (!class_id) {
      return NextResponse.json(
        { success: false, message: "Class selection is mandatory" },
        { status: 400 }
      );
    }

    const selectedClass = await Class.findOne({ _id: class_id, school_id: schoolId });
    if (!selectedClass) {
      return NextResponse.json(
        { success: false, message: "Selected class does not exist" },
        { status: 400 }
      );
    }

    const sectionsExistForClass = await Class.exists({
      school_id: schoolId,
      name: { $regex: new RegExp(`^${selectedClass.name}$`, "i") },
      section: { $ne: "" }
    });

    if (sectionsExistForClass && (!selectedClass.section || !selectedClass.section.trim())) {
      return NextResponse.json(
        { success: false, message: "Section selection is mandatory because sections exist for this class" },
        { status: 400 }
      );
    }

    // Require admission number and check for uniqueness
    if (!admission_no || !admission_no.trim()) {
      return NextResponse.json(
        { success: false, message: "Admission number is required" },
        { status: 400 }
      );
    }

    const existingAdmissionNo = await Student.findOne({
      school_id: schoolId,
      admission_no: admission_no.trim()
    });
    if (existingAdmissionNo) {
      return NextResponse.json(
        { success: false, message: "Admission number already exists" },
        { status: 409 }
      );
    }
    const finalAdmissionNo = admission_no.trim();

    // Determine login email for student (always auto-generated in custom format)
    const studentLoginEmail = generateStudentLoginEmail(name.trim(), dob);

    // Check if email already exists in User table
    let userId = undefined;
    {
      const existingUser = await User.findOne({ email: studentLoginEmail, school_id: schoolId });
      if (existingUser) {
        userId = existingUser._id;
      } else {
        // Generate default password based on DOB (DDMMYY format)
        let studentPassword = "student123";
        if (dob) {
          const dateObj = new Date(dob);
          if (!isNaN(dateObj.getTime())) {
            const day = String(dateObj.getDate()).padStart(2, "0");
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const yy = dateObj.getFullYear().toString().slice(-2);
            studentPassword = `${day}${month}${yy}`;
          }
        }

        // Create user account for the student (always created now)
        const user = await User.create({
          school_id: schoolId as string,
          name: name.trim(),
          email: studentLoginEmail,
          password_hash: studentPassword,
          plain_password: studentPassword,
          role: "student",
          is_active: true,
          must_change_password: true,
        });
        userId = user._id;
      }
    }

    // Auto-link or create Parent (and their login User account)
    let parentId = undefined;
    if (guardian_name?.trim()) {
      const existingParent = await Parent.findOne({
        school_id: schoolId,
        name: guardian_name.trim(),
        $or: [
          { phone: guardian_phone?.trim() || "never-match-this" },
          { email: guardian_email?.trim().toLowerCase() || "never-match-this" }
        ]
      });

      if (existingParent) {
        parentId = existingParent._id;
        // Update photo and details if provided and not already set
        let needsSave = false;
        if (guardian_photo && !existingParent.photo_url) {
          existingParent.photo_url = guardian_photo;
          needsSave = true;
        }
        if (guardian_occupation && !existingParent.occupation) {
          existingParent.occupation = guardian_occupation.trim();
          needsSave = true;
        }
        if (guardian_address && !existingParent.address) {
          existingParent.address = guardian_address.trim();
          needsSave = true;
        }
        if (needsSave) {
          await existingParent.save();
        }
      } else {
        // Create a login User account for the parent (if email provided)
        let parentUserId = undefined;
        if (guardian_email?.trim()) {
          const parentEmail = guardian_email.trim().toLowerCase();
          const existingParentUser = await User.findOne({ email: parentEmail, school_id: schoolId });
          if (existingParentUser) {
            // Reuse existing user (e.g. parent has multiple children)
            parentUserId = existingParentUser._id;
          } else {
            const parentUser = await User.create({
              school_id: schoolId as string,
              name: guardian_name.trim(),
              email: parentEmail,
              password_hash: "parent123", // default — admin should share this
              plain_password: "parent123",
              role: "parent",
              is_active: true,
              must_change_password: true, // force password change on first login
            });
            parentUserId = parentUser._id;
          }
        }

        const newParent = await Parent.create({
          school_id: schoolId as string,
          user_id: parentUserId,          // ← link to User account
          name: guardian_name.trim(),
          phone: guardian_phone?.trim(),
          email: guardian_email?.trim().toLowerCase(),
          relation: guardian_relation?.trim(),
          photo_url: guardian_photo,
          occupation: guardian_occupation?.trim(),
          address: guardian_address?.trim(),
          is_active: true,
        });
        parentId = newParent._id;
      }
    }

    const student = await Student.create({
      school_id: schoolId as string,
      user_id: userId,
      parent_id: parentId,
      name: name.trim(),
      email: email?.trim().toLowerCase() || studentLoginEmail,
      class_id,
      roll_no: roll_no?.trim() || undefined,
      gender,
      dob: dob ? new Date(dob) : undefined,
      blood_group,
      address,
      phone,
      aadhaar_no: aadhaar_no?.trim() || undefined,
      guardian_name,
      guardian_phone,
      guardian_relation,
      guardian_email,
      admission_no: finalAdmissionNo,
      academic_year,
      photo_url,
      admission_date: admission_date ? new Date(admission_date) : new Date(),
      is_active: true,
      religion,
      caste,
      category,
      mother_tongue,
      languages,
      prev_school_name,
      prev_school_address,
      bank_name,
      bank_branch,
      bank_ifsc,
      allergies,
      medications,
      medical_notes,
      house,
      medical_cert,
      migration_cert,
      transfer_cert,
      birth_cert,
      father_name: father_name?.trim(),
      father_phone: father_phone?.trim(),
      father_email: father_email?.trim().toLowerCase(),
      father_occupation: father_occupation?.trim(),
      father_photo: father_photo,
      mother_name: mother_name?.trim(),
      mother_phone: mother_phone?.trim(),
      mother_email: mother_email?.trim().toLowerCase(),
      mother_occupation: mother_occupation?.trim(),
      mother_photo: mother_photo,
      guardian_type: guardian_type?.trim(),
      guardian_occupation: guardian_occupation?.trim(),
      guardian_address: guardian_address?.trim(),
      guardian_photo: guardian_photo,
      permanent_address: permanent_address?.trim(),
      other_info: other_info?.trim(),
    });

    const populated = await Student.findById(student._id)
      .populate({
        path: "class_id",
        select: "name section class_teacher_id",
        populate: {
          path: "class_teacher_id",
          select: "name"
        }
      })
      .lean();

    // Generate password format for credentials output display (DDMMYY)
    let studentPassword = "student123";
    if (dob) {
      const dateObj = new Date(dob);
      if (!isNaN(dateObj.getTime())) {
        const day = String(dateObj.getDate()).padStart(2, "0");
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const yy = dateObj.getFullYear().toString().slice(-2);
        studentPassword = `${day}${month}${yy}`;
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Student created successfully",
        data: populated,
        credentials: {
          loginId: studentLoginEmail,
          password: studentPassword,
        }
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[POST /api/students]", err);
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json(
        { success: false, message: "A student with these unique details already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to create student" },
      { status: 500 }
    );
  }
}
