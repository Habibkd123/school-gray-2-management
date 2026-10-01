import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance, ClassTest, ClassTestMark, Homework } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import Class from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";
import mongoose from "mongoose";

// Server-side in-memory caching & in-flight deduplication
const _studentReportServerCache = new Map<string, { data: any; expiresAt: number }>();
const _studentReportInFlight = new Map<string, Promise<any>>();
const STUDENT_REPORT_CACHE_TTL = 60_000;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await params;
  const authResult = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (authResult.error) return authResult.error;
  const { schoolId } = authResult;

  try {
    const cacheKey = `student_rep_${schoolId}_${studentId}`;
    const cached = _studentReportServerCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return sendCompressedJson(req, cached.data, {
        cacheControl: "private, max-age=30, stale-while-revalidate=60",
      });
    }

    const existingInFlight = _studentReportInFlight.get(cacheKey);
    if (existingInFlight) {
      try {
        const payload = await existingInFlight;
        return sendCompressedJson(req, payload, {
          cacheControl: "private, max-age=30, stale-while-revalidate=60",
        });
      } catch (e) {
        // Fall through to retry on error
      }
    }

    const fetchPromise = (async () => {
      await connectToDatabase();

      // 1. Fetch Student Profile
      const student = await Student.findOne({ _id: studentId, school_id: schoolId })
        .populate("class_id", "name section")
        .lean() as any;

      if (!student) {
        return null;
      }

      const classId = student.class_id?._id || student.class_id;

      // 2. Fetch Attendance Summary
      let workingDays = 0;
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let leaveCount = 0;
      let halfDayCount = 0;

      if (classId) {
        const attendanceDocs = await Attendance.find({
          school_id: schoolId as string,
          type: "student",
          class_id: classId,
        })
          .select("records.student_id records.status date")
          .lean();

        workingDays = attendanceDocs.length;

        attendanceDocs.forEach((doc) => {
          if (doc.records) {
            const rec = doc.records.find(
              (r: any) => (r.student_id?._id || r.student_id)?.toString() === studentId
            );
            if (rec) {
              const status = rec.status?.toLowerCase();
              if (status === "present") presentCount++;
              else if (status === "absent") absentCount++;
              else if (status === "late") lateCount++;
              else if (status === "leave") leaveCount++;
              else if (status === "half_day") halfDayCount++;
            }
          }
        });
      }

      const attendanceRate = workingDays > 0
        ? Math.round(((presentCount + lateCount + halfDayCount * 0.5) / workingDays) * 100)
        : 0;

      // 3. Fetch Test Performance
      const testMarks = await ClassTestMark.find({ student_id: studentId })
        .populate({
          path: "test_id",
          select: "title test_date total_marks passing_marks status subject_id",
          populate: { path: "subject_id", select: "name" },
        })
        .lean();

      const formattedTests = testMarks.map((m: any) => {
        const test = m.test_id || {};
        const subject = test.subject_id || {};
        const percent = test.total_marks > 0 ? Math.round((m.marks_obtained / test.total_marks) * 100) : 0;
        const isPass = m.marks_obtained >= (test.passing_marks || 0);

        return {
          testId: test._id || m.test_id,
          title: test.title || "Class Test",
          subject: subject.name || "N/A",
          testDate: test.test_date || null,
          totalMarks: test.total_marks || 0,
          passingMarks: test.passing_marks || 0,
          marksObtained: m.marks_obtained || 0,
          percentage: percent,
          isPass,
          status: test.status || "N/A",
        };
      });

      const averageTestScore = formattedTests.length > 0
        ? Math.round(formattedTests.reduce((acc, t) => acc + t.percentage, 0) / formattedTests.length)
        : 0;

      // 4. Fetch Homework Status
      let homeworkAssigned = 0;
      let homeworkSubmitted = 0;
      const homeworkDetails: any[] = [];

      if (classId) {
        const homeworks = await Homework.find({
          school_id: schoolId as string,
          class_id: classId,
          status: { $in: ["published", "completed"] },
        })
          .populate("subject_id", "name")
          .sort({ due_date: -1 })
          .lean();

        homeworkAssigned = homeworks.length;

        homeworks.forEach((hw: any) => {
          const submission = hw.submissions?.find(
            (sub: any) => (sub.student_id?._id || sub.student_id)?.toString() === studentId
          );

          if (submission) {
            homeworkSubmitted++;
          }

          homeworkDetails.push({
            homeworkId: hw._id,
            title: hw.title,
            subject: hw.subject_id?.name || "N/A",
            assignedDate: hw.assigned_date,
            dueDate: hw.due_date,
            isSubmitted: !!submission,
            submittedAt: submission?.submitted_at || null,
            grade: submission?.grade || null,
            feedback: submission?.feedback || null,
          });
        });
      }

      const homeworkCompletionRate = homeworkAssigned > 0
        ? Math.round((homeworkSubmitted / homeworkAssigned) * 100)
        : 0;

      return {
        success: true,
        data: {
          profile: {
            id: student._id,
            name: student.name,
            admissionNo: student.admission_no || student._id.slice(-6).toUpperCase(),
            rollNo: student.roll_no || "—",
            gender: student.gender || "—",
            dob: student.dob || null,
            admissionDate: student.admission_date || null,
            guardianName: student.guardian_name || "—",
            guardianPhone: student.guardian_phone || "—",
            className: student.class_id?.name || "—",
            section: student.class_id?.section || "—",
            isActive: student.is_active,
          },
          attendance: {
            workingDays,
            present: presentCount,
            absent: absentCount,
            late: lateCount,
            leave: leaveCount,
            halfDay: halfDayCount,
            rate: attendanceRate,
          },
          tests: {
            list: formattedTests,
            averageScore: averageTestScore,
            totalTaken: formattedTests.length,
          },
          homework: {
            list: homeworkDetails,
            assigned: homeworkAssigned,
            submitted: homeworkSubmitted,
            pending: homeworkAssigned - homeworkSubmitted,
            rate: homeworkCompletionRate,
          },
        },
      };
    })();

    _studentReportInFlight.set(cacheKey, fetchPromise);

    try {
      const payload = await fetchPromise;
      if (!payload) {
        return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
      }
      _studentReportServerCache.set(cacheKey, {
        data: payload,
        expiresAt: Date.now() + STUDENT_REPORT_CACHE_TTL,
      });
      return sendCompressedJson(req, payload, {
        cacheControl: "private, max-age=30, stale-while-revalidate=60",
      });
    } finally {
      _studentReportInFlight.delete(cacheKey);
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}
