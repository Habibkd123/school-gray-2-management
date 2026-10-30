import { describe, it, expect } from "vitest";

// ─── 1. Transport & Fleet Domain Logic ─────────────────────────────────────
export function calculateFleetCapacity(buses: Array<{ capacity: number; status: string }>): number {
  return buses
    .filter(b => b.status === "Active")
    .reduce((sum, b) => sum + (Number(b.capacity) || 0), 0);
}

export function calculateBusUtilization(allocatedCount: number, capacity: number): {
  percentage: number;
  isOverCapacity: boolean;
  availableSeats: number;
} {
  if (capacity <= 0) {
    return { percentage: 0, isOverCapacity: allocatedCount > 0, availableSeats: 0 };
  }
  const percentage = Math.round((allocatedCount / capacity) * 100);
  const availableSeats = Math.max(0, capacity - allocatedCount);
  const isOverCapacity = allocatedCount > capacity;
  return { percentage, isOverCapacity, availableSeats };
}

export function validateBusCapacityConstraint(
  currentAllocations: number,
  capacity: number,
  newStudentsCount: number = 1
): { valid: boolean; error?: string } {
  if (capacity <= 0) {
    return { valid: false, error: "Bus has no seat capacity configured." };
  }
  if (currentAllocations + newStudentsCount > capacity) {
    const excess = (currentAllocations + newStudentsCount) - capacity;
    return {
      valid: false,
      error: `Capacity exceeded by ${excess} student(s). Maximum capacity is ${capacity}.`,
    };
  }
  return { valid: true };
}

// ─── 2. Student Transport Allocation & Duplicate Checker ────────────────────
export interface StudentAllocationRecord {
  id?: string;
  student_id: string;
  route_id: string;
  bus_id: string;
  academic_year: string;
  status: "Active" | "Inactive";
}

export function checkDuplicateAllocation(
  existingAllocations: StudentAllocationRecord[],
  studentId: string,
  academicYear: string
): { isDuplicate: boolean; conflict?: StudentAllocationRecord } {
  const conflict = existingAllocations.find(
    a => a.student_id === studentId && a.academic_year === academicYear && a.status === "Active"
  );
  return {
    isDuplicate: !!conflict,
    conflict,
  };
}

export function validateBatchAllocations(
  existingAllocations: StudentAllocationRecord[],
  incomingStudentIds: string[],
  academicYear: string,
  busCapacity: number,
  currentBusAllocations: number
): {
  valid: boolean;
  duplicateIds: string[];
  capacityExceeded: boolean;
  error?: string;
} {
  // Check duplicates within the incoming batch itself
  const seen = new Set<string>();
  const duplicateIds: string[] = [];

  for (const id of incomingStudentIds) {
    if (seen.has(id)) {
      duplicateIds.push(id);
    }
    seen.add(id);
  }

  // Check against existing allocations
  for (const id of incomingStudentIds) {
    const existing = existingAllocations.find(
      a => a.student_id === id && a.academic_year === academicYear && a.status === "Active"
    );
    if (existing && !duplicateIds.includes(id)) {
      duplicateIds.push(id);
    }
  }

  const capacityCheck = validateBusCapacityConstraint(
    currentBusAllocations,
    busCapacity,
    incomingStudentIds.length
  );

  if (duplicateIds.length > 0) {
    return {
      valid: false,
      duplicateIds,
      capacityExceeded: !capacityCheck.valid,
      error: `Duplicate active allocation detected for student IDs: ${duplicateIds.join(", ")}`,
    };
  }

  if (!capacityCheck.valid) {
    return {
      valid: false,
      duplicateIds: [],
      capacityExceeded: true,
      error: capacityCheck.error,
    };
  }

  return { valid: true, duplicateIds: [], capacityExceeded: false };
}

// ─── 3. Route & Stops Sequence Calculations ─────────────────────────────────
export interface RouteStop {
  name: string;
  time: string;
}

export function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function calculateStopsDuration(stops: RouteStop[]): {
  totalDurationMinutes: number;
  isValidSequence: boolean;
  intervals: number[];
} {
  if (stops.length < 2) {
    return { totalDurationMinutes: 0, isValidSequence: true, intervals: [] };
  }

  const timesInMinutes = stops.map(s => parseTimeToMinutes(s.time));
  const intervals: number[] = [];
  let isValid = true;

  for (let i = 1; i < timesInMinutes.length; i++) {
    const diff = timesInMinutes[i] - timesInMinutes[i - 1];
    intervals.push(diff);
    if (diff < 0) {
      isValid = false; // Sequence went backwards in time
    }
  }

  const totalDurationMinutes = timesInMinutes[timesInMinutes.length - 1] - timesInMinutes[0];
  return {
    totalDurationMinutes: Math.max(0, totalDurationMinutes),
    isValidSequence: isValid,
    intervals,
  };
}

// ─── 4. Room Management & Conflict Detection ────────────────────────────────
export interface TimetableSlot {
  room_id: string;
  day_of_week: string; // "Monday", "Tuesday", etc.
  start_time: string;  // "09:00"
  end_time: string;    // "10:00"
}

export function detectRoomScheduleConflict(
  existingSchedules: TimetableSlot[],
  newSchedule: TimetableSlot
): { hasConflict: boolean; conflictingSlot?: TimetableSlot; reason?: string } {
  const newStart = parseTimeToMinutes(newSchedule.start_time);
  const newEnd = parseTimeToMinutes(newSchedule.end_time);

  if (newStart >= newEnd) {
    return { hasConflict: true, reason: "End time must be after start time." };
  }

  for (const existing of existingSchedules) {
    // Conflict only possible if same room and same day
    if (existing.room_id !== newSchedule.room_id) continue;
    if (existing.day_of_week.toLowerCase() !== newSchedule.day_of_week.toLowerCase()) continue;

    const existStart = parseTimeToMinutes(existing.start_time);
    const existEnd = parseTimeToMinutes(existing.end_time);

    // Two intervals [A, B] and [C, D] overlap if max(A, C) < min(B, D)
    const overlap = Math.max(newStart, existStart) < Math.min(newEnd, existEnd);
    if (overlap) {
      return {
        hasConflict: true,
        conflictingSlot: existing,
        reason: `Room is already booked on ${newSchedule.day_of_week} between ${existing.start_time} and ${existing.end_time}.`,
      };
    }
  }

  return { hasConflict: false };
}

export function checkRoomCapacitySufficiency(
  roomCapacity: number,
  studentCount: number
): { isSufficient: boolean; deficit: number } {
  const deficit = Math.max(0, studentCount - roomCapacity);
  return {
    isSufficient: studentCount <= roomCapacity,
    deficit,
  };
}

// ─── 5. Holiday Working Days & Date Range Engine ────────────────────────────
export function calculateHolidayDurationDays(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return 0;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
}

export function calculateNetWorkingDays(
  rangeStart: Date,
  rangeEnd: Date,
  holidays: Array<{ date: string | Date; status: string }>,
  excludeWeekends = true
): { workingDays: number; weekendDays: number; holidayDays: number } {
  let workingDays = 0;
  let weekendDays = 0;
  let holidayDays = 0;

  const activeHolidayStrings = new Set(
    holidays
      .filter(h => h.status === "Active")
      .map(h => new Date(h.date).toISOString().slice(0, 10))
  );

  const current = new Date(rangeStart);
  while (current <= rangeEnd) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    const dateStr = current.toISOString().slice(0, 10);
    const isHoliday = activeHolidayStrings.has(dateStr);

    if (excludeWeekends && isWeekend) {
      weekendDays++;
    } else if (isHoliday) {
      holidayDays++;
    } else {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return { workingDays, weekendDays, holidayDays };
}

// ─── 6. Notice Board Audience & Security Upload Checker ─────────────────────
export function filterNoticesForAudience<T extends { target_audience: string; is_published: boolean }>(
  notices: T[],
  userRole: "student" | "teacher" | "parent" | "school_admin" | "super_admin"
): T[] {
  const roleToAudienceMap: Record<string, string> = {
    student: "students",
    teacher: "teachers",
    parent: "parents",
    school_admin: "staff",
    super_admin: "staff",
  };

  const targetAudience = roleToAudienceMap[userRole] || "all";

  return notices.filter(n => {
    if (!n.is_published) return false;
    return n.target_audience === "all" || n.target_audience === targetAudience;
  });
}

export function validateAttachmentFile(fileName: string, fileSize: number, mimeType: string): {
  valid: boolean;
  error?: string;
} {
  if (fileSize === 0) {
    return { valid: false, error: "File cannot be empty" };
  }

  // Path traversal check
  if (fileName.includes("../") || fileName.includes("..\\") || fileName.includes("\0")) {
    return { valid: false, error: "Malicious filename detected" };
  }

  // Dangerous extensions check
  const dangerousExtensions = /\.(exe|bat|cmd|sh|php|pl|cgi|py|js|vbs|msi|dll|scr)$/i;
  if (dangerousExtensions.test(fileName)) {
    return { valid: false, error: "Executable or script files are strictly prohibited" };
  }

  // Allowed types
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "video/mp4",
  ];

  if (!allowedTypes.includes(mimeType)) {
    return { valid: false, error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF, MP4" };
  }

  // Size limit: 25MB for video, 5MB for others
  const isVideo = mimeType.startsWith("video/");
  const maxSize = isVideo ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
  if (fileSize > maxSize) {
    return { valid: false, error: `File exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB` };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS SUITE
// ═══════════════════════════════════════════════════════════════════════════

describe("Operations & Infrastructure Domain Engine & Calculations", () => {
  describe("Fleet Capacity & Vehicle Allocation Constraints", () => {
    it("correctly calculates total active fleet capacity, ignoring inactive vehicles", () => {
      const fleet = [
        { capacity: 40, status: "Active" },
        { capacity: 30, status: "Active" },
        { capacity: 25, status: "Inactive" },
      ];
      expect(calculateFleetCapacity(fleet)).toBe(70);
    });

    it("calculates bus seat utilization percentage and remaining seats", () => {
      const result = calculateBusUtilization(30, 40);
      expect(result.percentage).toBe(75);
      expect(result.availableSeats).toBe(10);
      expect(result.isOverCapacity).toBe(false);
    });

    it("detects when vehicle is at exact capacity (100% full)", () => {
      const result = calculateBusUtilization(40, 40);
      expect(result.percentage).toBe(100);
      expect(result.availableSeats).toBe(0);
      expect(result.isOverCapacity).toBe(false);
    });

    it("flags over-capacity when allocations exceed bus seats", () => {
      const result = calculateBusUtilization(45, 40);
      expect(result.percentage).toBe(113);
      expect(result.availableSeats).toBe(0);
      expect(result.isOverCapacity).toBe(true);
    });

    it("enforces capacity constraints when adding new students", () => {
      // 38 allocated out of 40. Adding 2 succeeds.
      const passResult = validateBusCapacityConstraint(38, 40, 2);
      expect(passResult.valid).toBe(true);

      // Adding 3 exceeds capacity by 1.
      const failResult = validateBusCapacityConstraint(38, 40, 3);
      expect(failResult.valid).toBe(false);
      expect(failResult.error).toContain("Capacity exceeded by 1 student(s)");
    });
  });

  describe("Student Transport Allocation & Duplicate Prevention", () => {
    const existing: StudentAllocationRecord[] = [
      {
        student_id: "st-001",
        route_id: "rt-101",
        bus_id: "bus-01",
        academic_year: "2026-2027",
        status: "Active",
      },
      {
        student_id: "st-002",
        route_id: "rt-101",
        bus_id: "bus-01",
        academic_year: "2025-2026", // past year
        status: "Active",
      },
      {
        student_id: "st-003",
        route_id: "rt-102",
        bus_id: "bus-02",
        academic_year: "2026-2027",
        status: "Inactive", // cancelled
      },
    ];

    it("identifies active duplicate transport allocation for the current academic year", () => {
      const res = checkDuplicateAllocation(existing, "st-001", "2026-2027");
      expect(res.isDuplicate).toBe(true);
      expect(res.conflict?.route_id).toBe("rt-101");
    });

    it("permits allocation if previous allocation was in a past academic year", () => {
      const res = checkDuplicateAllocation(existing, "st-002", "2026-2027");
      expect(res.isDuplicate).toBe(false);
    });

    it("permits allocation if existing allocation is Inactive/Cancelled", () => {
      const res = checkDuplicateAllocation(existing, "st-003", "2026-2027");
      expect(res.isDuplicate).toBe(false);
    });

    it("validates batch allocations for both internal duplicates and vehicle capacity", () => {
      // Batch with internal duplicate: ["st-10", "st-10"]
      const dupBatch = validateBatchAllocations(existing, ["st-10", "st-10"], "2026-2027", 30, 10);
      expect(dupBatch.valid).toBe(false);
      expect(dupBatch.duplicateIds).toContain("st-10");

      // Batch exceeding remaining bus capacity: 5 incoming students on a bus with 2 remaining seats
      const capBatch = validateBatchAllocations(existing, ["st-11", "st-12", "st-13", "st-14", "st-15"], "2026-2027", 20, 18);
      expect(capBatch.valid).toBe(false);
      expect(capBatch.capacityExceeded).toBe(true);

      // Valid batch
      const validBatch = validateBatchAllocations(existing, ["st-20", "st-21"], "2026-2027", 30, 10);
      expect(validBatch.valid).toBe(true);
    });
  });

  describe("Route Timing & Sequence Engine", () => {
    it("converts 12-hour AM/PM times into total minutes from midnight", () => {
      expect(parseTimeToMinutes("06:30 AM")).toBe(6 * 60 + 30);
      expect(parseTimeToMinutes("12:00 PM")).toBe(12 * 60);
      expect(parseTimeToMinutes("01:15 PM")).toBe(13 * 60 + 15);
      expect(parseTimeToMinutes("12:30 AM")).toBe(30);
    });

    it("calculates total route duration and verifies chronological stop sequence", () => {
      const stops: RouteStop[] = [
        { name: "Main Campus", time: "06:30 AM" },
        { name: "City Station", time: "07:00 AM" },
        { name: "Terminal North", time: "07:25 AM" },
      ];
      const result = calculateStopsDuration(stops);
      expect(result.isValidSequence).toBe(true);
      expect(result.totalDurationMinutes).toBe(55);
      expect(result.intervals).toEqual([30, 25]);
    });

    it("flags invalid stop sequences where time goes backwards", () => {
      const invalidStops: RouteStop[] = [
        { name: "Stop 1", time: "07:30 AM" },
        { name: "Stop 2", time: "07:15 AM" },
      ];
      const result = calculateStopsDuration(invalidStops);
      expect(result.isValidSequence).toBe(false);
    });
  });

  describe("Room Management, Capacity & Timetable Conflicts", () => {
    it("verifies room capacity sufficiency for class enrollments", () => {
      expect(checkRoomCapacitySufficiency(40, 35).isSufficient).toBe(true);
      expect(checkRoomCapacitySufficiency(40, 45).isSufficient).toBe(false);
      expect(checkRoomCapacitySufficiency(40, 45).deficit).toBe(5);
    });

    const schedules: TimetableSlot[] = [
      { room_id: "room-101", day_of_week: "Monday", start_time: "09:00", end_time: "10:00" },
      { room_id: "room-101", day_of_week: "Monday", start_time: "11:00", end_time: "12:00" },
      { room_id: "room-102", day_of_week: "Monday", start_time: "09:00", end_time: "10:00" },
    ];

    it("detects exact overlap in same room on the same day", () => {
      const conflict = detectRoomScheduleConflict(schedules, {
        room_id: "room-101",
        day_of_week: "Monday",
        start_time: "09:00",
        end_time: "10:00",
      });
      expect(conflict.hasConflict).toBe(true);
    });

    it("detects partial overlap in same room on the same day", () => {
      const conflict = detectRoomScheduleConflict(schedules, {
        room_id: "room-101",
        day_of_week: "Monday",
        start_time: "09:30",
        end_time: "10:30",
      });
      expect(conflict.hasConflict).toBe(true);
    });

    it("allows contiguous non-overlapping slots (10:00 to 11:00) in same room", () => {
      const noConflict = detectRoomScheduleConflict(schedules, {
        room_id: "room-101",
        day_of_week: "Monday",
        start_time: "10:00",
        end_time: "11:00",
      });
      expect(noConflict.hasConflict).toBe(false);
    });

    it("allows same time slot in different room or on different day", () => {
      // Different room
      const diffRoom = detectRoomScheduleConflict(schedules, {
        room_id: "room-103",
        day_of_week: "Monday",
        start_time: "09:00",
        end_time: "10:00",
      });
      expect(diffRoom.hasConflict).toBe(false);

      // Different day
      const diffDay = detectRoomScheduleConflict(schedules, {
        room_id: "room-101",
        day_of_week: "Tuesday",
        start_time: "09:00",
        end_time: "10:00",
      });
      expect(diffDay.hasConflict).toBe(false);
    });
  });

  describe("Holidays Calendar & Working Days Engine", () => {
    it("calculates holiday duration across date ranges inclusive", () => {
      expect(calculateHolidayDurationDays("2026-01-01", "2026-01-01")).toBe(1);
      expect(calculateHolidayDurationDays("2026-03-20", "2026-03-25")).toBe(6);
    });

    it("accurately calculates net working days excluding weekends and official holidays", () => {
      // 2026-01-01 (Thursday) to 2026-01-07 (Wednesday) = 7 days
      // Jan 1: Thursday (Holiday)
      // Jan 2: Friday (Working)
      // Jan 3: Saturday (Weekend)
      // Jan 4: Sunday (Weekend)
      // Jan 5: Monday (Working)
      // Jan 6: Tuesday (Working)
      // Jan 7: Wednesday (Working)
      // Total: 4 working days, 2 weekend days, 1 holiday day
      const holidays = [
        { date: "2026-01-01", status: "Active" },
        { date: "2026-01-15", status: "Active" }, // outside range
      ];

      const res = calculateNetWorkingDays(
        new Date("2026-01-01"),
        new Date("2026-01-07"),
        holidays
      );

      expect(res.weekendDays).toBe(2);
      expect(res.holidayDays).toBe(1);
      expect(res.workingDays).toBe(4);
    });
  });

  describe("Notices & File Upload Security Validation", () => {
    const notices = [
      { title: "General School Notice", target_audience: "all", is_published: true },
      { title: "Teacher Exam Prep", target_audience: "teachers", is_published: true },
      { title: "Student Holiday Homework", target_audience: "students", is_published: true },
      { title: "Draft Board Policy", target_audience: "staff", is_published: false },
    ];

    it("filters notices strictly by target audience role, always including 'all'", () => {
      const studentNotices = filterNoticesForAudience(notices, "student");
      expect(studentNotices.map(n => n.title)).toEqual([
        "General School Notice",
        "Student Holiday Homework",
      ]);

      const teacherNotices = filterNoticesForAudience(notices, "teacher");
      expect(teacherNotices.map(n => n.title)).toEqual([
        "General School Notice",
        "Teacher Exam Prep",
      ]);
    });

    it("hides unpublished drafts from viewers", () => {
      const adminNotices = filterNoticesForAudience(notices, "school_admin");
      expect(adminNotices.find(n => n.title === "Draft Board Policy")).toBeUndefined();
    });

    it("enforces strict file upload constraints for notice attachments", () => {
      // Pass valid PDF
      expect(validateAttachmentFile("exam_schedule.pdf", 1024 * 500, "application/pdf").valid).toBe(true);

      // Reject empty file
      expect(validateAttachmentFile("empty.pdf", 0, "application/pdf").valid).toBe(false);

      // Reject dangerous executable extensions
      expect(validateAttachmentFile("trojan.exe", 1024, "application/octet-stream").valid).toBe(false);
      expect(validateAttachmentFile("exploit.php", 1024, "application/x-php").valid).toBe(false);
      expect(validateAttachmentFile("script.js", 1024, "text/javascript").valid).toBe(false);

      // Reject path traversal injection
      expect(validateAttachmentFile("../../etc/passwd.pdf", 1024, "application/pdf").valid).toBe(false);

      // Reject files exceeding max size (e.g. 10MB PDF)
      expect(validateAttachmentFile("large.pdf", 10 * 1024 * 1024, "application/pdf").valid).toBe(false);
    });
  });
});
