import { describe, it, expect, afterAll } from "vitest";
import { GET } from "@/app/api/classes/route";
import { NextRequest } from "next/server";
import { generateAccessToken } from "@/lib/utils/jwt";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import Class from "@/lib/models/Class";

describe("Classes API include_stats=false test", () => {
  const testSchoolId = new mongoose.Types.ObjectId();

  afterAll(async () => {
    await connectToDatabase();
    await Class.deleteMany({ school_id: testSchoolId });
  });

  it("should return classes when include_stats=false is queried (as in ClassService and Add Student)", async () => {
    await connectToDatabase();

    await Class.create({
      school_id: testSchoolId,
      name: "Class 10-A Verified",
      section: "A",
      academic_year: "2026-2027",
      capacity: 35,
      status: "Active"
    });

    const token = generateAccessToken({
      user_id: "test_user_id",
      school_id: testSchoolId.toString(),
      role: "school_admin",
    });

    const req = new NextRequest("http://localhost:3000/api/classes?limit=all&include_stats=false", {
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data.classes)).toBe(true);
    expect(json.data.classes.length).toBeGreaterThanOrEqual(1);
    expect(json.data.classes[0].name).toBe("Class 10-A Verified");
  });
});
