import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import { generateAccessToken } from "@/lib/utils/jwt";

// Route handlers for Transport
import {
  GET as getRoutes,
  POST as createRoute,
  invalidateRoutesCache,
} from "@/app/api/transport/routes/route";
import {
  GET as getRouteById,
  PUT as updateRouteById,
  DELETE as deleteRouteById,
} from "@/app/api/transport/routes/[id]/route";

import {
  GET as getBuses,
  POST as createBus,
  invalidateBusesCache,
} from "@/app/api/transport/buses/route";
import {
  GET as getBusById,
  PUT as updateBusById,
  DELETE as deleteBusById,
} from "@/app/api/transport/buses/[id]/route";

import {
  GET as getAllocations,
  POST as createAllocation,
  invalidateAllocationsCache,
} from "@/app/api/transport/allocations/route";
import {
  GET as getAllocationById,
  PUT as updateAllocationById,
  DELETE as deleteAllocationById,
} from "@/app/api/transport/allocations/[id]/route";

// Route handlers for Rooms
import {
  GET as getRooms,
  POST as createRoom,
} from "@/app/api/rooms/route";
import {
  GET as getRoomById,
  PUT as updateRoomById,
  DELETE as deleteRoomById,
} from "@/app/api/rooms/[id]/route";

// Route handlers for Timetable/Schedules (Room conflict checking)
import {
  POST as createSchedule,
  invalidateSchedulesCache,
} from "@/app/api/schedules/route";

import { Bus, Route, TransportAllocation, Room, Timetable } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import User from "@/lib/models/User";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("transport-infra");
  invalidateRoutesCache();
  invalidateBusesCache();
  invalidateAllocationsCache();
  invalidateSchedulesCache();
}, 30000);

afterAll(async () => {
  await teardownTestDatabase("transport-infra");
});

describe("Deep Transport & Infrastructure Test Suite (/api/transport/*, /api/rooms/*)", () => {
  let schoolAAdminToken: string;
  let schoolBAdminToken: string;
  let teacherTokenA: string;
  let studentTokenA: string;

  // Additional test students for vehicle capacity tests
  let student2A: any;
  let student3A: any;
  let student4A: any;
  let student5A: any;

  beforeAll(async () => {
    schoolAAdminToken = generateAccessToken({
      user_id: ctx.schoolAAdmin._id.toString(),
      school_id: ctx.schoolA._id.toString(),
      role: "school_admin",
    });

    schoolBAdminToken = generateAccessToken({
      user_id: ctx.schoolBAdmin._id.toString(),
      school_id: ctx.schoolB._id.toString(),
      role: "school_admin",
    });

    teacherTokenA = generateAccessToken({
      user_id: ctx.schoolATeacher._id.toString(),
      school_id: ctx.schoolA._id.toString(),
      role: "teacher",
    });

    studentTokenA = generateAccessToken({
      user_id: ctx.schoolAStudent._id.toString(),
      school_id: ctx.schoolA._id.toString(),
      role: "student",
    });

    // Create extra students in School A for capacity testing
    const passwordHash = await bcrypt.hash("Password123#", 10);
    const u2 = await User.create({
      name: "Student Two",
      email: "student2@testschool.com",
      username: "student2.transport",
      password_hash: passwordHash,
      role: "student",
      school_id: ctx.schoolA._id,
      is_active: true,
    });
    student2A = await Student.create({
      school_id: ctx.schoolA._id,
      user_id: u2._id,
      class_id: ctx.classA1._id,
      name: "Student Two",
      roll_no: "202",
      admission_no: "TI-ADM-002",
      academic_year: "2026-2027",
      gender: "male",
      phone: "9111111112",
      guardian_name: "G2",
      guardian_phone: "9111111122",
      guardian_relation: "Father",
      is_active: true,
    });

    const u3 = await User.create({
      name: "Student Three",
      email: "student3@testschool.com",
      username: "student3.transport",
      password_hash: passwordHash,
      role: "student",
      school_id: ctx.schoolA._id,
      is_active: true,
    });
    student3A = await Student.create({
      school_id: ctx.schoolA._id,
      user_id: u3._id,
      class_id: ctx.classA1._id,
      name: "Student Three",
      roll_no: "203",
      admission_no: "TI-ADM-003",
      academic_year: "2026-2027",
      gender: "female",
      phone: "9111111113",
      guardian_name: "G3",
      guardian_phone: "9111111123",
      guardian_relation: "Mother",
      is_active: true,
    });

    const u4 = await User.create({
      name: "Student Four",
      email: "student4@testschool.com",
      username: "student4.transport",
      password_hash: passwordHash,
      role: "student",
      school_id: ctx.schoolA._id,
      is_active: true,
    });
    student4A = await Student.create({
      school_id: ctx.schoolA._id,
      user_id: u4._id,
      class_id: ctx.classA1._id,
      name: "Student Four",
      roll_no: "204",
      admission_no: "TI-ADM-004",
      academic_year: "2026-2027",
      gender: "male",
      phone: "9111111114",
      guardian_name: "G4",
      guardian_phone: "9111111124",
      guardian_relation: "Father",
      is_active: true,
    });

    const u5 = await User.create({
      name: "Student Five",
      email: "student5@testschool.com",
      username: "student5.transport",
      password_hash: passwordHash,
      role: "student",
      school_id: ctx.schoolA._id,
      is_active: true,
    });
    student5A = await Student.create({
      school_id: ctx.schoolA._id,
      user_id: u5._id,
      class_id: ctx.classA1._id,
      name: "Student Five",
      roll_no: "205",
      admission_no: "TI-ADM-005",
      academic_year: "2026-2027",
      gender: "female",
      phone: "9111111115",
      guardian_name: "G5",
      guardian_phone: "9111111125",
      guardian_relation: "Mother",
      is_active: true,
    });
  });

  // ─── 1. Authentication & Role Authorization ──────────────────────────────────
  describe("Authentication & Role Authorization", () => {
    it("should reject unauthenticated requests to transport routes with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/routes");
      const res = await getRoutes(req);
      expect(res.status).toBe(401);
    });

    it("should reject unauthenticated requests to buses with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/buses");
      const res = await getBuses(req);
      expect(res.status).toBe(401);
    });

    it("should reject unauthenticated requests to allocations with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/allocations");
      const res = await getAllocations(req);
      expect(res.status).toBe(401);
    });

    it("should reject unauthenticated requests to rooms with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/rooms");
      const res = await getRooms(req);
      expect(res.status).toBe(401);
    });

    it("should reject expired token with 401", async () => {
      const expiredToken = jwt.sign(
        {
          user_id: ctx.schoolAAdmin._id.toString(),
          school_id: ctx.schoolA._id.toString(),
          role: "school_admin",
        },
        process.env.JWT_ACCESS_SECRET || "school_access_secret_key_2026",
        { expiresIn: "-5s" }
      );
      const req = new NextRequest("http://localhost:3000/api/transport/routes", {
        headers: { authorization: `Bearer ${expiredToken}` },
      });
      const res = await getRoutes(req);
      expect(res.status).toBe(401);
    });

    it("should reject student attempting to create transport route with 403", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/routes", {
        method: "POST",
        headers: {
          authorization: `Bearer ${studentTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ routeName: "Student Route" }),
      });
      const res = await createRoute(req);
      expect(res.status).toBe(403);
    });

    it("should reject student attempting to create room with 403", async () => {
      const req = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        headers: {
          authorization: `Bearer ${studentTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ room_no: "999" }),
      });
      const res = await createRoom(req);
      expect(res.status).toBe(403);
    });

    it("should reject teacher attempting to create transport route with 403", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/routes", {
        method: "POST",
        headers: {
          authorization: `Bearer ${teacherTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ routeName: "Teacher Route" }),
      });
      const res = await createRoute(req);
      expect(res.status).toBe(403);
    });
  });

  // ─── 2. Route CRUD & Validations ─────────────────────────────────────────────
  describe("Route CRUD & Validations", () => {
    let createdRouteId: string;

    it("should reject route creation without routeName with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/routes", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          startPoint: "Downtown",
          endPoint: "Campus",
        }),
      });
      const res = await createRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/route name is required/i);
    });

    it("should create a valid transport route with stops and times", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/routes", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          routeName: "North Route",
          startPoint: "North Terminal",
          endPoint: "Alpha School Gate",
          stops: [
            { name: "Stop A", time: "07:30 AM" },
            { name: "Stop B", time: "07:45 AM" },
          ],
          morningTime: "07:30 AM",
          eveningTime: "03:30 PM",
        }),
      });
      const res = await createRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.routeName).toBe("North Route");
      expect(json.data.stops.length).toBe(2);
      createdRouteId = json.data._id;
    });

    it("should reject duplicate route name in the same school with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/routes", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          routeName: "North Route",
          startPoint: "Different Start",
        }),
      });
      const res = await createRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/route name already exists/i);
    });

    it("should allow same route name in School B (tenant isolation)", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/routes", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolBAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          routeName: "North Route",
          startPoint: "Beta Station",
        }),
      });
      const res = await createRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.routeName).toBe("North Route");
    });

    it("should get list of routes for School A", async () => {
      invalidateRoutesCache(ctx.schoolA._id.toString());
      const req = new NextRequest("http://localhost:3000/api/transport/routes", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getRoutes(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      const found = json.data.find((r: any) => r._id === createdRouteId);
      expect(found).toBeDefined();
    });

    it("should get single route by ID", async () => {
      const req = new NextRequest(`http://localhost:3000/api/transport/routes/${createdRouteId}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getRouteById(req, { params: Promise.resolve({ id: createdRouteId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.routeName).toBe("North Route");
    });

    it("should update route details via PUT", async () => {
      const req = new NextRequest(`http://localhost:3000/api/transport/routes/${createdRouteId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          routeName: "North Express Route",
          morningTime: "07:15 AM",
        }),
      });
      const res = await updateRouteById(req, { params: Promise.resolve({ id: createdRouteId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.routeName).toBe("North Express Route");
      expect(json.data.morningTime).toBe("07:15 AM");
    });
  });

  // ─── 3. Vehicle / Bus CRUD, Capacity & Bidirectional Sync ────────────────────
  describe("Vehicle / Bus CRUD, Capacity & Bidirectional Sync", () => {
    let createdBusId: string;
    let syncRouteId: string;

    it("should reject bus creation without busNumber with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/buses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ capacity: 40 }),
      });
      const res = await createBus(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/bus number is required/i);
    });

    it("should reject bus creation with negative or zero capacity with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/buses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          busNumber: "BUS-INV-01",
          capacity: -10,
        }),
      });
      const res = await createBus(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/capacity must be a positive number/i);
    });

    it("should create a valid bus with positive capacity", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/buses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          busNumber: "BUS-01",
          busModel: "Tata Starbus 2024",
          driverName: "Michael Driver",
          driverPhone: "9876543299",
          capacity: 2, // low capacity for capacity testing!
          registrationNo: "DL-01-AB-1234",
        }),
      });
      const res = await createBus(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.busNumber).toBe("BUS-01");
      expect(json.data.capacity).toBe(2);
      createdBusId = json.data._id;
    });

    it("should reject duplicate bus number in the same school with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/buses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          busNumber: "BUS-01",
          capacity: 30,
        }),
      });
      const res = await createBus(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/bus number already exists/i);
    });

    it("should reject updating bus with invalid or negative capacity", async () => {
      const req = new NextRequest(`http://localhost:3000/api/transport/buses/${createdBusId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ capacity: 0 }),
      });
      const res = await updateBusById(req, { params: Promise.resolve({ id: createdBusId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/capacity must be a positive number/i);
    });

    it("should test bidirectional route-bus assignment synchronization", async () => {
      // Create a dedicated route for sync testing
      const rReq = new NextRequest("http://localhost:3000/api/transport/routes", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          routeName: "Central Loop",
          startPoint: "Central Plaza",
          endPoint: "School Gate",
        }),
      });
      const rRes = await createRoute(rReq);
      const rJson = await rRes.json();
      syncRouteId = rJson.data._id;

      // Assign Route "Central Loop" to BUS-01 via bus PUT
      const bReq = new NextRequest(`http://localhost:3000/api/transport/buses/${createdBusId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          assignedRoute: "Central Loop",
        }),
      });
      const bRes = await updateBusById(bReq, { params: Promise.resolve({ id: createdBusId }) });
      expect(bRes.status).toBe(200);

      // Verify that Route "Central Loop" now has assignedBus = "BUS-01"
      const updatedRoute = await Route.findById(syncRouteId).lean();
      expect(updatedRoute?.assignedBus).toBe("BUS-01");

      // Now unassign by setting route's assignedBus to "Not Assigned"
      const rUpdateReq = new NextRequest(`http://localhost:3000/api/transport/routes/${syncRouteId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          assignedBus: "Not Assigned",
        }),
      });
      const rUpdateRes = await updateRouteById(rUpdateReq, { params: Promise.resolve({ id: syncRouteId }) });
      expect(rUpdateRes.status).toBe(200);

      // Verify bus also unassigned
      const updatedBus = await Bus.findById(createdBusId).lean();
      expect(updatedBus?.assignedRoute).toBe("Not Assigned");
    });
  });

  // ─── 4. Transport Allocations & Vehicle Capacity Enforcement ─────────────────
  describe("Transport Allocations & Vehicle Capacity Enforcement", () => {
    let testBus: any;
    let testRoute: any;
    let alloc1Id: string;

    beforeAll(async () => {
      // Create a test route
      testRoute = await Route.create({
        school_id: ctx.schoolA._id,
        routeName: "Express East",
        startPoint: "East Gate",
        endPoint: "School",
      });

      // Create a test bus with capacity = 2
      testBus = await Bus.create({
        school_id: ctx.schoolA._id,
        busNumber: "BUS-CAP-2",
        capacity: 2,
        assignedRoute: "Express East",
      });
    });

    it("should reject allocation with invalid route_id with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/allocations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          student_id: ctx.studentDocA._id.toString(),
          route_id: "invalid-id",
        }),
      });
      const res = await createAllocation(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/valid route_id is required/i);
    });

    it("should reject allocation when route does not exist in school with 404", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const req = new NextRequest("http://localhost:3000/api/transport/allocations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          student_id: ctx.studentDocA._id.toString(),
          route_id: nonExistentId,
        }),
      });
      const res = await createAllocation(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/route not found/i);
    });

    it("should reject allocation when student belongs to School B (cross-tenant)", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/allocations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          student_id: ctx.studentDocB._id.toString(), // School B's student
          route_id: testRoute._id.toString(),
        }),
      });
      const res = await createAllocation(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/student not found in this school/i);
    });

    it("should successfully allocate student 1 to bus (1 / 2 seats occupied)", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/allocations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          student_id: ctx.studentDocA._id.toString(),
          route_id: testRoute._id.toString(),
          bus_id: testBus._id.toString(),
          pickupStop: "Stop 1",
          status: "Active",
        }),
      });
      const res = await createAllocation(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.student_id).toBe(ctx.studentDocA._id.toString());
      alloc1Id = json.data._id;
    });

    it("should reject duplicate allocation for the same student with 409", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/allocations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          student_id: ctx.studentDocA._id.toString(),
          route_id: testRoute._id.toString(),
          bus_id: testBus._id.toString(),
        }),
      });
      const res = await createAllocation(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/already allocated/i);
    });

    it("should successfully allocate student 2 to bus (2 / 2 seats occupied - Full)", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/allocations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          student_id: student2A._id.toString(),
          route_id: testRoute._id.toString(),
          bus_id: testBus._id.toString(),
          pickupStop: "Stop 2",
          status: "Active",
        }),
      });
      const res = await createAllocation(req);
      expect(res.status).toBe(201);
    });

    it("should reject student 3 allocation due to vehicle capacity limit (capacity = 2)", async () => {
      const req = new NextRequest("http://localhost:3000/api/transport/allocations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          student_id: student3A._id.toString(),
          route_id: testRoute._id.toString(),
          bus_id: testBus._id.toString(),
          pickupStop: "Stop 3",
          status: "Active",
        }),
      });
      const res = await createAllocation(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/bus capacity exceeded/i);
    });

    it("should reject bulk allocation exceeding remaining vehicle capacity", async () => {
      // Create a bus with capacity = 2
      const bus3 = await Bus.create({
        school_id: ctx.schoolA._id,
        busNumber: "BUS-BULK-2",
        capacity: 2,
      });

      // Try to bulk allocate 3 students (student3, student4, student5)
      const req = new NextRequest("http://localhost:3000/api/transport/allocations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          student_ids: [
            student3A._id.toString(),
            student4A._id.toString(),
            student5A._id.toString(),
          ],
          route_id: testRoute._id.toString(),
          bus_id: bus3._id.toString(),
          status: "Active",
        }),
      });
      const res = await createAllocation(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/exceeds vehicle capacity/i);
    });

    it("should succeed bulk allocation when within vehicle capacity", async () => {
      const bus3 = await Bus.findOne({ busNumber: "BUS-BULK-2" });
      const req = new NextRequest("http://localhost:3000/api/transport/allocations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          student_ids: [
            student3A._id.toString(),
            student4A._id.toString(),
          ],
          route_id: testRoute._id.toString(),
          bus_id: bus3?._id.toString(),
          status: "Active",
        }),
      });
      const res = await createAllocation(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.count).toBe(2);
    });

    it("should fetch single allocation by ID with populated references", async () => {
      const req = new NextRequest(`http://localhost:3000/api/transport/allocations/${alloc1Id}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getAllocationById(req, { params: Promise.resolve({ id: alloc1Id }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.student_id).toBeDefined();
      expect(json.data.route_id).toBeDefined();
      expect(json.data.bus_id).toBeDefined();
    });

    it("should reject updating allocation to a bus that is already full", async () => {
      // testBus has capacity = 2 and currently has 2 active students (ctx.studentDocA and student2A)
      // student5A has an allocation on another bus. Let's create an allocation for student5A on another bus first.
      const busFree = await Bus.create({
        school_id: ctx.schoolA._id,
        busNumber: "BUS-FREE",
        capacity: 10,
      });
      const alloc5 = await TransportAllocation.create({
        school_id: ctx.schoolA._id,
        student_id: student5A._id,
        route_id: testRoute._id,
        bus_id: busFree._id,
        status: "Active",
      });

      // Try to move alloc5 to testBus (which is full)
      const req = new NextRequest(`http://localhost:3000/api/transport/allocations/${alloc5._id}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bus_id: testBus._id.toString(),
        }),
      });
      const res = await updateAllocationById(req, { params: Promise.resolve({ id: alloc5._id.toString() }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/bus capacity exceeded/i);
    });
  });

  // ─── 5. Deletion Dependencies ────────────────────────────────────────────────
  describe("Deletion Dependencies", () => {
    let depRoute: any;
    let depBus: any;
    let depAlloc: any;

    beforeAll(async () => {
      depRoute = await Route.create({
        school_id: ctx.schoolA._id,
        routeName: "Dependency Route",
      });

      depBus = await Bus.create({
        school_id: ctx.schoolA._id,
        busNumber: "BUS-DEP-01",
        capacity: 10,
        assignedRoute: "Dependency Route",
      });

      // Allocate a dummy user/student to this route & bus
      const passwordHash = await bcrypt.hash("Password123#", 10);
      const uDep = await User.create({
        name: "Student Dep",
        email: "studentdep@testschool.com",
        username: "student.dep.unique",
        password_hash: passwordHash,
        role: "student",
        school_id: ctx.schoolA._id,
        is_active: true,
      });
      const sDep = await Student.create({
        school_id: ctx.schoolA._id,
        user_id: uDep._id,
        class_id: ctx.classA1._id,
        name: "Student Dep",
        roll_no: "299",
        admission_no: "DEP-ADM-001",
        academic_year: "2026-2027",
        gender: "male",
        phone: "9111119999",
        guardian_name: "GDep",
        guardian_phone: "9111118888",
        guardian_relation: "Father",
        is_active: true,
      });

      depAlloc = await TransportAllocation.create({
        school_id: ctx.schoolA._id,
        student_id: sDep._id,
        route_id: depRoute._id,
        bus_id: depBus._id,
        status: "Active",
      });
    });

    it("should reject deleting route when active student allocations exist with 400", async () => {
      const req = new NextRequest(`http://localhost:3000/api/transport/routes/${depRoute._id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await deleteRouteById(req, { params: Promise.resolve({ id: depRoute._id.toString() }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/cannot delete route with active student allocations/i);
    });

    it("should reject deleting bus when active student allocations exist with 400", async () => {
      const req = new NextRequest(`http://localhost:3000/api/transport/buses/${depBus._id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await deleteBusById(req, { params: Promise.resolve({ id: depBus._id.toString() }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/cannot delete bus with active student allocations/i);
    });

    it("should allow deleting allocation first, then successfully delete route and bus", async () => {
      // 1. Delete allocation
      const delAllocReq = new NextRequest(`http://localhost:3000/api/transport/allocations/${depAlloc._id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const delAllocRes = await deleteAllocationById(delAllocReq, { params: Promise.resolve({ id: depAlloc._id.toString() }) });
      expect(delAllocRes.status).toBe(200);

      // 2. Delete bus
      const delBusReq = new NextRequest(`http://localhost:3000/api/transport/buses/${depBus._id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const delBusRes = await deleteBusById(delBusReq, { params: Promise.resolve({ id: depBus._id.toString() }) });
      expect(delBusRes.status).toBe(200);

      // 3. Delete route
      const delRouteReq = new NextRequest(`http://localhost:3000/api/transport/routes/${depRoute._id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const delRouteRes = await deleteRouteById(delRouteReq, { params: Promise.resolve({ id: depRoute._id.toString() }) });
      expect(delRouteRes.status).toBe(200);
    });
  });

  // ─── 6. Classroom & Infrastructure (Rooms CRUD & Capacity) ───────────────────
  describe("Classroom & Infrastructure (Rooms CRUD & Capacity)", () => {
    let createdRoomId: string;

    it("should reject room creation without room_no with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ capacity: 40 }),
      });
      const res = await createRoom(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/room number is required/i);
    });

    it("should reject room creation with negative or zero capacity with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          room_no: "Room 101",
          capacity: -5,
        }),
      });
      const res = await createRoom(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/capacity must be a positive number/i);
    });

    it("should successfully create a classroom with positive capacity", async () => {
      const req = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          room_no: "Room 101",
          capacity: 45,
          is_active: true,
        }),
      });
      const res = await createRoom(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.room_no).toBe("Room 101");
      expect(json.data.capacity).toBe(45);
      createdRoomId = json.data._id;
    });

    it("should reject duplicate room number in the same school with 409 Conflict", async () => {
      const req = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          room_no: "Room 101",
          capacity: 35,
        }),
      });
      const res = await createRoom(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toMatch(/already exists/i);
    });

    it("should allow same room number in School B (tenant scoping)", async () => {
      const req = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolBAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          room_no: "Room 101",
          capacity: 40,
        }),
      });
      const res = await createRoom(req);
      expect(res.status).toBe(201);
    });

    it("should fetch single room by ID", async () => {
      const req = new NextRequest(`http://localhost:3000/api/rooms/${createdRoomId}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getRoomById(req, { params: Promise.resolve({ id: createdRoomId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.room_no).toBe("Room 101");
    });

    it("should reject updating room with invalid capacity with 400", async () => {
      const req = new NextRequest(`http://localhost:3000/api/rooms/${createdRoomId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ capacity: 0 }),
      });
      const res = await updateRoomById(req, { params: Promise.resolve({ id: createdRoomId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/capacity must be a positive number/i);
    });

    it("should update room details via PUT", async () => {
      const req = new NextRequest(`http://localhost:3000/api/rooms/${createdRoomId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          capacity: 50,
          room_no: "Room 101-A",
        }),
      });
      const res = await updateRoomById(req, { params: Promise.resolve({ id: createdRoomId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.capacity).toBe(50);
      expect(json.data.room_no).toBe("Room 101-A");
    });

    it("should delete room via DELETE", async () => {
      const req = new NextRequest(`http://localhost:3000/api/rooms/${createdRoomId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await deleteRoomById(req, { params: Promise.resolve({ id: createdRoomId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toMatch(/deleted/i);
    });
  });

  // ─── 7. Conflicting Schedules (Rooms & Infrastructure Timetables) ─────────────
  describe("Conflicting Schedules (Rooms & Infrastructure Timetables)", () => {
    let roomA: any;

    beforeAll(async () => {
      roomA = await Room.create({
        school_id: ctx.schoolA._id,
        room_no: "Lab 201",
        capacity: 30,
      });
    });

    it("should schedule a period in Lab 201 on Monday 09:00 - 10:00 successfully", async () => {
      const req = new NextRequest("http://localhost:3000/api/schedules", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          classId: ctx.classA1._id.toString(),
          subject: ctx.subjectA1.name,
          teacherId: ctx.teacherDocA._id.toString(),
          day: "Monday",
          startTime: "09:00 AM",
          endTime: "10:00 AM",
          room: "Lab 201",
        }),
      });
      const res = await createSchedule(req);
      expect(res.status).toBe(201);
    });

    it("should reject conflicting period booking in the same room with 409 Conflict", async () => {
      // Different class and different teacher, but SAME ROOM at overlapping time (09:30 - 10:30)
      const req = new NextRequest("http://localhost:3000/api/schedules", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          classId: ctx.classA2._id.toString(),
          subject: ctx.subjectA2.name,
          day: "Monday",
          startTime: "09:30 AM",
          endTime: "10:30 AM",
          room: "Lab 201",
        }),
      });
      const res = await createSchedule(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toMatch(/already booked|already occupied/i);
    });

    it("should allow adjacent non-overlapping period in Lab 201 (10:00 - 11:00)", async () => {
      const req = new NextRequest("http://localhost:3000/api/schedules", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          classId: ctx.classA2._id.toString(),
          subject: ctx.subjectA2.name,
          day: "Monday",
          startTime: "10:00 AM",
          endTime: "11:00 AM",
          room: "Lab 201",
        }),
      });
      const res = await createSchedule(req);
      expect(res.status).toBe(201);
    });
  });

  // ─── 8. Multi-tenant Isolation & IDOR Protection ─────────────────────────────
  describe("Multi-tenant Isolation & IDOR Protection", () => {
    let routeB: any;
    let busB: any;
    let roomB: any;

    beforeAll(async () => {
      routeB = await Route.create({
        school_id: ctx.schoolB._id,
        routeName: "Beta Express",
      });

      busB = await Bus.create({
        school_id: ctx.schoolB._id,
        busNumber: "BUS-BETA-01",
        capacity: 30,
      });

      roomB = await Room.create({
        school_id: ctx.schoolB._id,
        room_no: "Beta Room 501",
        capacity: 40,
      });
    });

    it("should prevent School A Admin from viewing School B's route (IDOR)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/transport/routes/${routeB._id}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getRouteById(req, { params: Promise.resolve({ id: routeB._id.toString() }) });
      expect(res.status).toBe(404);
    });

    it("should prevent School A Admin from updating School B's route", async () => {
      const req = new NextRequest(`http://localhost:3000/api/transport/routes/${routeB._id}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ routeName: "Hacked Route" }),
      });
      const res = await updateRouteById(req, { params: Promise.resolve({ id: routeB._id.toString() }) });
      expect(res.status).toBe(404);
    });

    it("should prevent School A Admin from deleting School B's bus", async () => {
      const req = new NextRequest(`http://localhost:3000/api/transport/buses/${busB._id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await deleteBusById(req, { params: Promise.resolve({ id: busB._id.toString() }) });
      expect(res.status).toBe(404);
    });

    it("should prevent School A Admin from updating School B's room", async () => {
      const req = new NextRequest(`http://localhost:3000/api/rooms/${roomB._id}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ capacity: 100 }),
      });
      const res = await updateRoomById(req, { params: Promise.resolve({ id: roomB._id.toString() }) });
      expect(res.status).toBe(404);
    });

    it("should prevent School A Admin from deleting School B's room", async () => {
      const req = new NextRequest(`http://localhost:3000/api/rooms/${roomB._id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await deleteRoomById(req, { params: Promise.resolve({ id: roomB._id.toString() }) });
      expect(res.status).toBe(404);
    });
  });

  // ─── 9. Concurrent Assignments & Race Condition Defense ──────────────────────
  describe("Concurrent Assignments & Race Condition Defense", () => {
    it("should handle concurrent allocation requests gracefully without integrity violations", async () => {
      const concRoute = await Route.create({
        school_id: ctx.schoolA._id,
        routeName: "Concurrent Route",
      });

      const concBus = await Bus.create({
        school_id: ctx.schoolA._id,
        busNumber: "BUS-CONC-1",
        capacity: 10,
      });

      // Create 3 extra students
      const passwordHash = await bcrypt.hash("Password123#", 10);
      const studentIds: string[] = [];

      for (let i = 1; i <= 3; i++) {
        const u = await User.create({
          name: `Concurrent Student ${i}`,
          email: `conc.student.${i}@testschool.com`,
          username: `conc.student.${i}`,
          password_hash: passwordHash,
          role: "student",
          school_id: ctx.schoolA._id,
          is_active: true,
        });
        const s = await Student.create({
          school_id: ctx.schoolA._id,
          user_id: u._id,
          class_id: ctx.classA1._id,
          name: `Concurrent Student ${i}`,
          roll_no: `90${i}`,
          admission_no: `CONC-ADM-00${i}`,
          academic_year: "2026-2027",
          gender: "male",
          phone: `911119000${i}`,
          guardian_name: "Guardian",
          guardian_phone: `911118000${i}`,
          guardian_relation: "Father",
          is_active: true,
        });
        studentIds.push(s._id.toString());
      }

      // Fire 3 simultaneous allocation requests
      const promises = studentIds.map((sId) => {
        const req = new NextRequest("http://localhost:3000/api/transport/allocations", {
          method: "POST",
          headers: {
            authorization: `Bearer ${schoolAAdminToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            student_id: sId,
            route_id: concRoute._id.toString(),
            bus_id: concBus._id.toString(),
            status: "Active",
          }),
        });
        return createAllocation(req);
      });

      const responses = await Promise.all(promises);
      const statuses = responses.map((r) => r.status);
      expect(statuses.every((s) => s === 201)).toBe(true);

      // Verify that all 3 allocations were registered in DB
      const dbAllocations = await TransportAllocation.find({
        school_id: ctx.schoolA._id,
        bus_id: concBus._id,
      });
      expect(dbAllocations.length).toBe(3);
    });
  });
});
