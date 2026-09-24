import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  const { error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/x-icon",
      "image/vnd.microsoft.icon",
      "image/ico",
      "image/svg+xml",
      "application/pdf",
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime"
    ];
    const isIco = file.name?.toLowerCase().endsWith(".ico");
    if (!allowedTypes.includes(file.type) && !isIco) {
      return NextResponse.json(
        { success: false, message: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, ICO, SVG, PDF, MP4, WebM" },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB for videos, 5MB for others)
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: `File too large. Maximum size is ${isVideo ? "25MB" : "5MB"}` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await uploadToCloudinary(buffer, "school-management-uploads");

    return NextResponse.json({ success: true, url: result.secure_url });
  } catch (err) {
    console.error("Upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
