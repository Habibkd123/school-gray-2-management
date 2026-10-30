import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { TransportAllocation } from "@/lib/models";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";

import mongoose from "mongoose";
import Student from "@/lib/models/Student";
import { Route, Bus } from "@/lib/models";

// Server cache & in-flight deduplication (keyed by school_id)
const _allocationsServerCache = new Map<string, { data: any; expiresAt: number }>();
const _allocationsInFlight = new Map<string, Promise<any>>();
const ALLOCATIONS_CACHE_TTL = 60_000;

export function invalidateAllocationsCache(schoolId?: string) {
  if (schoolId) {
    _allocationsServerCache.delete(`alloc_${schoolId}`);
  } else {
    _allocationsServerCache.clear();
  }
}

export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin", "teacher"]);
  if (error) return error;

  const cacheKey = `alloc_${schoolId}`;
  const cached = _allocationsServerCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return sendCompressedJson(request, cached.data, {
      cacheControl: "private, max-age=30, stale-while-revalidate=60",
    });
  }

  const existingInFlight = _allocationsInFlight.get(cacheKey);
  if (existingInFlight) {
    try {
      const payload = await existingInFlight;
      return sendCompressedJson(request, payload, {
        cacheControl: "private, max-age=30, stale-while-revalidate=60",
      });
    } catch (e) {
      // Fall through to retry on error
    }
  }

  try {
    const fetchPromise = (async () => {
      await connectDB();

      const allocations = await TransportAllocation.find({ school_id: schoolId })
        .populate({
          path: "student_id",
          select: "name admission_no class_id",
          populate: { path: "class_id", select: "name section" },
        })
        .populate("route_id", "routeName")
        .populate("bus_id", "busNumber")
        .sort({ createdAt: -1 })
        .lean();

      const transformed = allocations.map((alloc: any) => {
        const student = alloc.student_id;
        const classObj = student?.class_id;
        const className = classObj ? `${classObj.name}${classObj.section ? ` - ${classObj.section}` : ""}` : "N/A";

        return {
          _id: alloc._id,
          id: alloc._id.toString(),
          studentName: student?.name || "Unknown Student",
          studentId: student?._id ? student._id.toString() : "",
          admissionNo: student?.admission_no || "N/A",
          className: className,
          route: alloc.route_id?.routeName || "Unknown",
          route_id: alloc.route_id?._id ? alloc.route_id._id.toString() : "",
          busNumber: alloc.bus_id?.busNumber || "Unknown",
          bus_id: alloc.bus_id?._id ? alloc.bus_id._id.toString() : "",
          pickupStop: alloc.pickupStop,
          status: alloc.status,
          createdAt: alloc.createdAt,
        };
      });

      return { success: true, data: transformed };
    })();

    _allocationsInFlight.set(cacheKey, fetchPromise);

    const payload = await fetchPromise;
    _allocationsServerCache.set(cacheKey, {
      data: payload,
      expiresAt: Date.now() + ALLOCATIONS_CACHE_TTL,
    });
    return sendCompressedJson(request, payload, {
      cacheControl: "private, max-age=30, stale-while-revalidate=60",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    _allocationsInFlight.delete(cacheKey);
  }
}

export async function POST(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    const body = await request.json();
    await connectDB();

    const { student_ids, student_id, route_id, bus_id, pickupStop, status } = body;
    const finalBusId = bus_id || null;
    const allocStatus = status || "Active";

    // 1. Validate route reference
    if (!route_id || !mongoose.Types.ObjectId.isValid(route_id)) {
      return NextResponse.json({ success: false, error: "Valid route_id is required" }, { status: 400 });
    }
    const route = await Route.findOne({ _id: route_id, school_id: schoolId }).lean();
    if (!route) {
      return NextResponse.json({ success: false, error: "Route not found in this school" }, { status: 404 });
    }

    // 2. Validate bus reference and capacity if bus_id provided
    let busDoc: any = null;
    if (finalBusId) {
      if (!mongoose.Types.ObjectId.isValid(finalBusId)) {
        return NextResponse.json({ success: false, error: "Invalid bus_id" }, { status: 400 });
      }
      busDoc = await Bus.findOne({ _id: finalBusId, school_id: schoolId }).lean();
      if (!busDoc) {
        return NextResponse.json({ success: false, error: "Bus not found in this school" }, { status: 404 });
      }
    }

    // Check if bulk allocation is requested via student_ids array
    if (Array.isArray(student_ids) && student_ids.length > 0) {
      // Validate all student IDs are valid ObjectIds
      const invalidIds = student_ids.filter((id: string) => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        return NextResponse.json({ success: false, error: "One or more student_ids are invalid" }, { status: 400 });
      }

      // Verify students belong to this school
      const verifiedStudents = await Student.find({
        _id: { $in: student_ids },
        school_id: schoolId,
      }).select("_id").lean();

      if (verifiedStudents.length !== student_ids.length) {
        return NextResponse.json({
          success: false,
          error: "Some students do not belong to this school or do not exist",
        }, { status: 404 });
      }

      // Check bus capacity for bulk allocation if bus is assigned and status is Active
      if (busDoc && allocStatus === "Active") {
        const currentActiveAllocations = await TransportAllocation.countDocuments({
          school_id: schoolId,
          bus_id: finalBusId,
          status: "Active",
          student_id: { $nin: student_ids }, // exclude re-assignments of same students
        });

        if (currentActiveAllocations + student_ids.length > busDoc.capacity) {
          return NextResponse.json({
            success: false,
            error: `Bulk allocation exceeds vehicle capacity. Maximum capacity is ${busDoc.capacity}, currently occupied: ${currentActiveAllocations}, requested: ${student_ids.length}`,
          }, { status: 400 });
        }
      }

      const results: any[] = [];
      const skipped: string[] = [];

      for (const sId of student_ids) {
        try {
          const doc = await TransportAllocation.findOneAndUpdate(
            { school_id: schoolId, student_id: sId },
            {
              school_id: schoolId,
              student_id: sId,
              route_id,
              bus_id: finalBusId,
              pickupStop,
              status: allocStatus,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          results.push(doc);
        } catch (itemErr: any) {
          skipped.push(sId);
        }
      }

      invalidateAllocationsCache(schoolId as string);
      return NextResponse.json(
        {
          success: true,
          count: results.length,
          skippedCount: skipped.length,
          data: results,
        },
        { status: 201 }
      );
    }

    // Single student allocation validation
    if (!student_id || !mongoose.Types.ObjectId.isValid(student_id)) {
      return NextResponse.json({ success: false, error: "Valid student_id is required" }, { status: 400 });
    }

    const student = await Student.findOne({ _id: student_id, school_id: schoolId }).lean();
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found in this school" }, { status: 404 });
    }

    // Check duplicate student allocation
    const existingAlloc = await TransportAllocation.findOne({
      school_id: schoolId,
      student_id: student_id,
    }).lean();

    if (existingAlloc) {
      return NextResponse.json({
        success: false,
        error: "Student is already allocated to a transport route",
      }, { status: 409 });
    }

    // Check bus capacity for single allocation
    if (busDoc && allocStatus === "Active") {
      const activeCount = await TransportAllocation.countDocuments({
        school_id: schoolId,
        bus_id: finalBusId,
        status: "Active",
      });

      if (activeCount >= busDoc.capacity) {
        return NextResponse.json({
          success: false,
          error: `Bus capacity exceeded. Maximum capacity is ${busDoc.capacity}`,
        }, { status: 400 });
      }
    }

    const newAlloc = await TransportAllocation.create({
      school_id: schoolId as string,
      student_id,
      route_id,
      bus_id: finalBusId,
      pickupStop: pickupStop || "",
      status: allocStatus,
    });

    invalidateAllocationsCache(schoolId as string);

    return NextResponse.json({ success: true, data: newAlloc }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Student is already allocated to a transport route" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
