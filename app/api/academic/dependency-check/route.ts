import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import {
  Class,
  Student,
  Attendance,
  Exam,
  ClassTest,
  Homework,
  Timetable,
  GeneratedDocument,
  TeacherAssignment,
  ClassFee,
  FeesStructure,
  Stream,
  Subject,
  SubjectAssignment,
  ClassGroup,
  SubjectMaster,
  ExamSchedule,
  Result
} from "@/lib/models/index";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin", "teacher"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const id = url.searchParams.get("id");

    if (!type || !id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Type ('class', 'stream', 'subject', 'subject_master') and a valid ID are required." },
        { status: 400 }
      );
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const result: { deletable: boolean; reasons: string[]; details: Record<string, number> } = {
      deletable: true,
      reasons: [],
      details: {}
    };

    if (type === "class") {
      const cls = await Class.findOne({ _id: objectId, school_id: schoolId }).lean();
      if (!cls) {
        return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
      }

      const [
        students,
        attendance,
        exams,
        classTests,
        homeworks,
        timetables,
        teacherAssignments,
        feesStructures,
        classFees,
        documents
      ] = await Promise.all([
        Student.countDocuments({ class_id: objectId, school_id: schoolId }),
        Attendance.countDocuments({ class_id: objectId, school_id: schoolId }),
        Exam.countDocuments({ class_id: objectId, school_id: schoolId }),
        ClassTest.countDocuments({ class_id: objectId, school_id: schoolId }),
        Homework.countDocuments({ class_id: objectId, school_id: schoolId }),
        Timetable.countDocuments({ class_id: objectId, school_id: schoolId }),
        TeacherAssignment.countDocuments({ class_id: objectId, school_id: schoolId, is_deleted: false }),
        FeesStructure.countDocuments({ class_id: objectId, school_id: schoolId }),
        ClassFee.countDocuments({ class_id: objectId, school_id: schoolId }),
        GeneratedDocument.countDocuments({ class_id: objectId, school_id: schoolId })
      ]);

      if (students > 0) {
        result.deletable = false;
        result.reasons.push(`${students} Active Students`);
        result.details.students = students;
      }
      if (attendance > 0) {
        result.deletable = false;
        result.reasons.push(`${attendance} Attendance Records`);
        result.details.attendance = attendance;
      }
      if (exams > 0) {
        result.deletable = false;
        result.reasons.push(`${exams} Exams`);
        result.details.exams = exams;
      }
      if (classTests > 0) {
        result.deletable = false;
        result.reasons.push(`${classTests} Assessments (Class Tests)`);
        result.details.classTests = classTests;
      }
      if (homeworks > 0) {
        result.deletable = false;
        result.reasons.push(`${homeworks} Homework Assignments`);
        result.details.homeworks = homeworks;
      }
      if (timetables > 0) {
        result.deletable = false;
        result.reasons.push(`${timetables} Timetable Routines`);
        result.details.timetables = timetables;
      }
      if (teacherAssignments > 0) {
        result.deletable = false;
        result.reasons.push(`${teacherAssignments} Teacher Assignments`);
        result.details.teacherAssignments = teacherAssignments;
      }
      if (feesStructures > 0 || classFees > 0) {
        const totalFees = feesStructures + classFees;
        result.deletable = false;
        result.reasons.push(`${totalFees} Fee Configurations`);
        result.details.fees = totalFees;
      }
      if (documents > 0) {
        result.deletable = false;
        result.reasons.push(`${documents} Generated Documents/Reports`);
        result.details.documents = documents;
      }

    } else if (type === "stream") {
      const stream = await Stream.findOne({ _id: objectId, school_id: schoolId }).lean();
      if (!stream) {
        return NextResponse.json({ success: false, message: "Stream not found" }, { status: 404 });
      }

      // Query classes matching stream name pattern (e.g. "Class 11 Science" matches stream "Science")
      const matchedClasses = await Class.find({
        school_id: schoolId,
        name: { $regex: stream.name, $options: "i" }
      }).select("_id").lean();
      const matchedClassIds = matchedClasses.map(c => c._id);

      const [
        classesCount,
        studentsCount,
        teacherAssignments,
        subjectAssignments,
        attendanceRecords,
        classGroups,
        subjectMasters
      ] = await Promise.all([
        Class.countDocuments({ school_id: schoolId, name: { $regex: stream.name, $options: "i" } }),
        Student.countDocuments({ school_id: schoolId, class_id: { $in: matchedClassIds } }),
        TeacherAssignment.countDocuments({ school_id: schoolId, stream_id: objectId, is_deleted: false }),
        SubjectAssignment.countDocuments({ school_id: schoolId, stream_id: objectId }),
        Attendance.countDocuments({ school_id: schoolId, stream_id: objectId }),
        ClassGroup.countDocuments({ school_id: schoolId, "classes.stream_id": objectId }),
        SubjectMaster.countDocuments({ school_id: schoolId, allowed_streams: objectId })
      ]);

      if (classesCount > 0) {
        result.deletable = false;
        result.reasons.push(`${classesCount} Classes (such as Class 11/12)`);
        result.details.classes = classesCount;
      }
      if (studentsCount > 0) {
        result.deletable = false;
        result.reasons.push(`${studentsCount} Students in Stream classes`);
        result.details.students = studentsCount;
      }
      if (teacherAssignments > 0) {
        result.deletable = false;
        result.reasons.push(`${teacherAssignments} Teacher Assignments`);
        result.details.teacherAssignments = teacherAssignments;
      }
      if (subjectAssignments > 0) {
        result.deletable = false;
        result.reasons.push(`${subjectAssignments} Subject Assignments`);
        result.details.subjectAssignments = subjectAssignments;
      }
      if (attendanceRecords > 0) {
        result.deletable = false;
        result.reasons.push(`${attendanceRecords} Attendance Records`);
        result.details.attendance = attendanceRecords;
      }
      if (classGroups > 0) {
        result.deletable = false;
        result.reasons.push(`${classGroups} Class Groups`);
        result.details.classGroups = classGroups;
      }
      if (subjectMasters > 0) {
        result.deletable = false;
        result.reasons.push(`${subjectMasters} Subjects Catalog mappings`);
        result.details.subjectMasters = subjectMasters;
      }

    } else if (type === "subject_master") {
      const subMaster = await SubjectMaster.findOne({ _id: objectId, school_id: schoolId }).lean();
      if (!subMaster) {
        return NextResponse.json({ success: false, message: "Subject Master not found" }, { status: 404 });
      }

      const [
        subjectAssignments,
        teacherAssignments
      ] = await Promise.all([
        SubjectAssignment.countDocuments({ school_id: schoolId, subject_master_id: objectId }),
        TeacherAssignment.countDocuments({ school_id: schoolId, subject_master_id: objectId, is_deleted: false })
      ]);

      if (subjectAssignments > 0) {
        result.deletable = false;
        result.reasons.push(`${subjectAssignments} Class-Subject Assignments`);
        result.details.subjectAssignments = subjectAssignments;
      }
      if (teacherAssignments > 0) {
        result.deletable = false;
        result.reasons.push(`${teacherAssignments} Teacher Assignments`);
        result.details.teacherAssignments = teacherAssignments;
      }

    } else if (type === "subject") {
      const subject = await Subject.findOne({ _id: objectId, school_id: schoolId }).lean();
      if (!subject) {
        return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });
      }

      const [
        timetables,
        examSchedules,
        results,
        classTests,
        homeworks
      ] = await Promise.all([
        Timetable.countDocuments({ school_id: schoolId, subject_id: objectId }),
        ExamSchedule.countDocuments({ school_id: schoolId, subject_id: objectId }),
        Result.countDocuments({ school_id: schoolId, subject_id: objectId }),
        ClassTest.countDocuments({ school_id: schoolId, subject_id: objectId }),
        Homework.countDocuments({ school_id: schoolId, subject_id: objectId })
      ]);

      if (timetables > 0) {
        result.deletable = false;
        result.reasons.push(`${timetables} Routine Periods (Timetable)`);
        result.details.timetables = timetables;
      }
      if (examSchedules > 0 || results > 0) {
        const examRefs = examSchedules + results;
        result.deletable = false;
        result.reasons.push(`${examRefs} Exam Schedules/Results entries`);
        result.details.exams = examRefs;
      }
      if (classTests > 0) {
        result.deletable = false;
        result.reasons.push(`${classTests} Assessments (Class Tests)`);
        result.details.classTests = classTests;
      }
      if (homeworks > 0) {
        result.deletable = false;
        result.reasons.push(`${homeworks} Homework Entries`);
        result.details.homeworks = homeworks;
      }
    } else {
      return NextResponse.json({ success: false, message: "Invalid dependency type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
