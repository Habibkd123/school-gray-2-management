import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RolePermission } from "@/lib/models";
import { requireAuth } from "@/lib/utils/auth";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { sendConditionalJson } from "@/lib/etag";

const _permissionsCache = new Map<string, { data: any; expiresAt: number }>();
const PERM_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── GET /api/settings/permissions — Fetch all permissions ─────────────────
export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request);
  if (error) return error;

  const cacheKey = String(schoolId);
  const cached = _permissionsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return sendConditionalJson(
      request,
      { success: true, data: cached.data },
      { cacheControl: "private, max-age=300, stale-while-revalidate=60" }
    );
  }

  try {
    await connectDB();
    const customPerms = await RolePermission.find({ school_id: schoolId }).lean();
    
    // Copy the default permissions map
    const mergedPerms: Record<string, any> = JSON.parse(JSON.stringify(ROLE_PERMISSIONS));
    
    customPerms.forEach((doc) => {
      if (doc.role) {
        // Mongoose maps can be converted to plain objects via lean() or Object.fromEntries
        const permsObj = doc.permissions instanceof Map 
          ? Object.fromEntries(doc.permissions) 
          : doc.permissions;
        mergedPerms[doc.role] = permsObj || {};
      }
    });

    _permissionsCache.set(cacheKey, {
      data: mergedPerms,
      expiresAt: Date.now() + PERM_CACHE_TTL_MS,
    });

    return sendConditionalJson(
      request,
      { success: true, data: mergedPerms },
      { cacheControl: "private, max-age=300, stale-while-revalidate=60" }
    );
  } catch (err) {
    console.error("[GET /api/settings/permissions]", err);
    return NextResponse.json({ success: false, message: "Failed to fetch permissions" }, { status: 500 });
  }
}

// ─── POST /api/settings/permissions — Save permissions for a role ──────────
export async function POST(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectDB();
    const { role, permissions } = await request.json();

    if (!role) {
      return NextResponse.json({ success: false, message: "Role is required" }, { status: 400 });
    }

    const doc = await RolePermission.findOneAndUpdate(
      { school_id: schoolId, role },
      { $set: { permissions } },
      { new: true, upsert: true }
    );

    _permissionsCache.delete(String(schoolId));

    return NextResponse.json({ success: true, message: "Permissions updated successfully", data: doc });
  } catch (err) {
    console.error("[POST /api/settings/permissions]", err);
    return NextResponse.json({ success: false, message: "Failed to update permissions" }, { status: 500 });
  }
}
