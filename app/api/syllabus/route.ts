import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Syllabus, TeacherAssignment, Student, Teacher } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { sendCompressedJson } from "@/lib/compression";
import { invalidateSyllabusDetailCache } from "./[id]/route";

// ─── Server-side cache ───────────────────────────────────────
const gs = globalThis as any;
if (!gs._syllabusServerCache) gs._syllabusServerCache = new Map<string, { data: any; expiresAt: number }>();
const _cache: Map<string, { data: any; expiresAt: number }> = gs._syllabusServerCache;
if (!gs._syllabusInFlight) gs._syllabusInFlight = new Map<string, Promise<any>>();
const _syllabusInFlight: Map<string, Promise<any>> = gs._syllabusInFlight;
const TTL = 30_000;

export function invalidateSyllabusServerCache(schoolId?: string) {
  if (!schoolId) { _cache.clear(); return; }
  for (const k of Array.from(_cache.keys())) {
    if (k.startsWith(String(schoolId))) _cache.delete(k);
  }
}

// GET: fetch syllabi list or single syllabus with advanced filters & role restrictions
export async function GET(req: NextRequest) {
  const { schoolId, user, error } = requireAuth(req, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    url.searchParams.sort();

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
    const mode = url.searchParams.get("mode") || "";

    const cacheKey = `${schoolId}:${url.searchParams.toString()}`;
    const canCache = user.role !== "student" && user.role !== "parent" && !teacher_assignment_id;
    if (canCache) {
      const cached = _cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return sendCompressedJson(req, cached.data, { cacheControl: "private, max-age=15, stale-while-revalidate=30" });
      }
      const inFlight = _syllabusInFlight.get(cacheKey);
      if (inFlight) {
        try {
          const payload = await inFlight;
          return sendCompressedJson(req, payload, { cacheControl: "private, max-age=15, stale-while-revalidate=30" });
        } catch (err: any) {
          return NextResponse.json({ success: false, message: err.message }, { status: 500 });
        }
      }
    }

    // Fast projected stats query without running heavy 6-collection $lookups
    if (mode === "stats") {
      const statsQuery: any = { school_id: new mongoose.Types.ObjectId(schoolId!) };
      if (academic_year) statsQuery.academic_year = academic_year;
      if (class_id && mongoose.Types.ObjectId.isValid(class_id)) statsQuery.class_id = new mongoose.Types.ObjectId(class_id);

      const records = await Syllabus.find(statsQuery)
        .select("_id class_id section_id stream_id subject_master_id teacher_id status updatedAt nodes")
        .lean();

      const statsData = records.map((s: any) => ({
        _id: String(s._id),
        class_id: s.class_id ? String(s.class_id) : null,
        section_id: s.section_id ? String(s.section_id) : null,
        stream_id: s.stream_id ? String(s.stream_id) : null,
        subject_master_id: s.subject_master_id ? String(s.subject_master_id) : null,
        teacher_id: s.teacher_id ? String(s.teacher_id) : null,
        status: s.status || "Draft",
        updatedAt: s.updatedAt,
        chapters: (s.nodes || []).map((n: any, idx: number) => ({
          _id: String(idx),
          chapter_no: idx + 1,
          chapter_name: n.title,
          status: n.resources?.some((r: any) => r.url && r.url !== "#")
            ? "Completed"
            : (n.children?.length > 0 ? "In Progress" : "Not Started")
        }))
      }));

      const statsResponse = {
        success: true,
        data: statsData,
      };
      if (canCache) {
        _cache.set(cacheKey, { data: statsResponse, expiresAt: Date.now() + TTL });
      }
      return sendCompressedJson(req, statsResponse, { cacheControl: "private, max-age=15, stale-while-revalidate=30" });
    }

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

    // Filter text search matching Title, Description or inner elements
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { "nodes.title": searchRegex },
        { "nodes.description": searchRegex }
      ];
    }

    // Execute syllabus count, populated syllabi, and matching teacher assignments in parallel
    const [total, rawSyllabi, assignments] = await Promise.all([
      Syllabus.countDocuments(query),
      Syllabus.find(query)
        .populate("class_id", "name section")
        .populate("section_id", "name")
        .populate("stream_id", "name")
        .populate("subject_master_id", "name subject_code description")
        .populate("teacher_id", "name employee_id designation photo_url")
        .populate("updated_by", "name")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      (class_id && academic_year && mongoose.Types.ObjectId.isValid(class_id))
        ? TeacherAssignment.find({
            school_id: new mongoose.Types.ObjectId(schoolId!),
            class_id: new mongoose.Types.ObjectId(class_id),
            academic_year,
            status: "Active",
            is_deleted: false
          })
          .populate("class_id", "name section")
          .populate("section_id", "name")
          .populate("stream_id", "name")
          .populate("subject_master_id", "name subject_code description code")
          .populate("teacher_id", "name employee_id designation photo_url")
          .lean()
        : Promise.resolve([])
    ]);

    const syllabi = rawSyllabi.map((s: any) => ({
      _id: String(s._id),
      school_id: String(s.school_id),
      academic_year: s.academic_year,
      class_id: s.class_id ? { _id: String(s.class_id._id || s.class_id), name: s.class_id.name, section: s.class_id.section } : null,
      section_id: s.section_id ? { _id: String(s.section_id._id || s.section_id), name: s.section_id.name } : null,
      stream_id: s.stream_id ? { _id: String(s.stream_id._id || s.stream_id), name: s.stream_id.name } : null,
      subject_master_id: s.subject_master_id ? { _id: String(s.subject_master_id._id || s.subject_master_id), name: s.subject_master_id.name, subject_code: s.subject_master_id.subject_code, description: s.subject_master_id.description } : null,
      teacher_id: s.teacher_id ? { _id: String(s.teacher_id._id || s.teacher_id), name: s.teacher_id.name, employee_id: s.teacher_id.employee_id, designation: s.teacher_id.designation, photo_url: s.teacher_id.photo_url } : null,
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
      updated_by: s.updated_by ? { _id: String(s.updated_by._id || s.updated_by), name: s.updated_by.name } : null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      // Backward compatibility fields for legacy views
      teacher_assignment_id: String(s._id),
      chapters: (s.nodes || []).map((n: any, idx: number) => ({
        _id: String(idx),
        chapter_no: idx + 1,
        chapter_name: n.title,
        description: n.description || "",
        status:
          n.resources?.some((r: any) => r.url && r.url !== "#")
            ? "Completed"
            : (n.children?.length > 0 ? "In Progress" : "Not Started")
      }))
    }));

    let mergedSyllabi = [...syllabi];

    // If query by class_id and academic_year, check for and merge virtual syllabi for assigned subjects
    if (assignments && assignments.length > 0) {
      assignments.forEach((assignment: any) => {
        if (!assignment.subject_master_id) return;
        const subjectIdStr = String(assignment.subject_master_id._id || assignment.subject_master_id);
        
        const exists = mergedSyllabi.some(
          (s: any) => String(s.subject_master_id?._id || s.subject_master_id) === subjectIdStr
        );

        if (!exists) {
          const virtualSyllabus = {
            _id: String(assignment._id),
            school_id: String(schoolId),
            academic_year: assignment.academic_year,
            class_id: assignment.class_id ? { _id: String(assignment.class_id._id), name: assignment.class_id.name, section: assignment.class_id.section } : null,
            section_id: assignment.section_id ? { _id: String(assignment.section_id._id), name: assignment.section_id.name } : null,
            stream_id: assignment.stream_id ? { _id: String(assignment.stream_id._id), name: assignment.stream_id.name } : null,
            subject_master_id: assignment.subject_master_id ? { 
              _id: String(assignment.subject_master_id._id), 
              name: assignment.subject_master_id.name, 
              subject_code: assignment.subject_master_id.subject_code || assignment.subject_master_id.code || "—", 
              description: assignment.subject_master_id.description || "" 
            } : null,
            teacher_id: assignment.teacher_id ? { _id: String(assignment.teacher_id._id), name: assignment.teacher_id.name, employee_id: assignment.teacher_id.employee_id, designation: assignment.teacher_id.designation, photo_url: assignment.teacher_id.photo_url } : null,
            title: `${assignment.academic_year} Syllabus`,
            description: "",
            version: 1,
            status: "Draft",
            publish_date: null,
            visibility: "Public",
            attachments: [],
            reference_links: [],
            nodes: [],
            history: [],
            created_by: null,
            updated_by: null,
            createdAt: assignment.createdAt,
            updatedAt: assignment.updatedAt,
            teacher_assignment_id: String(assignment._id),
            chapters: [],
            isVirtual: true
          };
          mergedSyllabi.push(virtualSyllabus);
        }
      });
    }



    // If teacher_assignment_id query fallback is called, return single document formatting
    if (teacher_assignment_id) {
      return NextResponse.json({
        success: true,
        data: mergedSyllabi[0] || { teacher_assignment_id, chapters: [] }
      });
    }

    const finalTotal = (class_id && academic_year) ? mergedSyllabi.length : total;
    const responseData = {
      success: true,
      data: mergedSyllabi,
      total: finalTotal,
      totalPages: (class_id && academic_year) ? Math.ceil(finalTotal / limit) : Math.ceil(total / limit),
      page
    };
    if (canCache) {
      _cache.set(cacheKey, { data: responseData, expiresAt: Date.now() + TTL });
    }
    return sendCompressedJson(req, responseData, { cacheControl: "private, max-age=15, stale-while-revalidate=30" });
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

    invalidateSyllabusServerCache(schoolId || undefined);
    invalidateSyllabusDetailCache(String(syllabusRecord._id), schoolId || undefined);
    return NextResponse.json({ success: true, data: syllabusRecord });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
