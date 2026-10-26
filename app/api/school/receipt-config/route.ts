import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import School from "@/lib/models/School";
import { requireAuth } from "@/lib/utils/auth";
import { DEFAULT_RECEIPT_CONFIG, ReceiptConfig } from "@/lib/types/receipt-builder";

// GET — Fetch the receipt builder configuration for the school
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin", "staff", "accountant"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const school = await School.findById(schoolId)
      .select("name subtitle logo_url address phone receipt_config")
      .lean();

    if (!school) {
      return NextResponse.json({ success: false, message: "School not found" }, { status: 404 });
    }

    const savedConfig = (school as any).receipt_config;
    const mergedConfig: ReceiptConfig = {
      ...DEFAULT_RECEIPT_CONFIG,
      ...(savedConfig || {}),
    };

    return NextResponse.json({
      success: true,
      data: {
        config: mergedConfig,
        schoolInfo: {
          name: school.name || "",
          subtitle: school.subtitle || "",
          logo_url: school.logo_url || "",
          address: school.address || "",
          phone: school.phone || "",
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to load receipt configuration" },
      { status: 500 }
    );
  }
}

// PUT — Save updated receipt builder configuration
export async function PUT(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Invalid payload format" }, { status: 400 });
    }

    const school = await School.findByIdAndUpdate(
      schoolId,
      { $set: { receipt_config: body } },
      { new: true, runValidators: true }
    )
      .select("receipt_config")
      .lean();

    if (!school) {
      return NextResponse.json({ success: false, message: "School not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Receipt template configuration saved successfully",
      data: (school as any).receipt_config,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to save receipt configuration" },
      { status: 500 }
    );
  }
}
