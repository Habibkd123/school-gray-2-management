import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { GeneratedDocument } from "@/lib/models/GeneratedDocument";
import { Student, Result, Exam } from "@/lib/models/index";
import Teacher from "@/lib/models/Teacher";
import SalaryPayment from "@/lib/models/SalaryPayment";
import StudentFeePayment from "@/lib/models/StudentFeePayment";
import School from "@/lib/models/School";
import { resolveVariables } from "@/lib/utils/variable-resolver";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

/**
 * POST /api/documents/generate
 *
 * Body:
 * {
 *   templateId: string,
 *   documentType: string,
 *   referenceModule: "student" | "teacher" | "exam" | "fees" | "salary" | "school" | "custom",
 *   referenceId?: string,
 *   generatedFor?: string[],   // array of student/teacher IDs (bulk-aware)
 *   schoolId?: string,
 * }
 *
 * Returns resolved variable snapshots + created GeneratedDocument IDs.
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;
    const { schoolId, userId } = authResult;

    const body = await req.json();
    const {
      templateId,
      documentType = "custom",
      referenceModule = "custom",
      referenceId,
      generatedFor = [],
    } = body;

    if (!templateId) {
      return NextResponse.json({ success: false, message: "templateId is required" }, { status: 400 });
    }

    // ── Build context object ──────────────────────────────────────────────────
    const context: Record<string, any> = {};

    // School
    if (schoolId) {
      try {
        context.school = await School.findById(schoolId).lean();
      } catch { /* non-critical */ }
    }

    // System
    context.system = {
      date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      year: String(new Date().getFullYear()),
    };

    // ── Resolve for each target (supports bulk) ───────────────────────────────
    const targets: string[] = generatedFor.length > 0 ? generatedFor : (referenceId ? [referenceId] : []);
    if (targets.length === 0 && !referenceId) {
      // No specific record — return generic school-level variables
      const variables = resolveVariables(context);
      return NextResponse.json({ success: true, data: [{ variables }] });
    }

    const results = [];

    for (const targetId of targets) {
      const recordContext: Record<string, any> = { ...context };

      try {
        if (referenceModule === "student" || (!referenceModule && targetId)) {
          const student = await (Student as any).findById(targetId)
            .populate("class_id", "name section")
            .lean();
          if (student) {
            recordContext.student = student;
            // Fetch results for this student
            try {
              const results = await Result.find({ student_id: targetId })
                .populate("subject_id", "name")
                .lean();
              if (results && results.length > 0) {
                recordContext.results = results;
                // Fetch the associated exam
                const exam = await Exam.findById(results[0].exam_id)
                  .populate("class_id", "name section")
                  .lean();
                if (exam) {
                  recordContext.exam = exam;
                }
              }
            } catch (err) {
              console.error("Error fetching results/exam for student:", err);
            }
          }
        } else if (referenceModule === "teacher") {
          const teacher = await Teacher.findById(targetId || referenceId)
            .lean();
          if (teacher) recordContext.teacher = teacher;
        } else if (referenceModule === "salary") {
          const salary = await SalaryPayment.findById(targetId || referenceId)
            .populate("teacher_id")
            .lean();
          if (salary) {
            recordContext.salary = salary;
            recordContext.teacher = (salary as any).teacher_id;
          }
        } else if (referenceModule === "fees") {
          const payment = await StudentFeePayment.findById(targetId || referenceId)
            .populate({
              path: "student_id",
              populate: { path: "class_id", select: "name section" }
            })
            .lean();
          if (payment) {
            recordContext.payment = payment;
            recordContext.student = (payment as any).student_id;
            
            // Fetch results/exam for this student as well
            if (recordContext.student?._id) {
              try {
                const results = await Result.find({ student_id: recordContext.student._id })
                  .populate("subject_id", "name")
                  .lean();
                if (results && results.length > 0) {
                  recordContext.results = results;
                  const exam = await Exam.findById(results[0].exam_id)
                    .populate("class_id", "name section")
                    .lean();
                  if (exam) {
                    recordContext.exam = exam;
                  }
                }
              } catch (err) {
                console.error("Error fetching payment student results/exam:", err);
              }
            }
          }
        }
      } catch (e) {
        console.error("Context fetch error:", e);
      }

      const variables = resolveVariables(recordContext);

      // Persist a GeneratedDocument record
      let docId: string | undefined;
      try {
        if (schoolId && userId) {
          const gDoc = await GeneratedDocument.create({
            school_id: new mongoose.Types.ObjectId(schoolId),
            document_type: documentType,
            template_id: templateId,
            title: variables["student_name"] || variables["teacher_name"] || "Document",
            generated_by: new mongoose.Types.ObjectId(userId),
            generated_for: targetId ? new mongoose.Types.ObjectId(targetId) : undefined,
            generated_for_name: variables["student_name"] || variables["teacher_name"] || "",
            reference_module: referenceModule,
            reference_id: referenceId || targetId,
            variable_snapshot: variables,
            status: "generated",
          });
          docId = gDoc._id.toString();
        }
      } catch (e) {
        // Non-critical — don't block on history save
        console.warn("Could not save GeneratedDocument:", e);
      }

      results.push({ id: docId, variables });
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error("POST /api/documents/generate error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}

