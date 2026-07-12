import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { ClassFee, StudentFeePayment, StudentFeeAssignment } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import Parent from "@/lib/models/Parent";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "super_admin", "accountant", "teacher", "parent", "student"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const classId = url.searchParams.get("class_id");
    const studentId = url.searchParams.get("student_id");
    const configOnly = url.searchParams.get("config_only") === "true";
    const academic_year = url.searchParams.get("academic_year") || "2026";

    // Strict role ownership bounds
    if (role === "student") {
      const studentProfile = await Student.findOne({ school_id: schoolId, user_id: userId }).select("_id").lean();
      if (!studentProfile || (studentId && studentProfile._id.toString() !== studentId)) {
        return NextResponse.json({ success: false, message: "Access denied to student record" }, { status: 403 });
      }
    } else if (role === "parent") {
      const parent = await Parent.findOne({ user_id: userId, school_id: schoolId }).select("_id").lean();
      if (!parent) {
        return NextResponse.json({ success: false, message: "Access denied: Parent not found" }, { status: 403 });
      }
      const children = await Student.find({ school_id: schoolId, parent_id: parent._id }).select("_id").lean();
      const childIds = children.map((c: any) => c._id.toString());
      if (studentId) {
        if (!childIds.includes(studentId)) {
          return NextResponse.json({ success: false, message: "Access denied to student record" }, { status: 403 });
        }
      }
    }

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
    const dueStatusFilter = url.searchParams.get("due_status"); // Overdue / Due / No Due
    const feeTypeFilterName = url.searchParams.get("fee_type"); // e.g. "Tuition Fees"
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    // Teacher assignments restriction
    let allowedClassIds: string[] | null = null;
    if (role === "teacher") {
      const classTeacherClasses = await mongoose.model("Class").find({
        school_id: schoolId,
        class_teacher_id: new mongoose.Types.ObjectId(userId as string)
      }).select("_id").lean();

      const assignments = await mongoose.model("TeacherAssignment").find({
        school_id: schoolId,
        teacher_id: new mongoose.Types.ObjectId(userId as string),
        academic_year,
        status: "Active",
        is_deleted: false
      }).select("class_id").lean();

      allowedClassIds = Array.from(new Set([
        ...classTeacherClasses.map((c: any) => c._id.toString()),
        ...assignments.map((a: any) => a.class_id ? a.class_id.toString() : "").filter(Boolean)
      ]));

      if (allowedClassIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            students: [],
            pagination: { totalItems: 0, totalPages: 0, currentPage: 1, limit }
          }
        });
      }
    }

    // 1. Build Student Query
    const studentQuery: any = { school_id: schoolId, is_active: true };
    if (academic_year) {
      studentQuery.academic_year = academic_year;
    }
    if (studentId) {
      studentQuery._id = studentId;
    } else if (role === "parent") {
      const parent = await Parent.findOne({ user_id: userId, school_id: schoolId }).select("_id").lean();
      const children = await Student.find({ school_id: schoolId, parent_id: parent?._id }).select("_id").lean();
      studentQuery._id = { $in: children.map(c => c._id) };
    } else if (role === "student") {
      const studentProfile = await Student.findOne({ school_id: schoolId, user_id: userId }).select("_id").lean();
      studentQuery._id = studentProfile?._id || new mongoose.Types.ObjectId();
    }

    let classIdsToQuery: string[] | null = allowedClassIds;

    // Filter by Class ID
    if (classId) {
      if (classIdsToQuery) {
        classIdsToQuery = classIdsToQuery.filter(id => id === classId);
      } else {
        classIdsToQuery = [classId];
      }
    }

    // Filter by Section
    const section = url.searchParams.get("section");
    if (section) {
      const sectionClasses = await mongoose.model("Class").find({
        school_id: schoolId,
        section: { $regex: new RegExp(`^${section}$`, "i") }
      }).select("_id").lean();
      const sectionClassIds = sectionClasses.map((c: any) => c._id.toString());
      if (classIdsToQuery) {
        classIdsToQuery = classIdsToQuery.filter(id => sectionClassIds.includes(id));
      } else {
        classIdsToQuery = sectionClassIds;
      }
    }

    // Filter by Teacher
    const teacherFilterId = url.searchParams.get("teacher_id");
    if (teacherFilterId) {
      const teacherClasses = await mongoose.model("Class").find({
        school_id: schoolId,
        class_teacher_id: new mongoose.Types.ObjectId(teacherFilterId)
      }).select("_id").lean();

      const teacherAssignments = await mongoose.model("TeacherAssignment").find({
        school_id: schoolId,
        teacher_id: new mongoose.Types.ObjectId(teacherFilterId),
        academic_year,
        status: "Active",
        is_deleted: false
      }).select("class_id").lean();

      const teacherClassIds = Array.from(new Set([
        ...teacherClasses.map((c: any) => c._id.toString()),
        ...teacherAssignments.map((a: any) => a.class_id ? a.class_id.toString() : "").filter(Boolean)
      ]));

      if (classIdsToQuery) {
        classIdsToQuery = classIdsToQuery.filter(id => teacherClassIds.includes(id));
      } else {
        classIdsToQuery = teacherClassIds;
      }
    }

    if (classIdsToQuery !== null) {
      studentQuery.class_id = { $in: classIdsToQuery.map(id => new mongoose.Types.ObjectId(id)) };
    }

    // Advanced Global Search Query
    if (search) {
      const matchingTeachers = await mongoose.model("Teacher").find({
        school_id: schoolId,
        name: { $regex: search, $options: "i" }
      }).select("_id").lean();
      const searchedTeacherIds = matchingTeachers.map((t: any) => t._id);

      const searchedClasses = await mongoose.model("Class").find({
        school_id: schoolId,
        $or: [
          { name: { $regex: search, $options: "i" } },
          { section: { $regex: search, $options: "i" } },
          { class_teacher_id: { $in: searchedTeacherIds } }
        ]
      }).select("_id").lean();
      const searchedClassIds = searchedClasses.map((c: any) => c._id.toString());

      const teacherAssignments = await mongoose.model("TeacherAssignment").find({
        school_id: schoolId,
        teacher_id: { $in: searchedTeacherIds },
        academic_year,
        status: "Active",
        is_deleted: false
      }).select("class_id").lean();
      const assignmentClassIds = teacherAssignments.map((a: any) => a.class_id ? a.class_id.toString() : "").filter(Boolean);

      const allSearchClassIds = Array.from(new Set([...searchedClassIds, ...assignmentClassIds]));

      const matchingPayments = await StudentFeePayment.find({
        school_id: schoolId,
        receipt_number: { $regex: search, $options: "i" }
      }).select("student_id").lean();
      const paymentStudentIds = matchingPayments.map((p: any) => p.student_id.toString());

      studentQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { admission_no: { $regex: search, $options: "i" } },
        { guardian_name: { $regex: search, $options: "i" } },
        { class_id: { $in: allSearchClassIds.map(id => new mongoose.Types.ObjectId(id)) } },
        { _id: { $in: paymentStudentIds.map(id => new mongoose.Types.ObjectId(id)) } }
      ];
    }

    // 2. Fetch all matching students to compute statuses in memory
    const students = await Student.find(studentQuery)
      .populate("class_id", "name section")
      .sort({ name: 1 })
      .lean();

    // Get all ClassFees for this school to avoid N+1 queries
    const classFeesList = await ClassFee.find({ school_id: schoolId }).lean();
    const classFeesMap = new Map(classFeesList.map((cf) => [cf.class_id.toString(), cf]));

    // Get all StudentFeeAssignments for this school to avoid N+1 queries
    const studentAssignments = await StudentFeeAssignment.find({ school_id: schoolId }).lean();
    const studentAssignmentsMap = new Map(studentAssignments.map((sa) => [sa.student_id.toString(), sa]));

    // 3. Batch-fetch ALL payments for the matching students in ONE query
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

    // 4. Compute status/totals for each student
    const computedList = students.map((student: any) => {
      const studentIdStr = student._id.toString();
      const studentClassId = student.class_id?._id?.toString() || student.class_id?.toString();

      const customAssignDoc = studentAssignmentsMap.get(studentIdStr);
      const classFeeDoc = studentClassId ? classFeesMap.get(studentClassId) : null;

      // Extract details for the Fee Structure list
      const enabledFeeTypes: any[] = [];
      if (customAssignDoc && customAssignDoc.fee_types) {
        enabledFeeTypes.push(...customAssignDoc.fee_types.filter((f: any) => f.is_enabled));
      } else if (classFeeDoc && classFeeDoc.fee_types) {
        enabledFeeTypes.push(...classFeeDoc.fee_types.filter((f: any) => f.is_enabled));
      }

      let totalFees = 0;
      let totalPaid = 0;

      if (feeTypeFilterName) {
        const targetFee = enabledFeeTypes.find(f => f.name.toLowerCase() === feeTypeFilterName.toLowerCase());
        if (!targetFee) return null; // Exclude student if they don't have this fee type
        totalFees = targetFee.amount;

        const payments = paymentsByStudentId.get(studentIdStr) || [];
        payments.forEach((p: any) => {
          if (p.fee_breakdown && p.fee_breakdown.length > 0) {
            const match = p.fee_breakdown.find((f: any) => f.name.toLowerCase() === feeTypeFilterName.toLowerCase());
            if (match) totalPaid += match.amount_paid;
          }
        });
      } else {
        totalFees = customAssignDoc
          ? customAssignDoc.total_amount
          : classFeeDoc
          ? classFeeDoc.total_amount
          : 0;

        const payments = paymentsByStudentId.get(studentIdStr) || [];
        totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount_paid, 0);
      }

      const balanceAmount = Math.max(0, totalFees - totalPaid);

      const payments = paymentsByStudentId.get(studentIdStr) || [];
      const lastPayment = payments[0] || null;
      const lastPaidAmount = lastPayment ? lastPayment.amount_paid : 0;
      const lastPaymentDate = lastPayment ? lastPayment.payment_date : null;

      let status: "Paid" | "Partial" | "Pending" = "Pending";
      if (totalFees > 0) {
        if (totalPaid >= totalFees) status = "Paid";
        else if (totalPaid > 0) status = "Partial";
      }

      // Compute Due Status
      let dueStatus: "No Due" | "Overdue" | "Due" = "Due";
      if (balanceAmount === 0) {
        dueStatus = "No Due";
      } else {
        const today = new Date();
        if (lastPayment && lastPayment.end_date) {
          const endDate = new Date(lastPayment.end_date);
          if (today > endDate) dueStatus = "Overdue";
        } else {
          const joinedDate = student.admission_date || student.createdAt;
          if (joinedDate) {
            const diffDays = Math.ceil(Math.abs(today.getTime() - new Date(joinedDate).getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 30) dueStatus = "Overdue";
          }
        }
      }

      return {
        _id: student._id,
        name: student.name,
        admission_no: student.admission_no || "N/A",
        class_name: student.class_id
          ? `${student.class_id.name} - ${student.class_id.section}`
          : "N/A",
        class_id: studentClassId,
        section: student.class_id?.section || "N/A",
        guardian_name: student.guardian_name || "N/A",
        guardian_phone: student.guardian_phone || "N/A",
        guardian_relation: student.guardian_relation || "Guardian",
        fee_structure: enabledFeeTypes.map(f => `${f.name} (₹${f.amount})`),
        totalFees,
        totalPaid,
        balanceAmount,
        lastPaidAmount,
        lastPaymentDate,
        status,
        dueStatus,
        academic_year: student.academic_year || "2026"
      };
    }).filter(Boolean); // Clean filter nulls

    // 5. Apply status, due status and date range filters
    let filteredList = statusFilter
      ? computedList.filter((item: any) => item.status.toLowerCase() === statusFilter.toLowerCase())
      : computedList;

    if (dueStatusFilter) {
      filteredList = filteredList.filter((item: any) => item.dueStatus.toLowerCase() === dueStatusFilter.toLowerCase());
    }

    if (dateFrom) {
      filteredList = filteredList.filter((item: any) => item.lastPaymentDate && new Date(item.lastPaymentDate) >= new Date(dateFrom));
    }

    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filteredList = filteredList.filter((item: any) => item.lastPaymentDate && new Date(item.lastPaymentDate) <= endOfDay);
    }

    // 6. Apply pagination slicing
    // Sort alphabetically by student name (case-insensitive, localized)
    filteredList.sort((a: any, b: any) => a.name.localeCompare(b.name));

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
