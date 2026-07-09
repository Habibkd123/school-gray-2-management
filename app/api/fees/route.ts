import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { ClassFee, StudentFeePayment, StudentFeeAssignment } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin", "accountant"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const classId = url.searchParams.get("class_id");
    const studentId = url.searchParams.get("student_id");
    const configOnly = url.searchParams.get("config_only") === "true";
    const academic_year = url.searchParams.get("academic_year") || "2026";

    if (configOnly) {
      if (studentId) {
        const studentFee = await StudentFeeAssignment.findOne({
          school_id: schoolId,
          student_id: studentId,
          academic_year
        }).lean();
        if (studentFee) {
          return NextResponse.json({ success: true, data: studentFee });
        }
      }
      if (!classId) {
        return NextResponse.json({ success: false, message: "class_id required for config" }, { status: 400 });
      }
      const classFee = await ClassFee.findOne({
        school_id: schoolId,
        class_id: classId,
        academic_year
      }).lean();
      return NextResponse.json({ success: true, data: classFee });
    }

    const statusFilter = url.searchParams.get("status"); // Paid / Partial / Pending
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    // 1. Build Student Query
    const studentQuery: any = { school_id: schoolId, is_active: true };
    if (studentId) {
      studentQuery._id = studentId;
    }
    if (classId) {
      studentQuery.class_id = classId;
    }
    if (search) {
      studentQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { admission_no: { $regex: search, $options: "i" } },
      ];
    }

    // 2. Fetch all matching students to compute statuses in memory
    const students = await Student.find(studentQuery)
      .populate("class_id", "name section")
      .lean();

    // Get all ClassFees for this school to avoid N+1 queries
    const classFeesList = await ClassFee.find({ school_id: schoolId }).lean();
    const classFeesMap = new Map(classFeesList.map((cf) => [cf.class_id.toString(), cf]));

    // Get all StudentFeeAssignments for this school to avoid N+1 queries
    const studentAssignments = await StudentFeeAssignment.find({ school_id: schoolId }).lean();
    const studentAssignmentsMap = new Map(studentAssignments.map((sa) => [sa.student_id.toString(), sa]));

    // 3. Batch-fetch ALL payments for the matching students in ONE query (Fix HIGH-2 — N+1 elimination)
    const studentIds = students.map((s: any) => s._id);
    const allPayments = await StudentFeePayment.find({
      school_id: schoolId,
      student_id: { $in: studentIds },
    })
      .sort({ payment_date: -1 })
      .lean();

    // Group payments by student_id string for O(1) lookup
    const paymentsByStudentId = new Map<string, typeof allPayments>();
    for (const p of allPayments) {
      const sid = p.student_id.toString();
      if (!paymentsByStudentId.has(sid)) paymentsByStudentId.set(sid, []);
      paymentsByStudentId.get(sid)!.push(p);
    }

    // 4. Compute status/totals for each student using pre-grouped payments
    const computedList = students.map((student: any) => {
      const studentIdStr = student._id.toString();
      const studentClassId = student.class_id?._id?.toString() || student.class_id?.toString();

      const customAssignDoc = studentAssignmentsMap.get(studentIdStr);
      const classFeeDoc = studentClassId ? classFeesMap.get(studentClassId) : null;

      const totalFees = customAssignDoc
        ? customAssignDoc.total_amount
        : classFeeDoc
        ? classFeeDoc.total_amount
        : 0;

      const payments = paymentsByStudentId.get(studentIdStr) || [];
      const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount_paid, 0);
      const balanceAmount = Math.max(0, totalFees - totalPaid);

      const lastPayment = payments[0] || null;
      const lastPaidAmount = lastPayment ? lastPayment.amount_paid : 0;
      const lastPaymentDate = lastPayment ? lastPayment.payment_date : null;

      let status: "Paid" | "Partial" | "Pending" = "Pending";
      if (totalFees > 0) {
        if (totalPaid >= totalFees) status = "Paid";
        else if (totalPaid > 0) status = "Partial";
      }

      return {
        _id: student._id,
        name: student.name,
        admission_no: student.admission_no || "N/A",
        class_name: student.class_id
          ? `${student.class_id.name} - ${student.class_id.section}`
          : "N/A",
        class_id: studentClassId,
        totalFees,
        totalPaid,
        balanceAmount,
        lastPaidAmount,
        lastPaymentDate,
        status,
      };
    });

    // 4. Filter by status if requested
    const filteredList = statusFilter
      ? computedList.filter((item) => item.status.toLowerCase() === statusFilter.toLowerCase())
      : computedList;

    // 5. Apply pagination slicing
    const totalItems = filteredList.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const paginatedList = filteredList.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: {
        students: paginatedList,
        pagination: {
          totalItems,
          totalPages,
          currentPage: page,
          limit,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { class_id, student_id, fee_types, academic_year } = body;

    // 1. If student_id is provided, save as Custom Student Fee Override
    if (student_id) {
      if (!fee_types || !Array.isArray(fee_types) || !academic_year) {
        return NextResponse.json(
          { success: false, message: "Missing required fields (student_id, fee_types, academic_year)" },
          { status: 400 }
        );
      }

      // Calculate total amount from enabled custom fee types
      const total_amount = fee_types
        .filter((ft: any) => ft.is_enabled)
        .reduce((sum: number, ft: any) => sum + Number(ft.amount || 0), 0);

      const studentFee = await StudentFeeAssignment.findOneAndUpdate(
        {
          school_id: new mongoose.Types.ObjectId(schoolId as string),
          student_id: new mongoose.Types.ObjectId(student_id),
          academic_year,
        },
        {
          fee_types,
          total_amount,
        },
        {
          new: true,
          upsert: true,
        }
      );

      return NextResponse.json({ success: true, data: studentFee }, { status: 201 });
    }

    // 2. Class-wide Setup fallback
    if (!class_id || !fee_types || !Array.isArray(fee_types) || !academic_year) {
      return NextResponse.json(
        { success: false, message: "Missing required fields (class_id, fee_types, academic_year)" },
        { status: 400 }
      );
    }

    const total_amount = fee_types
      .filter((ft: any) => ft.is_enabled)
      .reduce((sum: number, ft: any) => sum + Number(ft.amount || 0), 0);

    const classFee = await ClassFee.findOneAndUpdate(
      {
        school_id: new mongoose.Types.ObjectId(schoolId as string),
        class_id: new mongoose.Types.ObjectId(class_id),
        academic_year,
      },
      {
        fee_types,
        total_amount,
      },
      {
        new: true,
        upsert: true,
      }
    );

    return NextResponse.json({ success: true, data: classFee }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
