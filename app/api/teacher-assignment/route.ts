import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { TeacherAssignment, Class, SubjectMaster } from "@/lib/models/index";
import Stream from "@/lib/models/Stream";
import Teacher from "@/lib/models/Teacher";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { sendCompressedJson } from "@/lib/compression";

// Ensure all models are registered in Mongoose
const registerModels = () => {
  return [Class.modelName, Stream.modelName, Teacher.modelName, User.modelName];
};

let _indexesMigrated = false;

// ─── In-memory GET cache & In-flight dedup ────────────────────────
const g = globalThis as any;
if (!g._taCache) g._taCache = new Map<string, { data: any; expiresAt: number }>();
if (!g._taInFlight) g._taInFlight = new Map<string, Promise<any>>();

const _taCache: Map<string, { data: any; expiresAt: number }> = g._taCache;
const _taInFlight: Map<string, Promise<any>> = g._taInFlight;
const TA_CACHE_TTL = 30_000; // 30 seconds

function invalidateTaCache(schoolId?: string, teacherId?: string) {
  if (!schoolId && !teacherId) {
    _taCache.clear();
    return;
  }
  for (const key of Array.from(_taCache.keys())) {
    if ((schoolId && key.includes(schoolId)) || (teacherId && key.includes(teacherId))) {
      _taCache.delete(key);
    }
  }
}
export { invalidateTaCache };

// GET — list teacher assignments (DB-level lookup, search, sort, and pagination)
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "accountant", "super_admin"]);
  if (error) return error;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const academic_year = url.searchParams.get("academic_year") || "";
  const class_id = url.searchParams.get("class_id") || "";
  const subject_id = url.searchParams.get("subject_id") || "";
  const teacher_id = url.searchParams.get("teacher_id") || "";
  const status = url.searchParams.get("status") || "";
  const assignment_type = url.searchParams.get("assignment_type") || "";
  const sort = url.searchParams.get("sort") || "CreatedDateDesc";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limitParam = url.searchParams.get("limit");
  const isAll = limitParam === "all" || (limitParam && parseInt(limitParam) >= 500);
  const limit = isAll ? 100000 : Math.min(500, Math.max(1, parseInt(limitParam || "10")));
  const skip = isAll ? 0 : (page - 1) * limit;

  // ─── Cache check ────────────────────────────────────────
  const cacheKey = `${schoolId}:${teacher_id}:${class_id}:${subject_id}:${academic_year}:${assignment_type}:${status}:${sort}:${page}:${limitParam}:${search}`;
  const cached = _taCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return sendCompressedJson(req, cached.data, { cacheControl: "private, max-age=15, stale-while-revalidate=30" });
  }

  // Deduplicate concurrent in-flight requests
  if (_taInFlight.has(cacheKey)) {
    try {
      const data = await _taInFlight.get(cacheKey)!;
      return sendCompressedJson(req, data, { cacheControl: "private, max-age=15, stale-while-revalidate=30" });
    } catch {
      // Fall through to retry
    }
  }

  const queryPromise = (async () => {
    await connectToDatabase();
    registerModels();

    // Match school_id & basic filters (non-deleted only)
    const matchStage: any = { 
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      is_deleted: { $ne: true }
    };
    if (academic_year) matchStage.academic_year = academic_year;
    if (class_id && mongoose.Types.ObjectId.isValid(class_id)) {
      matchStage.class_id = new mongoose.Types.ObjectId(class_id as string);
    }
    if (subject_id && mongoose.Types.ObjectId.isValid(subject_id)) {
      matchStage.subject_master_id = new mongoose.Types.ObjectId(subject_id as string);
    }
    if (teacher_id && mongoose.Types.ObjectId.isValid(teacher_id)) {
      matchStage.teacher_id = new mongoose.Types.ObjectId(teacher_id as string);
    }
    if (assignment_type) {
      matchStage.assignment_type = assignment_type;
    }
    if (status && status !== "all") {
      matchStage.status = status;
    }

    // Fast indexed path when no cross-table search or cross-table sort is needed
    if (!search && !sort.includes("Teacher") && !sort.includes("Class") && !sort.includes("Subject")) {
      let sortStage: any = { createdAt: -1 };
      if (sort === "TypeAsc") sortStage = { assignment_type: 1 };
      else if (sort === "TypeDesc") sortStage = { assignment_type: -1 };
      else if (sort === "CreatedDateAsc") sortStage = { createdAt: 1 };
      else if (sort === "CreatedDateDesc") sortStage = { createdAt: -1 };
      else if (sort === "StatusAsc") sortStage = { status: 1 };
      else if (sort === "StatusDesc") sortStage = { status: -1 };

      const [total, rawAssignments] = await Promise.all([
        TeacherAssignment.countDocuments(matchStage),
        TeacherAssignment.find(matchStage)
          .sort(sortStage)
          .skip(skip)
          .limit(limit)
          .populate("class_id", "name section class_code")
          .populate("subject_master_id", "name subject_code description")
          .populate("teacher_id", "name employee_id photo_url designation is_active")
          .populate("created_by", "name")
          .lean()
      ]);

      const assignments = rawAssignments.map((a: any) => ({
        _id: String(a._id),
        school_id: String(a.school_id),
        academic_year: a.academic_year,
        class_id: a.class_id && typeof a.class_id === "object" ? {
          _id: String(a.class_id._id),
          name: a.class_id.name,
          section: a.class_id.section,
          class_code: a.class_id.class_code
        } : null,
        stream_id: a.stream_id ? String(a.stream_id) : null,
        subject_master_id: a.subject_master_id && typeof a.subject_master_id === "object" ? {
          _id: String(a.subject_master_id._id),
          name: a.subject_master_id.name,
          subject_code: a.subject_master_id.subject_code,
          description: a.subject_master_id.description
        } : null,
        teacher_id: a.teacher_id && typeof a.teacher_id === "object" ? {
          _id: String(a.teacher_id._id),
          name: a.teacher_id.name,
          employee_id: a.teacher_id.employee_id,
          photo_url: a.teacher_id.photo_url,
          designation: a.teacher_id.designation,
          is_active: a.teacher_id.is_active
        } : null,
        assignment_type: a.assignment_type || "Subject Teacher",
        effective_date: a.effective_date,
        status: a.status || "Active",
        remarks: a.remarks || "",
        weekly_periods: a.weekly_periods || 0,
        created_by: a.created_by && typeof a.created_by === "object" ? {
          _id: String(a.created_by._id),
          name: a.created_by.name
        } : null,
        history: a.history || [],
        createdAt: a.createdAt,
        updatedAt: a.updatedAt
      }));

      const responsePayload = {
        success: true,
        data: {
          assignments,
          total,
          page,
          totalPages: Math.ceil(total / limit)
        }
      };

      _taCache.set(cacheKey, { data: responsePayload, expiresAt: Date.now() + TA_CACHE_TTL });
      return responsePayload;
    }

    const pipeline: any[] = [];
    pipeline.push({ $match: matchStage });

    // Lookup Class info
    pipeline.push(
      {
        $lookup: {
          from: "classes",
          localField: "class_id",
          foreignField: "_id",
          as: "class_info"
        }
      },
      { $unwind: { path: "$class_info", preserveNullAndEmptyArrays: true } }
    );

    // Lookup Subject info
    pipeline.push(
      {
        $lookup: {
          from: "subjectmasters",
          localField: "subject_master_id",
          foreignField: "_id",
          as: "subject_info"
        }
      },
      { $unwind: { path: "$subject_info", preserveNullAndEmptyArrays: true } }
    );

    // Lookup Teacher info
    pipeline.push(
      {
        $lookup: {
          from: "teachers",
          localField: "teacher_id",
          foreignField: "_id",
          as: "teacher_info"
        }
      },
      { $unwind: { path: "$teacher_info", preserveNullAndEmptyArrays: true } }
    );

    // Lookup User info (creator)
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "created_by",
          foreignField: "_id",
          as: "creator_info"
        }
      },
      { $unwind: { path: "$creator_info", preserveNullAndEmptyArrays: true } }
    );

    // Apply Search Filter across looked up name/code/id values
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "subject_info.name": { $regex: search, $options: "i" } },
            { "teacher_info.name": { $regex: search, $options: "i" } },
            { "teacher_info.employee_id": { $regex: search, $options: "i" } },
            { "class_info.name": { $regex: search, $options: "i" } },
            { "class_info.section": { $regex: search, $options: "i" } }
          ]
        }
      });
    }

    // Sort stages
    let sortStage: any = { createdAt: -1 };
    if (sort === "TeacherAsc") sortStage = { "teacher_info.name": 1 };
    else if (sort === "TeacherDesc") sortStage = { "teacher_info.name": -1 };
    else if (sort === "ClassAsc") sortStage = { "class_info.sort_weight": 1, "class_info.section": 1 };
    else if (sort === "ClassDesc") sortStage = { "class_info.sort_weight": -1, "class_info.section": -1 };
    else if (sort === "SubjectAsc") sortStage = { "subject_info.name": 1 };
    else if (sort === "SubjectDesc") sortStage = { "subject_info.name": -1 };
    else if (sort === "TypeAsc") sortStage = { assignment_type: 1 };
    else if (sort === "TypeDesc") sortStage = { assignment_type: -1 };
    else if (sort === "CreatedDateAsc") sortStage = { createdAt: 1 };
    else if (sort === "CreatedDateDesc") sortStage = { createdAt: -1 };
    else if (sort === "StatusAsc") sortStage = { status: 1 };
    else if (sort === "StatusDesc") sortStage = { status: -1 };

    pipeline.push({ $sort: sortStage });

    // Facet for total count + paginated data
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }]
      }
    });

    const result = await TeacherAssignment.aggregate(pipeline);
    const total = result[0]?.metadata[0]?.total || 0;
    const rawAssignments = result[0]?.data || [];

    const assignments = rawAssignments.map((a: any) => ({
      _id: String(a._id),
      school_id: String(a.school_id),
      academic_year: a.academic_year,
      class_id: a.class_info ? {
        _id: String(a.class_info._id),
        name: a.class_info.name,
        section: a.class_info.section,
        class_code: a.class_info.class_code
      } : null,
      stream_id: a.stream_id ? String(a.stream_id) : null,
      subject_master_id: a.subject_info ? {
        _id: String(a.subject_info._id),
        name: a.subject_info.name,
        subject_code: a.subject_info.subject_code,
        description: a.subject_info.description
      } : null,
      teacher_id: a.teacher_info ? {
        _id: String(a.teacher_info._id),
        name: a.teacher_info.name,
        employee_id: a.teacher_info.employee_id,
        photo_url: a.teacher_info.photo_url,
        designation: a.teacher_info.designation,
        is_active: a.teacher_info.is_active
      } : null,
      assignment_type: a.assignment_type || "Subject Teacher",
      effective_date: a.effective_date,
      status: a.status || "Active",
      remarks: a.remarks || "",
      weekly_periods: a.weekly_periods || 0,
      created_by: a.creator_info ? {
        _id: String(a.creator_info._id),
        name: a.creator_info.name
      } : null,
      history: a.history || [],
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }));

    const responsePayload = {
      success: true,
      data: {
        assignments,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    };

    // Cache the result
    _taCache.set(cacheKey, { data: responsePayload, expiresAt: Date.now() + TA_CACHE_TTL });

    return responsePayload;
  })();

  _taInFlight.set(cacheKey, queryPromise);

  try {
    const responsePayload = await queryPromise;
    return sendCompressedJson(req, responsePayload, { cacheControl: "private, max-age=15, stale-while-revalidate=30" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  } finally {
    _taInFlight.delete(cacheKey);
  }
}

// POST — create teacher assignments with multiple subjects support & duplicate checks
export async function POST(req: NextRequest) {
  const authResult = requireAuth(req, ["school_admin", "super_admin"]);
  if (authResult.error) return authResult.error;
  const { schoolId, user } = authResult;

  try {
    await connectToDatabase();
    registerModels();

    const body = await req.json();
    const { 
      academic_year, 
      teacher_id, 
      class_id, 
      stream_id, 
      subject_master_id, 
      subject_master_ids, 
      assignment_type, 
      effective_date, 
      status, 
      remarks 
    } = body;

    const isClassRole = assignment_type === "Class Teacher" || assignment_type === "Co-Class Teacher";

    if (!academic_year?.trim() || !teacher_id || !class_id) {
      return NextResponse.json(
        { success: false, message: "Academic Year, Teacher, and Class are required." },
        { status: 400 }
      );
    }

    if (!isClassRole && !subject_master_id && !subject_master_ids) {
      return NextResponse.json(
        { success: false, message: "Academic Year, Teacher, Class, and at least one Subject are required." },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(teacher_id) || !mongoose.Types.ObjectId.isValid(class_id)) {
      return NextResponse.json({ success: false, message: "Invalid IDs" }, { status: 400 });
    }

    const cls = await Class.findOne({ _id: class_id, school_id: schoolId });
    if (!cls) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
    }

    if (isClassRole) {
      // 1. Same Class Section check (At most one active Class Teacher)
      if (assignment_type === "Class Teacher") {
        const existingClassTeacher = await TeacherAssignment.findOne({
          school_id: schoolId,
          academic_year: academic_year.trim(),
          class_id,
          assignment_type: "Class Teacher",
          is_deleted: { $ne: true }
        }).populate("teacher_id", "name");

        if (existingClassTeacher) {
          return NextResponse.json(
            { success: false, message: `This class section already has an active Class Teacher: ${(existingClassTeacher.teacher_id as any)?.name || "Assigned"}` },
            { status: 409 }
          );
        }

        // 2. One Class Teacher per teacher check (Teacher cannot be Class Teacher of multiple classes)
        const teacherAssignedElsewhere = await TeacherAssignment.findOne({
          school_id: schoolId,
          academic_year: academic_year.trim(),
          teacher_id,
          assignment_type: "Class Teacher",
          is_deleted: { $ne: true }
        }).populate("class_id", "name section");

        if (teacherAssignedElsewhere) {
          return NextResponse.json(
            { success: false, message: `This teacher is already assigned as Class Teacher for ${(teacherAssignedElsewhere.class_id as any)?.name || "another class"} ${(teacherAssignedElsewhere.class_id as any)?.section ? `- ${(teacherAssignedElsewhere.class_id as any).section}` : ""}.` },
            { status: 409 }
          );
        }
      }

      if (assignment_type === "Co-Class Teacher") {
        const existingCoTeacher = await TeacherAssignment.findOne({
          school_id: schoolId,
          academic_year: academic_year.trim(),
          class_id,
          teacher_id,
          assignment_type: "Co-Class Teacher",
          is_deleted: { $ne: true }
        });

        if (existingCoTeacher) {
          return NextResponse.json(
            { success: false, message: "This teacher is already assigned as Co-Class Teacher for this class section." },
            { status: 409 }
          );
        }
      }

      // Create Class/Co-Class assignment
      const newAssignment = await TeacherAssignment.create({
        school_id: new mongoose.Types.ObjectId(schoolId as string),
        academic_year: academic_year.trim(),
        teacher_id: new mongoose.Types.ObjectId(teacher_id as string),
        class_id: new mongoose.Types.ObjectId(class_id as string),
        stream_id: stream_id ? new mongoose.Types.ObjectId(stream_id as string) : undefined,
        subject_master_id: null,
        assignment_type: assignment_type,
        effective_date: effective_date ? new Date(effective_date) : new Date(),
        status: status || "Active",
        remarks: remarks || "",
        is_deleted: false,
        created_by: new mongoose.Types.ObjectId(user.user_id as string),
        history: [{
          action: "Create",
          changes: `Initial assignment created for role: ${assignment_type}`,
          updated_by: new mongoose.Types.ObjectId(user.user_id as string),
          date: new Date(),
          remarks: remarks || "Created."
        }]
      });

      // Synchronize class_teacher_id in the Class collection for Class Teacher roles
      if (assignment_type === "Class Teacher" && status !== "Inactive") {
        await Class.findOneAndUpdate(
          { _id: class_id, school_id: schoolId },
          { class_teacher_id: new mongoose.Types.ObjectId(teacher_id as string) }
        );
      }

      invalidateTaCache(schoolId as string);
      return NextResponse.json({ success: true, count: 1, data: [newAssignment] }, { status: 201 });
    }

    const targetSubjectIds: string[] = [];
    if (Array.isArray(subject_master_ids)) {
      targetSubjectIds.push(...subject_master_ids);
    } else if (subject_master_id) {
      targetSubjectIds.push(subject_master_id);
    }

    const createdAssignments: any[] = [];
    for (const subId of targetSubjectIds) {
      if (!mongoose.Types.ObjectId.isValid(subId)) continue;
      const subject = await SubjectMaster.findOne({ _id: subId, school_id: schoolId }).lean();
      if (!subject) continue;

      // Check duplicate assignment (prevent only exact duplicates)
      const duplicate = await TeacherAssignment.findOne({
        school_id: schoolId,
        academic_year: academic_year.trim(),
        class_id,
        subject_master_id: subId,
        teacher_id,
        is_deleted: { $ne: true }
      }).populate("teacher_id", "name");

      if (duplicate) {
        if (targetSubjectIds.length === 1) {
          return NextResponse.json(
            { success: false, message: `This subject "${subject.name}" is already assigned to ${(duplicate.teacher_id as any)?.name || "this teacher"} in this class for the selected year.` },
            { status: 409 }
          );
        }
        continue;
      }

      const newAssignment = await TeacherAssignment.create({
        school_id: new mongoose.Types.ObjectId(schoolId as string),
        academic_year: academic_year.trim(),
        teacher_id: new mongoose.Types.ObjectId(teacher_id as string),
        class_id: new mongoose.Types.ObjectId(class_id as string),
        stream_id: stream_id ? new mongoose.Types.ObjectId(stream_id as string) : undefined,
        subject_master_id: new mongoose.Types.ObjectId(subId as string),
        assignment_type: assignment_type || "Subject Teacher",
        effective_date: effective_date ? new Date(effective_date) : new Date(),
        status: status || "Active",
        remarks: remarks || "",
        is_deleted: false,
        created_by: new mongoose.Types.ObjectId(user.user_id as string),
        history: [{
          action: "Create",
          changes: `Initial assignment created for Subject ID: ${subId}`,
          updated_by: new mongoose.Types.ObjectId(user.user_id as string),
          date: new Date(),
          remarks: remarks || "Created."
        }]
      });
      createdAssignments.push(newAssignment);
    }

    invalidateTaCache(schoolId as string);
    return NextResponse.json({ success: true, count: createdAssignments.length, data: createdAssignments }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
