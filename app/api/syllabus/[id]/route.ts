import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Syllabus, TeacherAssignment, Student, Teacher } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

type RouteParams = { params: Promise<{ id: string }> };

// GET: fetch single syllabus details
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { schoolId, user, error } = requireAuth(req, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid Syllabus ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    
    // Resolve population references
    let syllabus = await Syllabus.findOne({ _id: id, school_id: schoolId })
      .populate("class_id", "name section")
      .populate("section_id", "name")
      .populate("stream_id", "name")
      .populate("subject_master_id", "name subject_code description")
      .populate("teacher_id", "name employee_id designation photo_url")
      .populate("updated_by", "name");

    if (!syllabus) {
      const assignment = (await TeacherAssignment.findOne({ _id: id, school_id: schoolId })
        .populate("class_id", "name section")
        .populate("section_id", "name")
        .populate("stream_id", "name")
        .populate("subject_master_id", "name subject_code description code")
        .populate("teacher_id", "name employee_id designation photo_url")
        .lean()) as any;

      if (assignment) {
        // Find existing syllabus matching the assignment combination
        const existingSyllabus = await Syllabus.findOne({
          school_id: schoolId,
          academic_year: assignment.academic_year,
          class_id: assignment.class_id?._id || assignment.class_id,
          section_id: assignment.section_id?._id || assignment.section_id || null,
          subject_master_id: assignment.subject_master_id?._id || assignment.subject_master_id
        })
        .populate("class_id", "name section")
        .populate("section_id", "name")
        .populate("stream_id", "name")
        .populate("subject_master_id", "name subject_code description")
        .populate("teacher_id", "name employee_id designation photo_url")
        .populate("updated_by", "name");

        if (existingSyllabus) {
          syllabus = existingSyllabus;
        } else {
          // Construct virtual syllabus record
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
            // Backward compatibility
            teacher_assignment_id: String(assignment._id),
            chapters: [],
            isVirtual: true
          };
          return NextResponse.json({ success: true, data: virtualSyllabus });
        }
      } else {
        return NextResponse.json({ success: false, message: "Syllabus not found" }, { status: 404 });
      }
    }

    // Role Security: verify student can only see their own class syllabus
    if (user.role === "student") {
      const studentProfile = await Student.findOne({ user_id: user.user_id, school_id: schoolId }).lean();
      if (!studentProfile || String(studentProfile.class_id) !== String(syllabus.class_id?._id || syllabus.class_id)) {
        return NextResponse.json({ success: false, message: "Access Denied: You can only view syllabus for your assigned class." }, { status: 403 });
      }
      if (syllabus.status !== "Published") {
        return NextResponse.json({ success: false, message: "Access Denied: This syllabus is not yet published." }, { status: 403 });
      }
    } else if (user.role === "parent") {
      const parentProfile = await Student.findOne({ parent_id: user.user_id, school_id: schoolId }).lean();
      if (!parentProfile || String(parentProfile.class_id) !== String(syllabus.class_id?._id || syllabus.class_id)) {
        return NextResponse.json({ success: false, message: "Access Denied: Parents can only view children's class syllabus." }, { status: 403 });
      }
      if (syllabus.status !== "Published") {
        return NextResponse.json({ success: false, message: "Access Denied: This child's syllabus is not published yet." }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, data: syllabus });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// POST: Duplicate a syllabus to another target class
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { schoolId, user, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid Syllabus ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action !== "duplicate") {
      return NextResponse.json({ success: false, message: "Unsupported action parameter" }, { status: 400 });
    }

    const syllabus = await Syllabus.findOne({ _id: id, school_id: schoolId }).lean();
    if (!syllabus) {
      return NextResponse.json({ success: false, message: "Syllabus not found" }, { status: 404 });
    }

    const body = await req.json();
    const { academic_year, class_id, section_id, stream_id, subject_master_id, teacher_id } = body;

    if (!academic_year || !class_id || !subject_master_id) {
      return NextResponse.json({ success: false, message: "Academic Year, Target Class, and Target Subject are required." }, { status: 400 });
    }

    // Role Security: verify teacher assignment matches target
    if (user.role === "teacher") {
      const teacherProfile = await Teacher.findOne({ user_id: user.user_id, school_id: schoolId }).lean();
      if (!teacherProfile) {
        return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
      }

      const isAssigned = await TeacherAssignment.exists({
        school_id: schoolId,
        teacher_id: teacherProfile._id,
        class_id,
        subject_master_id,
        academic_year,
        is_deleted: false
      });

      if (!isAssigned) {
        return NextResponse.json({ success: false, message: "Access Denied: You cannot duplicate a syllabus to a class/subject you do not teach." }, { status: 403 });
      }
    }

    // Check if duplicate target combination already exists
    const duplicateExists = await Syllabus.exists({
      school_id: schoolId,
      academic_year,
      class_id,
      section_id: section_id || null,
      subject_master_id
    });

    if (duplicateExists) {
      return NextResponse.json({ success: false, message: "Syllabus already exists for the selected target combination." }, { status: 400 });
    }

    // Create duplicated copy
    const duplicatedSyllabus = new Syllabus({
      ...syllabus,
      _id: new mongoose.Types.ObjectId(),
      academic_year,
      class_id: new mongoose.Types.ObjectId(class_id),
      section_id: section_id ? new mongoose.Types.ObjectId(section_id) : null,
      stream_id: stream_id ? new mongoose.Types.ObjectId(stream_id) : null,
      subject_master_id: new mongoose.Types.ObjectId(subject_master_id),
      teacher_id: teacher_id ? new mongoose.Types.ObjectId(teacher_id) : null,
      title: `${syllabus.title} (Copy)`,
      status: "Draft",
      publish_date: null,
      version: 1,
      history: [],
      created_by: new mongoose.Types.ObjectId(user.user_id as string),
      updated_by: new mongoose.Types.ObjectId(user.user_id as string)
    });

    await duplicatedSyllabus.save();

    return NextResponse.json({ success: true, data: duplicatedSyllabus });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// PUT: update or restore a syllabus version
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, user, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid Syllabus ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = await req.json();

    let syllabus = await Syllabus.findOne({ _id: id, school_id: schoolId });
    if (!syllabus) {
      const assignment = await TeacherAssignment.findOne({ _id: id, school_id: schoolId }).lean();
      if (!assignment) {
        return NextResponse.json({ success: false, message: "Syllabus context not found" }, { status: 404 });
      }

      if (user.role === "teacher") {
        const teacherProfile = await Teacher.findOne({ user_id: user.user_id, school_id: schoolId }).lean();
        if (!teacherProfile || String(assignment.teacher_id) !== String(teacherProfile._id)) {
          return NextResponse.json({ success: false, message: "Access Denied: You cannot manage syllabus for a class/subject you do not teach." }, { status: 403 });
        }
      }

      const existingSyllabus = await Syllabus.findOne({
        school_id: schoolId,
        academic_year: assignment.academic_year,
        class_id: assignment.class_id,
        section_id: assignment.section_id || null,
        subject_master_id: assignment.subject_master_id
      });

      if (existingSyllabus) {
        syllabus = existingSyllabus;
      } else {
        syllabus = new Syllabus({
          school_id: schoolId,
          academic_year: assignment.academic_year,
          class_id: assignment.class_id,
          section_id: assignment.section_id || null,
          stream_id: assignment.stream_id || null,
          subject_master_id: assignment.subject_master_id,
          teacher_id: assignment.teacher_id || null,
          title: body.title || `${assignment.academic_year} Syllabus`,
          description: body.description || "",
          version: 1,
          status: body.status || "Draft",
          publish_date: body.status === "Published" ? new Date() : null,
          visibility: body.visibility || "Public",
          attachments: body.attachments || [],
          reference_links: body.reference_links || [],
          nodes: body.nodes || [],
          history: [],
          created_by: new mongoose.Types.ObjectId(user.user_id as string),
          updated_by: new mongoose.Types.ObjectId(user.user_id as string)
        });
        await syllabus.save();
        return NextResponse.json({ success: true, data: syllabus });
      }
    } else {
      if (user.role === "teacher") {
        const teacherProfile = await Teacher.findOne({ user_id: user.user_id, school_id: schoolId }).lean();
        if (!teacherProfile) {
          return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
        }

        const isAssigned = await TeacherAssignment.exists({
          school_id: schoolId,
          teacher_id: teacherProfile._id,
          class_id: syllabus.class_id,
          subject_master_id: syllabus.subject_master_id,
          academic_year: syllabus.academic_year,
          is_deleted: false
        });

        if (!isAssigned) {
          return NextResponse.json({ success: false, message: "Access Denied: You cannot manage syllabus for a class/subject you do not teach." }, { status: 403 });
        }
      }
    }

    if (action === "restore") {
      const { version, remarks } = body;
      if (!version) {
        return NextResponse.json({ success: false, message: "Target version is required to restore." }, { status: 400 });
      }

      const historicalSnapshot = (syllabus.history || []).find((h: any) => h.version === version);
      if (!historicalSnapshot) {
        return NextResponse.json({ success: false, message: `Historical Version ${version} not found.` }, { status: 404 });
      }

      // Save current status as a snapshot history entry
      const currentSnapshot = {
        version: syllabus.version,
        title: syllabus.title,
        description: syllabus.description,
        status: syllabus.status,
        nodes: syllabus.nodes,
        attachments: syllabus.attachments,
        reference_links: syllabus.reference_links,
        updated_by: new mongoose.Types.ObjectId(user.user_id as string),
        updated_at: new Date(),
        remarks: remarks || `Backup before restoring Version ${version}`
      };

      syllabus.history.push(currentSnapshot);

      // Restore snapshot details
      syllabus.version = historicalSnapshot.version;
      syllabus.title = historicalSnapshot.title;
      syllabus.description = historicalSnapshot.description;
      syllabus.status = historicalSnapshot.status;
      syllabus.nodes = historicalSnapshot.nodes;
      syllabus.attachments = historicalSnapshot.attachments;
      syllabus.reference_links = historicalSnapshot.reference_links;
      syllabus.updated_by = new mongoose.Types.ObjectId(user.user_id as string);

      await syllabus.save();
      return NextResponse.json({ success: true, data: syllabus });
    }

    // Standard PUT field updates
    const isPublished = body.status === "Published";

    if (body.incrementVersion) {
      // Capture a snapshot of current parameters into history array
      const historySnapshot = {
        version: syllabus.version,
        title: syllabus.title,
        description: syllabus.description,
        status: syllabus.status,
        nodes: syllabus.nodes,
        attachments: syllabus.attachments,
        reference_links: syllabus.reference_links,
        updated_by: new mongoose.Types.ObjectId(user.user_id as string),
        updated_at: new Date(),
        remarks: body.remarks || `Snapshot before upgrading to Version ${syllabus.version + 1}`
      };

      syllabus.history.push(historySnapshot);
      syllabus.version += 1;
    }

    if (body.title) syllabus.title = body.title;
    if (body.description !== undefined) syllabus.description = body.description;
    if (body.status) {
      syllabus.status = body.status;
      if (isPublished && !syllabus.publish_date) {
        syllabus.publish_date = new Date();
      }
    }
    if (body.visibility) syllabus.visibility = body.visibility;
    if (body.attachments) syllabus.attachments = body.attachments;
    if (body.reference_links) syllabus.reference_links = body.reference_links;
    if (body.nodes) syllabus.nodes = body.nodes;
    if (body.teacher_id) syllabus.teacher_id = new mongoose.Types.ObjectId(body.teacher_id);

    syllabus.updated_by = new mongoose.Types.ObjectId(user.user_id as string);
    await syllabus.save();

    return NextResponse.json({ success: true, data: syllabus });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: delete a syllabus by ID (safe deletion checking status)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { schoolId, user, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid Syllabus ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const syllabus = await Syllabus.findOne({ _id: id, school_id: schoolId });
    if (!syllabus) {
      return NextResponse.json({ success: false, message: "Syllabus not found" }, { status: 404 });
    }

    // Safety constraint: prevent deleting Published syllabi
    if (syllabus.status === "Published") {
      return NextResponse.json({
        success: false,
        message: "Safety Block: Cannot delete a Published syllabus. Please unpublish or archive it first."
      }, { status: 400 });
    }

    await Syllabus.findOneAndDelete({ _id: id, school_id: schoolId });
    return NextResponse.json({ success: true, message: "Syllabus deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal Server Error" }, { status: 500 });
  }
}
