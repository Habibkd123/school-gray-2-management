import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { SubjectAssignment, SubjectMaster, TeacherAssignment } from "@/lib/models/index";
import Class from "@/lib/models/Class";
import Stream from "@/lib/models/Stream";
import Teacher from "@/lib/models/Teacher";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// Ensure all models are registered in Mongoose
const registerModels = () => {
  return [Class.modelName, Stream.modelName, Teacher.modelName, User.modelName, TeacherAssignment.modelName];
};

// GET — list subject assignments (DB-level lookup, search, sort, and pagination)
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "accountant", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    registerModels();

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const academic_year = url.searchParams.get("academic_year") || "";
    const class_id = url.searchParams.get("class_id") || "";
    const subject_id = url.searchParams.get("subject_id") || "";
    const teacher_id = url.searchParams.get("teacher_id") || "";
    const status = url.searchParams.get("status") || "";
    const sort = url.searchParams.get("sort") || "CreatedDateDesc";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limitParam = url.searchParams.get("limit");
    const isAll = limitParam === "all";
    const limit = isAll ? 100000 : Math.min(500, Math.max(1, parseInt(limitParam || "10")));
    const skip = isAll ? 0 : (page - 1) * limit;

    const pipeline: any[] = [];

    // Match initial school_id & basic filters
    const matchStage: any = { school_id: new mongoose.Types.ObjectId(schoolId as string) };
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
    if (status && status !== "all") {
      matchStage.status = status;
    }

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

    // Apply Search Filter across looked up name/code values
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "subject_info.name": { $regex: search, $options: "i" } },
            { "subject_info.subject_code": { $regex: search, $options: "i" } },
            { "teacher_info.name": { $regex: search, $options: "i" } },
            { "class_info.name": { $regex: search, $options: "i" } }
          ]
        }
      });
    }

    // Sort stages
    let sortStage: any = { createdAt: -1 };
    if (sort === "SubjectAsc") sortStage = { "subject_info.name": 1 };
    else if (sort === "SubjectDesc") sortStage = { "subject_info.name": -1 };
    else if (sort === "TeacherAsc") sortStage = { "teacher_info.name": 1 };
    else if (sort === "TeacherDesc") sortStage = { "teacher_info.name": -1 };
    else if (sort === "ClassAsc") sortStage = { "class_info.sort_weight": 1, "class_info.section": 1 };
    else if (sort === "ClassDesc") sortStage = { "class_info.sort_weight": -1, "class_info.section": -1 };
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

    const result = await SubjectAssignment.aggregate(pipeline);
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
        employee_id: a.teacher_info.employee_id
      } : null,
      weekly_periods: a.weekly_periods || 0,
      description: a.description || "",
      status: a.status || "Active",
      created_by: a.creator_info ? {
        _id: String(a.creator_info._id),
        name: a.creator_info.name
      } : null,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: {
        assignments,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

// POST — create subject assignment with teacher assignment synchronization
export async function POST(req: NextRequest) {
  const authResult = requireAuth(req, ["school_admin", "super_admin"]);
  if (authResult.error) return authResult.error;
  const { schoolId, user } = authResult;

  try {
    await connectToDatabase();
    registerModels();

    const body = await req.json();
    const { academic_year, class_id, stream_id, subject_master_id, subject_master_ids, teacher_id, weekly_periods, description, status } = body;

    if (!academic_year?.trim() || !class_id) {
      return NextResponse.json(
        { success: false, message: "Academic Year and Class are required." },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(class_id)) {
      return NextResponse.json({ success: false, message: "Invalid Class ID" }, { status: 400 });
    }
    const cls = await Class.findOne({ _id: class_id, school_id: schoolId }).lean();
    if (!cls) return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });

    const targetSubjectIds: string[] = [];
    if (Array.isArray(subject_master_ids)) {
      targetSubjectIds.push(...subject_master_ids);
    } else if (subject_master_id) {
      targetSubjectIds.push(subject_master_id);
    }

    if (targetSubjectIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one Subject is required." },
        { status: 400 }
      );
    }

    const createdAssignments: any[] = [];
    for (const subId of targetSubjectIds) {
      if (!mongoose.Types.ObjectId.isValid(subId)) continue;
      const subject = await SubjectMaster.findOne({ _id: subId, school_id: schoolId }).lean();
      if (!subject) continue;

      // Check if duplicate assignment exists
      const duplicate = await SubjectAssignment.findOne({
        school_id: schoolId,
        academic_year: academic_year.trim(),
        class_id,
        subject_master_id: subId
      });

      if (duplicate) {
        if (targetSubjectIds.length === 1) {
          return NextResponse.json(
            { success: false, message: `The subject "${subject.name}" is already assigned to this class for the selected year.` },
            { status: 409 }
          );
        }
        continue;
      }

      const newAssignment = await SubjectAssignment.create({
        school_id: new mongoose.Types.ObjectId(schoolId as string),
        academic_year: academic_year.trim(),
        class_id: new mongoose.Types.ObjectId(class_id as string),
        stream_id: stream_id ? new mongoose.Types.ObjectId(stream_id as string) : undefined,
        subject_master_id: new mongoose.Types.ObjectId(subId as string),
        teacher_id: teacher_id ? new mongoose.Types.ObjectId(teacher_id as string) : undefined,
        weekly_periods: weekly_periods ? parseInt(weekly_periods, 10) : 0,
        description: description || "",
        status: status || "Active",
        created_by: new mongoose.Types.ObjectId(user.user_id as string)
      });
      createdAssignments.push(newAssignment);

      // Sync with TeacherAssignment
      if (teacher_id) {
        await TeacherAssignment.findOneAndUpdate(
          {
            school_id: new mongoose.Types.ObjectId(schoolId as string),
            academic_year: academic_year.trim(),
            class_id: new mongoose.Types.ObjectId(class_id as string),
            subject_master_id: new mongoose.Types.ObjectId(subId as string)
          },
          {
            teacher_id: new mongoose.Types.ObjectId(teacher_id as string)
          },
          { upsert: true, new: true }
        );
      }
    }

    return NextResponse.json({ success: true, count: createdAssignments.length, data: createdAssignments }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
