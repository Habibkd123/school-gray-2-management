import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireAuth } from "@/lib/utils/auth";
import School from "@/lib/models/School";
import Student from "@/lib/models/Student";
import Teacher from "@/lib/models/Teacher";
import Class from "@/lib/models/Class";
import Section from "@/lib/models/Section";
import Stream from "@/lib/models/Stream";
import Parent from "@/lib/models/Parent";
import StudentFeePayment from "@/lib/models/StudentFeePayment";
import StudentFeeAssignment from "@/lib/models/StudentFeeAssignment";
import ClassFee from "@/lib/models/ClassFee";
import SalaryPayment from "@/lib/models/SalaryPayment";
import {
  Attendance,
  Exam,
  Result,
  Notice,
  Homework,
  Timetable,
  Syllabus,
  FeesStructure,
} from "@/lib/models";
import mongoose from "mongoose";

// GET /api/backup/tenant - Generate complete, machine-restorable JSON backup of a tenant
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ["school_admin", "super_admin"]);
  if (auth.error) return auth.error;

  const url = new URL(req.url);
  const requestedSchoolId = url.searchParams.get("school_id");

  const effectiveSchoolId =
    auth.role === "super_admin"
      ? requestedSchoolId || auth.schoolId
      : auth.schoolId;

  if (!effectiveSchoolId || !mongoose.isValidObjectId(effectiveSchoolId)) {
    return NextResponse.json(
      { success: false, message: "Valid School ID is required" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const schoolDoc = await School.findById(effectiveSchoolId).lean();
    if (!schoolDoc) {
      return NextResponse.json(
        { success: false, message: "School not found" },
        { status: 404 }
      );
    }

    const tenantFilter = { school_id: new mongoose.Types.ObjectId(effectiveSchoolId) };

    // Fetch all tenant data in parallel
    const [
      students,
      teachers,
      classes,
      sections,
      streams,
      parents,
      feesStructures,
      classFees,
      feeAssignments,
      feePayments,
      salaryPayments,
      attendances,
      exams,
      results,
      notices,
      homeworks,
      timetables,
      syllabuses,
    ] = await Promise.all([
      Student.find(tenantFilter).lean(),
      Teacher.find(tenantFilter).lean(),
      Class.find(tenantFilter).lean(),
      Section.find(tenantFilter).lean(),
      Stream.find(tenantFilter).lean(),
      Parent.find(tenantFilter).lean(),
      FeesStructure.find(tenantFilter).lean(),
      ClassFee.find(tenantFilter).lean(),
      StudentFeeAssignment.find(tenantFilter).lean(),
      StudentFeePayment.find(tenantFilter).lean(),
      SalaryPayment.find(tenantFilter).lean(),
      Attendance.find(tenantFilter).lean(),
      Exam.find(tenantFilter).lean(),
      Result.find(tenantFilter).lean(),
      Notice.find(tenantFilter).lean(),
      Homework.find(tenantFilter).lean(),
      Timetable.find(tenantFilter).lean(),
      Syllabus.find(tenantFilter).lean(),
    ]);

    const backupPayload = {
      format_version: "2.0-saas",
      export_timestamp: new Date().toISOString(),
      tenant: {
        id: schoolDoc._id.toString(),
        school_id: schoolDoc._id.toString(),
        name: schoolDoc.name,
        slug: schoolDoc.slug,
        subdomain: schoolDoc.subdomain,
      },
      counts: {
        students: students.length,
        teachers: teachers.length,
        classes: classes.length,
        sections: sections.length,
        streams: streams.length,
        parents: parents.length,
        feesStructures: feesStructures.length,
        classFees: classFees.length,
        feeAssignments: feeAssignments.length,
        feePayments: feePayments.length,
        salaryPayments: salaryPayments.length,
        attendances: attendances.length,
        exams: exams.length,
        results: results.length,
        notices: notices.length,
        homeworks: homeworks.length,
        timetables: timetables.length,
        syllabuses: syllabuses.length,
      },
      data: {
        school: schoolDoc,
        classes,
        sections,
        streams,
        teachers,
        parents,
        students,
        feesStructures,
        classFees,
        feeAssignments,
        feePayments,
        salaryPayments,
        attendances,
        exams,
        results,
        notices,
        homeworks,
        timetables,
        syllabuses,
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const filename = `backup_${schoolDoc.slug || "school"}_${new Date().toISOString().split("T")[0]}_${Date.now()}.json`;

    return new Response(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[TENANT BACKUP ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to generate backup" },
      { status: 500 }
    );
  }
}

// POST /api/backup/tenant - 1-Click single-tenant disaster recovery & restore
export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ["school_admin", "super_admin"]);
  if (auth.error) return auth.error;

  try {
    const backup = await req.json();

    if (!backup || backup.format_version !== "2.0-saas" || !backup.tenant || !backup.data) {
      return NextResponse.json(
        { success: false, message: "Invalid backup file format" },
        { status: 400 }
      );
    }

    const backupSchoolId = String(backup.tenant.id || backup.tenant.school_id || "");

    // Verify tenant authorization: Non-super-admins can ONLY restore to their own school!
    if (auth.role !== "super_admin") {
      if (auth.schoolId !== backupSchoolId) {
        return NextResponse.json(
          {
            success: false,
            message: "Tenant mismatch: You cannot restore another school's backup into this school.",
          },
          { status: 403 }
        );
      }
    }

    await connectDB();
    const targetSchoolId = new mongoose.Types.ObjectId(backupSchoolId);
    const targetFilter = { school_id: targetSchoolId };

    // ── Granular Restore: Clean tenant collections and re-insert ──
    const restoredCounts: Record<string, number> = {};

    // 1. Classes & Academic structure
    if (Array.isArray(backup.data.classes)) {
      await Class.deleteMany(targetFilter);
      if (backup.data.classes.length > 0) {
        const inserted = await Class.insertMany(backup.data.classes);
        restoredCounts.classes = inserted.length;
      }
    }

    if (Array.isArray(backup.data.sections)) {
      await Section.deleteMany(targetFilter);
      if (backup.data.sections.length > 0) {
        const inserted = await Section.insertMany(backup.data.sections);
        restoredCounts.sections = inserted.length;
      }
    }

    if (Array.isArray(backup.data.streams)) {
      await Stream.deleteMany(targetFilter);
      if (backup.data.streams.length > 0) {
        const inserted = await Stream.insertMany(backup.data.streams);
        restoredCounts.streams = inserted.length;
      }
    }

    // 2. People: Teachers, Parents, Students
    if (Array.isArray(backup.data.teachers)) {
      await Teacher.deleteMany(targetFilter);
      if (backup.data.teachers.length > 0) {
        const inserted = await Teacher.insertMany(backup.data.teachers);
        restoredCounts.teachers = inserted.length;
      }
    }

    if (Array.isArray(backup.data.parents)) {
      await Parent.deleteMany(targetFilter);
      if (backup.data.parents.length > 0) {
        const inserted = await Parent.insertMany(backup.data.parents);
        restoredCounts.parents = inserted.length;
      }
    }

    if (Array.isArray(backup.data.students)) {
      await Student.deleteMany(targetFilter);
      if (backup.data.students.length > 0) {
        const inserted = await Student.insertMany(backup.data.students);
        restoredCounts.students = inserted.length;
      }
    }

    // 3. Fees & Salaries
    if (Array.isArray(backup.data.feesStructures)) {
      await FeesStructure.deleteMany(targetFilter);
      if (backup.data.feesStructures.length > 0) {
        const inserted = await FeesStructure.insertMany(backup.data.feesStructures);
        restoredCounts.feesStructures = inserted.length;
      }
    }

    if (Array.isArray(backup.data.classFees)) {
      await ClassFee.deleteMany(targetFilter);
      if (backup.data.classFees.length > 0) {
        const inserted = await ClassFee.insertMany(backup.data.classFees);
        restoredCounts.classFees = inserted.length;
      }
    }

    if (Array.isArray(backup.data.feeAssignments)) {
      await StudentFeeAssignment.deleteMany(targetFilter);
      if (backup.data.feeAssignments.length > 0) {
        const inserted = await StudentFeeAssignment.insertMany(backup.data.feeAssignments);
        restoredCounts.feeAssignments = inserted.length;
      }
    }

    if (Array.isArray(backup.data.feePayments)) {
      await StudentFeePayment.deleteMany(targetFilter);
      if (backup.data.feePayments.length > 0) {
        const inserted = await StudentFeePayment.insertMany(backup.data.feePayments);
        restoredCounts.feePayments = inserted.length;
      }
    }

    if (Array.isArray(backup.data.salaryPayments)) {
      await SalaryPayment.deleteMany(targetFilter);
      if (backup.data.salaryPayments.length > 0) {
        const inserted = await SalaryPayment.insertMany(backup.data.salaryPayments);
        restoredCounts.salaryPayments = inserted.length;
      }
    }

    // 4. Attendance & Academics
    if (Array.isArray(backup.data.attendances)) {
      await Attendance.deleteMany(targetFilter);
      if (backup.data.attendances.length > 0) {
        const inserted = await Attendance.insertMany(backup.data.attendances);
        restoredCounts.attendances = inserted.length;
      }
    }

    if (Array.isArray(backup.data.exams)) {
      await Exam.deleteMany(targetFilter);
      if (backup.data.exams.length > 0) {
        const inserted = await Exam.insertMany(backup.data.exams);
        restoredCounts.exams = inserted.length;
      }
    }

    if (Array.isArray(backup.data.results)) {
      await Result.deleteMany(targetFilter);
      if (backup.data.results.length > 0) {
        const inserted = await Result.insertMany(backup.data.results);
        restoredCounts.results = inserted.length;
      }
    }

    if (Array.isArray(backup.data.notices)) {
      await Notice.deleteMany(targetFilter);
      if (backup.data.notices.length > 0) {
        const inserted = await Notice.insertMany(backup.data.notices);
        restoredCounts.notices = inserted.length;
      }
    }

    if (Array.isArray(backup.data.homeworks)) {
      await Homework.deleteMany(targetFilter);
      if (backup.data.homeworks.length > 0) {
        const inserted = await Homework.insertMany(backup.data.homeworks);
        restoredCounts.homeworks = inserted.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Tenant '${backup.tenant.name}' data successfully restored from backup.`,
      restored_counts: restoredCounts,
    });
  } catch (error: any) {
    console.error("[TENANT RESTORE ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to restore backup" },
      { status: 500 }
    );
  }
}
