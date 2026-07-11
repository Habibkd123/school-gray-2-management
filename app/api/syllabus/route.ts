import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Syllabus, TeacherAssignment, Student, Teacher } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// GET: fetch syllabi list or single syllabus with advanced filters & role restrictions
export async function GET(req: NextRequest) {
  const { schoolId, user, error } = requireAuth(req, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);

    // Advanced search parameters
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || ""; // Draft, Published, Archived, all
    const academic_year = url.searchParams.get("academic_year") || "";
    const class_id = url.searchParams.get("class_id") || "";
    const section_id = url.searchParams.get("section_id") || "";
    const stream_id = url.searchParams.get("stream_id") || "";
    const subject_master_id = url.searchParams.get("subject_master_id") || "";
    const teacher_id = url.searchParams.get("teacher_id") || "";
    const teacher_assignment_id = url.searchParams.get("teacher_assignment_id") || "";

    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limitParam = url.searchParams.get("limit");
    const isAll = limitParam === "all";
    const limit = isAll ? 100000 : parseInt(limitParam || "10", 10);
    const skip = isAll ? 0 : (page - 1) * limit;

    const query: any = { school_id: new mongoose.Types.ObjectId(schoolId!) };

    // Enforce role visibility limits
    if (user.role === "student") {
      const studentProfile = await Student.findOne({ 
        user_id: user.user_id ? new mongoose.Types.ObjectId(user.user_id) : undefined, 
        school_id: new mongoose.Types.ObjectId(schoolId!) 
      }).lean();
      if (!studentProfile) {
        return NextResponse.json({ success: false, message: "Student profile not found." }, { status: 404 });
      }
      query.class_id = studentProfile.class_id;
      // Students should only see Published syllabus
      query.status = "Published";
    } else if (user.role === "parent") {
      // Parents see what their children see
      const parentProfile = await Student.findOne({ 
        parent_id: user.user_id ? new mongoose.Types.ObjectId(user.user_id) : undefined, 
        school_id: new mongoose.Types.ObjectId(schoolId!) 
      }).lean();
      if (!parentProfile) {
        return NextResponse.json({ success: false, message: "Associated student profile not found." }, { status: 404 });
      }
      query.class_id = parentProfile.class_id;
      query.status = "Published";
    }

    // Helper: Legacy compatibility lookup via teacher_assignment_id
    if (teacher_assignment_id && mongoose.Types.ObjectId.isValid(teacher_assignment_id)) {
      const assignment = await TeacherAssignment.findOne({ _id: teacher_assignment_id, school_id: schoolId! }).lean();
      if (assignment) {
        if (assignment.class_id) query.class_id = assignment.class_id;
        if (assignment.section_id) query.section_id = assignment.section_id;
        if (assignment.stream_id) query.stream_id = assignment.stream_id;
        if (assignment.subject_master_id) query.subject_master_id = assignment.subject_master_id;
        if (assignment.academic_year) query.academic_year = assignment.academic_year;
      } else {
        return NextResponse.json({ success: true, data: { chapters: [] } });
      }
    }

    // Apply explicit query filters
    if (academic_year) query.academic_year = academic_year;
    if (class_id && mongoose.Types.ObjectId.isValid(class_id) && user.role !== "student" && user.role !== "parent") {
      query.class_id = new mongoose.Types.ObjectId(class_id);
    }
    if (section_id && mongoose.Types.ObjectId.isValid(section_id) && user.role !== "student" && user.role !== "parent") {
      query.section_id = new mongoose.Types.ObjectId(section_id);
    }
    if (stream_id && mongoose.Types.ObjectId.isValid(stream_id) && user.role !== "student" && user.role !== "parent") {
      query.stream_id = new mongoose.Types.ObjectId(stream_id);
    }
    if (subject_master_id && mongoose.Types.ObjectId.isValid(subject_master_id)) {
      query.subject_master_id = new mongoose.Types.ObjectId(subject_master_id);
    }
    if (teacher_id && mongoose.Types.ObjectId.isValid(teacher_id)) {
      query.teacher_id = new mongoose.Types.ObjectId(teacher_id);
    }
    if (status && status !== "all") {
      query.status = status;
    }

    // Build lookup & aggregation pipeline to resolve references
    const pipeline: any[] = [{ $match: query }];

    // Filter text search matching Title, Description or inner elements
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { "nodes.title": searchRegex },
            { "nodes.description": searchRegex }
          ]
        }
      });
    }

    // Resolve population references
    pipeline.push(
      {
        $lookup: {
          from: "classes",
          localField: "class_id",
          foreignField: "_id",
          as: "class_info"
        }
      },
      { $unwind: { path: "$class_info", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "sections",
          localField: "section_id",
          foreignField: "_id",
          as: "section_info"
        }
      },
      { $unwind: { path: "$section_info", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "streams",
          localField: "stream_id",
          foreignField: "_id",
          as: "stream_info"
        }
      },
      { $unwind: { path: "$stream_info", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "subjectmasters",
          localField: "subject_master_id",
          foreignField: "_id",
          as: "subject_info"
        }
      },
      { $unwind: { path: "$subject_info", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "teachers",
          localField: "teacher_id",
          foreignField: "_id",
          as: "teacher_info"
        }
      },
      { $unwind: { path: "$teacher_info", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "updated_by",
          foreignField: "_id",
          as: "updater_info"
        }
      },
      { $unwind: { path: "$updater_info", preserveNullAndEmptyArrays: true } }
    );

    // Apply paging
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $sort: { updatedAt: -1 } }, { $skip: skip }, { $limit: limit }]
      }
    });

    const result = await Syllabus.aggregate(pipeline);
    const total = result[0]?.metadata[0]?.total || 0;
    const rawSyllabi = result[0]?.data || [];

    const syllabi = rawSyllabi.map((s: any) => ({
      _id: String(s._id),
      school_id: String(s.school_id),
      academic_year: s.academic_year,
      class_id: s.class_info ? { _id: String(s.class_info._id), name: s.class_info.name, section: s.class_info.section } : null,
      section_id: s.section_info ? { _id: String(s.section_info._id), name: s.section_info.name } : null,
      stream_id: s.stream_info ? { _id: String(s.stream_info._id), name: s.stream_info.name } : null,
      subject_master_id: s.subject_info ? { _id: String(s.subject_info._id), name: s.subject_info.name, subject_code: s.subject_info.subject_code, description: s.subject_info.description } : null,
      teacher_id: s.teacher_info ? { _id: String(s.teacher_info._id), name: s.teacher_info.name, employee_id: s.teacher_info.employee_id, designation: s.teacher_info.designation, photo_url: s.teacher_info.photo_url } : null,
      title: s.title,
      description: s.description || "",
      version: s.version || 1,
      status: s.status || "Draft",
      publish_date: s.publish_date,
      visibility: s.visibility || "Public",
      attachments: s.attachments || [],
      reference_links: s.reference_links || [],
      nodes: s.nodes || [],
      history: s.history || [],
      created_by: s.created_by,
      updated_by: s.updater_info ? { _id: String(s.updater_info._id), name: s.updater_info.name } : null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      // Backward compatibility fields for legacy views
      teacher_assignment_id: s._id,
      chapters: (s.nodes || []).map((n: any, idx: number) => ({
        _id: String(idx),
        chapter_no: idx + 1,
        chapter_name: n.title,
        description: n.description || "",
        status: n.resources?.some((r: any) => r.type === "youtube") ? "In Progress" : "Not Started"
      }))
    }));

    // If teacher_assignment_id query fallback is called, return single document formatting
    if (teacher_assignment_id) {
      return NextResponse.json({
        success: true,
        data: syllabi[0] || { teacher_assignment_id, chapters: [] }
      });
    }

    return NextResponse.json({
      success: true,
      data: syllabi,
      total,
      totalPages: Math.ceil(total / limit),
      page
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

// POST: create or update a syllabus
export async function POST(req: NextRequest) {
  const { schoolId, user, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      academic_year,
      class_id,
      section_id,
      stream_id,
      subject_master_id,
      teacher_id,
      title,
      description,
      status,
      visibility,
      attachments,
      reference_links,
      nodes,
      incrementVersion,
      remarks,
      // Legacy params support
      teacher_assignment_id,
      chapters
    } = body;

    // Resolve legacy assignments mapping to new schema properties
    let finalClassId = class_id;
    let finalSubjectId = subject_master_id;
    let finalTeacherId = teacher_id;
    let finalYear = academic_year;
    let finalSectionId = section_id || null;
    let finalStreamId = stream_id || null;
    let finalNodes = nodes || [];

    if (teacher_assignment_id && mongoose.Types.ObjectId.isValid(teacher_assignment_id)) {
      const assignment = await TeacherAssignment.findOne({ _id: teacher_assignment_id, school_id: schoolId }).lean();
      if (!assignment) {
        return NextResponse.json({ success: false, message: "Teacher assignment context not found" }, { status: 404 });
      }
      finalClassId = String(assignment.class_id);
      finalSubjectId = String(assignment.subject_master_id);
      finalTeacherId = String(assignment.teacher_id);
      finalYear = assignment.academic_year;
      finalSectionId = assignment.section_id || null;
      finalStreamId = assignment.stream_id || null;

      // Translate flat chapters to nodes hierarchy
      if (Array.isArray(chapters)) {
        finalNodes = chapters.map((ch: any) => ({
          id: ch._id || new mongoose.Types.ObjectId().toString(),
          title: ch.chapter_name,
          description: ch.description || "",
          type: "chapter",
          children: [],
          resources: ch.status === "Completed" ? [{ title: "Completed Status Mark", type: "link", url: "#" }] : []
        }));
      }
    }

    if (!finalClassId || !finalSubjectId || !finalYear) {
      return NextResponse.json({ success: false, message: "Class, Subject, and Academic Year are required." }, { status: 400 });
    }

    // Role Security: verify teacher assignment matches
    if (user.role === "teacher") {
      const teacherProfile = await Teacher.findOne({ user_id: user.user_id, school_id: schoolId }).lean();
      if (!teacherProfile) {
        return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
      }

      const isAssigned = await TeacherAssignment.exists({
        school_id: schoolId,
        teacher_id: teacherProfile._id,
        class_id: finalClassId,
        subject_master_id: finalSubjectId,
        academic_year: finalYear,
        is_deleted: false
      });

      if (!isAssigned) {
        return NextResponse.json({ success: false, message: "Access Denied: You are not assigned to this class and subject." }, { status: 403 });
      }
      finalTeacherId = String(teacherProfile._id);
    }

    // Check for existing syllabus matching combination
    let syllabusRecord = await Syllabus.findOne({
      school_id: schoolId,
      academic_year: finalYear,
      class_id: finalClassId,
      section_id: finalSectionId,
      subject_master_id: finalSubjectId
    });

    const isPublished = status === "Published";

    if (!syllabusRecord) {
      // Create new syllabus
      syllabusRecord = new Syllabus({
        school_id: schoolId,
        academic_year: finalYear,
        class_id: finalClassId,
        section_id: finalSectionId,
        stream_id: finalStreamId,
        subject_master_id: finalSubjectId,
        teacher_id: finalTeacherId || null,
        title: title || `${finalYear} Syllabus`,
        description: description || "",
        version: 1,
        status: status || "Draft",
        publish_date: isPublished ? new Date() : null,
        visibility: visibility || "Public",
        attachments: attachments || [],
        reference_links: reference_links || [],
        nodes: finalNodes,
        history: [],
        created_by: user.user_id,
        updated_by: user.user_id
      });
      await syllabusRecord.save();
    } else {
      // Update existing syllabus
      if (incrementVersion) {
        // Capture a snapshot of current parameters into history array
        const historySnapshot = {
          version: syllabusRecord.version,
          title: syllabusRecord.title,
          description: syllabusRecord.description,
          status: syllabusRecord.status,
          nodes: syllabusRecord.nodes,
          attachments: syllabusRecord.attachments,
          reference_links: syllabusRecord.reference_links,
          updated_by: new mongoose.Types.ObjectId(user.user_id as string),
          updated_at: new Date(),
          remarks: remarks || `Archived version ${syllabusRecord.version}`
        };

        syllabusRecord.history.push(historySnapshot);
        syllabusRecord.version += 1;
      }

      if (title) syllabusRecord.title = title;
      if (description !== undefined) syllabusRecord.description = description;
      if (status) {
        syllabusRecord.status = status;
        if (isPublished && !syllabusRecord.publish_date) {
          syllabusRecord.publish_date = new Date();
        }
      }
      if (visibility) syllabusRecord.visibility = visibility;
      if (attachments) syllabusRecord.attachments = attachments;
      if (reference_links) syllabusRecord.reference_links = reference_links;
      if (finalNodes) syllabusRecord.nodes = finalNodes;
      if (finalTeacherId) syllabusRecord.teacher_id = new mongoose.Types.ObjectId(finalTeacherId);

      syllabusRecord.updated_by = new mongoose.Types.ObjectId(user.user_id as string);
      await syllabusRecord.save();
    }

    return NextResponse.json({ success: true, data: syllabusRecord });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
