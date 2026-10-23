import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { ClassFee, Class } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import { invalidateFeesCache } from "@/app/api/fees/route";

export const dynamic = "force-dynamic";

const DEFAULT_HEADS = [
  { name: "Tuition Fees", frequency: "Monthly", is_mandatory: true, is_enabled: true },
  { name: "Academic Fees", frequency: "Yearly", is_mandatory: true, is_enabled: true },
  { name: "Exam Fees", frequency: "Quarterly", is_mandatory: true, is_enabled: true },
  { name: "Computer Fees", frequency: "Monthly", is_mandatory: true, is_enabled: true },
  { name: "Library Fees", frequency: "Yearly", is_mandatory: true, is_enabled: true },
  { name: "Transport Fees", frequency: "Monthly", is_mandatory: false, is_enabled: false },
  { name: "Admission Fees", frequency: "One Time", is_mandatory: false, is_enabled: false },
  { name: "Other Fees", frequency: "Monthly", is_mandatory: false, is_enabled: false },
];

// GET: Fetch all default class fees for the school & academic session
export async function GET(req: NextRequest) {
  const { schoolId, role, error } = requireAuth(req, ["school_admin", "super_admin", "accountant", "teacher"]);
  if (error) return error;

  const url = new URL(req.url);
  const paramSchoolId = url.searchParams.get("school_id");
  const effectiveSchoolId = role === "super_admin" && paramSchoolId && paramSchoolId !== "all"
    ? paramSchoolId
    : schoolId;

  const academicYear = url.searchParams.get("academic_year") || "2026-2027";
  const classId = url.searchParams.get("class_id");

  try {
    await connectToDatabase();

    const query: any = {
      academic_year: academicYear,
    };
    const classesQuery: any = {
      is_deleted: { $ne: true },
    };

    if (effectiveSchoolId) {
      query.school_id = new mongoose.Types.ObjectId(effectiveSchoolId as string);
      classesQuery.school_id = new mongoose.Types.ObjectId(effectiveSchoolId as string);
    }
    if (classId) {
      query.class_id = new mongoose.Types.ObjectId(classId);
    }

    const [classList, classFees] = await Promise.all([
      Class.find(classesQuery).sort({ sort_weight: 1, section: 1 }).lean(),
      ClassFee.find(query).lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        classes: classList,
        fees: classFees,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/fees/class-defaults]", err);
    return NextResponse.json({ success: false, message: err.message || "Failed to fetch class fees" }, { status: 500 });
  }
}

// POST: Save, update, or copy default class fees
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    const {
      class_id,
      class_ids, // for bulk/copy
      academic_year,
      default_amount, // quick total set (e.g. 3500)
      fee_types,
      copy_from_class_id,
    } = body;

    const year = academic_year || "2026-2027";
    const targetSchoolId = new mongoose.Types.ObjectId(schoolId as string);

    // Case 1: Copy fee structure from one class to multiple classes
    if (copy_from_class_id && Array.isArray(class_ids) && class_ids.length > 0) {
      const sourceFee = await ClassFee.findOne({
        school_id: targetSchoolId,
        class_id: new mongoose.Types.ObjectId(copy_from_class_id),
        academic_year: year,
      }).lean();

      if (!sourceFee) {
        return NextResponse.json({ success: false, message: "Source class fee structure not found" }, { status: 404 });
      }

      const updates = class_ids.map(async (cid: string) => {
        return ClassFee.findOneAndUpdate(
          {
            school_id: targetSchoolId,
            class_id: new mongoose.Types.ObjectId(cid),
            academic_year: year,
          },
          {
            fee_types: sourceFee.fee_types,
            total_amount: sourceFee.total_amount,
          },
          { returnDocument: "after", upsert: true }
        );
      });

      await Promise.all(updates);
      invalidateFeesCache(schoolId);

      return NextResponse.json({
        success: true,
        message: `Copied fee structure to ${class_ids.length} class(es)`,
      });
    }

    // Case 2: Save / Update for a single class
    if (!class_id) {
      return NextResponse.json({ success: false, message: "class_id is required" }, { status: 400 });
    }

    let finalFeeTypes = fee_types;
    let totalAmount = 0;

    // If detailed fee_types array provided:
    if (Array.isArray(finalFeeTypes) && finalFeeTypes.length > 0) {
      totalAmount = finalFeeTypes
        .filter((ft: any) => ft.is_enabled)
        .reduce((sum: number, ft: any) => sum + Number(ft.amount || 0), 0);
    } else if (default_amount !== undefined && default_amount !== null) {
      // If quick default_amount is given (e.g., 3500), check if class fee already exists
      const existing = await ClassFee.findOne({
        school_id: targetSchoolId,
        class_id: new mongoose.Types.ObjectId(class_id),
        academic_year: year,
      });

      const parsedAmount = Math.max(0, Number(default_amount) || 0);

      if (existing && existing.fee_types && existing.fee_types.length > 0) {
        // Update the Tuition Fee head or first enabled head
        let updated = false;
        finalFeeTypes = existing.fee_types.map((ft: any) => {
          if (!updated && (ft.name.toLowerCase().includes("tuition") || ft.is_enabled)) {
            updated = true;
            return { ...ft, amount: parsedAmount, is_enabled: true };
          }
          return ft;
        });
        totalAmount = finalFeeTypes
          .filter((ft: any) => ft.is_enabled)
          .reduce((sum: number, ft: any) => sum + Number(ft.amount || 0), 0);
      } else {
        // Create standard heads with Tuition Fees = parsedAmount
        finalFeeTypes = DEFAULT_HEADS.map((h) => ({
          name: h.name,
          amount: h.name === "Tuition Fees" ? parsedAmount : 0,
          frequency: h.frequency,
          is_mandatory: h.is_mandatory,
          is_enabled: h.is_enabled,
        }));
        totalAmount = parsedAmount;
      }
    } else {
      return NextResponse.json(
        { success: false, message: "Either default_amount or fee_types must be provided" },
        { status: 400 }
      );
    }

    const savedClassFee = await ClassFee.findOneAndUpdate(
      {
        school_id: targetSchoolId,
        class_id: new mongoose.Types.ObjectId(class_id),
        academic_year: year,
      },
      {
        fee_types: finalFeeTypes,
        total_amount: totalAmount,
      },
      { returnDocument: "after", upsert: true }
    );

    invalidateFeesCache(schoolId);

    return NextResponse.json({
      success: true,
      message: "Default class fee saved successfully",
      data: savedClassFee,
    });
  } catch (err: any) {
    console.error("[POST /api/fees/class-defaults]", err);
    return NextResponse.json({ success: false, message: err.message || "Failed to save class fee" }, { status: 500 });
  }
}
