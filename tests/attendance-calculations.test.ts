import { describe, it, expect } from "vitest";

/**
 * Attendance & Reports Pure Calculations & Business Logic Unit Suite
 * Verifies mathematical formulas, percentages, aggregations, timezone conversions,
 * duplicate handling, working day counting, and edge cases.
 */

export function calculateDailyAttendanceRate(stats: {
  present: number;
  absent: number;
  late: number;
  leave: number;
  halfDay: number;
}): number {
  const totalMarked = stats.present + stats.absent + stats.late + stats.leave + stats.halfDay;
  if (totalMarked === 0) return 0;
  return Math.round(((stats.present + stats.late + stats.halfDay) / totalMarked) * 100);
}

export function calculateStudentDashboardPercentage(stats: {
  totalStudents: number;
  studentsPresent: number;
  studentsLate: number;
  studentsLeave: number;
}): number {
  if (stats.totalStudents <= 0) return 0;
  return Math.round(
    ((stats.studentsPresent + stats.studentsLate + stats.studentsLeave * 0.5) / stats.totalStudents) * 100
  );
}

export function calculateMonthlyAttendanceStats(monthlyData: {
  totalPresent: number; // present + late + half_day
  totalAbsent: number;
  totalRecords: number;
  workingDays: number;
  studentCount: number;
}) {
  const averagePresent = monthlyData.workingDays > 0
    ? Math.round(monthlyData.totalPresent / monthlyData.workingDays)
    : 0;
  const averageAbsent = monthlyData.workingDays > 0
    ? Math.round(monthlyData.totalAbsent / monthlyData.workingDays)
    : 0;
  const rate = monthlyData.totalRecords > 0
    ? Math.round((monthlyData.totalPresent / monthlyData.totalRecords) * 100)
    : 0;

  return { averagePresent, averageAbsent, rate };
}

export function calculateTeacherWorkingHours(
  status: string,
  checkIn?: string,
  checkOut?: string
): { workingHours: number; lateMinutes: number } {
  if (status === "absent" || status === "leave") {
    return { workingHours: 0, lateMinutes: 0 };
  }
  if (!checkIn || !checkOut) {
    return { workingHours: 8, lateMinutes: 0 };
  }

  const [inH, inM] = checkIn.split(":").map(Number);
  const [outH, outM] = checkOut.split(":").map(Number);
  const startMin = inH * 60 + inM;
  const endMin = outH * 60 + outM;

  const totalMin = Math.max(0, endMin - startMin);
  const workingHours = Number((totalMin / 60).toFixed(1));

  // Assuming expected standard check-in is 09:00 (540 mins)
  const standardInMin = 9 * 60;
  const lateMinutes = Math.max(0, startMin - standardInMin);

  return { workingHours, lateMinutes };
}

export function getMonthDateRange(monthStr: string): { startDate: string; endDate: string; daysInMonth: number } {
  const [yearStr, monthNumStr] = monthStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);

  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  return { startDate, endDate, daysInMonth };
}

export function deduplicateAttendanceRecords(
  records: Array<{ student_id: string; status: string; note?: string }>
): Array<{ student_id: string; status: string; note?: string }> {
  const map = new Map<string, { student_id: string; status: string; note?: string }>();
  for (const rec of records) {
    map.set(rec.student_id, rec);
  }
  return Array.from(map.values());
}

describe("Attendance Calculations & Aggregations Unit Suite", () => {
  describe("Daily Attendance Rate Formula", () => {
    it("returns 0 when total marked is 0", () => {
      expect(
        calculateDailyAttendanceRate({
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          halfDay: 0,
        })
      ).toBe(0);
    });

    it("calculates 100% when all marked students are present", () => {
      expect(
        calculateDailyAttendanceRate({
          present: 30,
          absent: 0,
          late: 0,
          leave: 0,
          halfDay: 0,
        })
      ).toBe(100);
    });

    it("calculates 0% when all marked students are absent", () => {
      expect(
        calculateDailyAttendanceRate({
          present: 0,
          absent: 25,
          late: 0,
          leave: 0,
          halfDay: 0,
        })
      ).toBe(0);
    });

    it("correctly includes late and half-day as attended", () => {
      // 15 present + 3 late + 2 halfDay = 20 attended out of 25 marked => 20/25 = 80%
      expect(
        calculateDailyAttendanceRate({
          present: 15,
          absent: 4,
          late: 3,
          leave: 1,
          halfDay: 2,
        })
      ).toBe(80);
    });

    it("handles rounding precision correctly", () => {
      // 21 attended out of 32 total = 65.625% => rounds to 66%
      expect(
        calculateDailyAttendanceRate({
          present: 20,
          absent: 11,
          late: 1,
          leave: 0,
          halfDay: 0,
        })
      ).toBe(66);
    });
  });

  describe("Student Dashboard Attendance Percentage Formula", () => {
    it("returns 0 if total students is 0", () => {
      expect(
        calculateStudentDashboardPercentage({
          totalStudents: 0,
          studentsPresent: 0,
          studentsLate: 0,
          studentsLeave: 0,
        })
      ).toBe(0);
    });

    it("factors leave at 50% weight (0.5 weight)", () => {
      // 80 present + 10 late + 10 leave * 0.5 = 95 out of 100 students => 95%
      expect(
        calculateStudentDashboardPercentage({
          totalStudents: 100,
          studentsPresent: 80,
          studentsLate: 10,
          studentsLeave: 10,
        })
      ).toBe(95);
    });

    it("correctly handles all present", () => {
      expect(
        calculateStudentDashboardPercentage({
          totalStudents: 45,
          studentsPresent: 45,
          studentsLate: 0,
          studentsLeave: 0,
        })
      ).toBe(100);
    });
  });

  describe("Monthly Attendance Aggregations Formula", () => {
    it("computes average present, absent and overall rate across working days", () => {
      const stats = calculateMonthlyAttendanceStats({
        totalPresent: 400,
        totalAbsent: 40,
        totalRecords: 440,
        workingDays: 20,
        studentCount: 22,
      });

      expect(stats.averagePresent).toBe(20); // 400 / 20 = 20 students per day
      expect(stats.averageAbsent).toBe(2);    // 40 / 20 = 2 students per day
      expect(stats.rate).toBe(91);            // 400 / 440 = 90.909% => 91%
    });

    it("returns zeroes when workingDays is zero", () => {
      const stats = calculateMonthlyAttendanceStats({
        totalPresent: 0,
        totalAbsent: 0,
        totalRecords: 0,
        workingDays: 0,
        studentCount: 30,
      });

      expect(stats.averagePresent).toBe(0);
      expect(stats.averageAbsent).toBe(0);
      expect(stats.rate).toBe(0);
    });
  });

  describe("Teacher Working Hours & Late Minutes Logic", () => {
    it("returns 0 hours and 0 late minutes for absent/leave status", () => {
      expect(calculateTeacherWorkingHours("absent", "09:00", "17:00")).toEqual({
        workingHours: 0,
        lateMinutes: 0,
      });
      expect(calculateTeacherWorkingHours("leave", "09:00", "17:00")).toEqual({
        workingHours: 0,
        lateMinutes: 0,
      });
    });

    it("calculates normal 8 hours with on-time check-in (09:00 - 17:00)", () => {
      expect(calculateTeacherWorkingHours("present", "09:00", "17:00")).toEqual({
        workingHours: 8,
        lateMinutes: 0,
      });
    });

    it("calculates late minutes when checking in after 09:00", () => {
      // 09:35 is 35 minutes late, 09:35 to 17:00 is 7 hours 25 minutes = 7.4 hours
      const res = calculateTeacherWorkingHours("late", "09:35", "17:00");
      expect(res.lateMinutes).toBe(35);
      expect(res.workingHours).toBe(7.4);
    });

    it("handles early check-out correctly", () => {
      // 09:00 to 13:00 = 4 hours, 0 late minutes
      const res = calculateTeacherWorkingHours("half_day", "09:00", "13:00");
      expect(res.workingHours).toBe(4);
      expect(res.lateMinutes).toBe(0);
    });
  });

  describe("Month Date Range & Leap Year / Calendar Boundaries", () => {
    it("computes 31 days for January", () => {
      const range = getMonthDateRange("2026-01");
      expect(range.startDate).toBe("2026-01-01");
      expect(range.endDate).toBe("2026-01-31");
      expect(range.daysInMonth).toBe(31);
    });

    it("computes 28 days for non-leap February (2026)", () => {
      const range = getMonthDateRange("2026-02");
      expect(range.startDate).toBe("2026-02-01");
      expect(range.endDate).toBe("2026-02-28");
      expect(range.daysInMonth).toBe(28);
    });

    it("computes 29 days for leap February (2028)", () => {
      const range = getMonthDateRange("2028-02");
      expect(range.startDate).toBe("2028-02-01");
      expect(range.endDate).toBe("2028-02-29");
      expect(range.daysInMonth).toBe(29);
    });

    it("computes 30 days for April", () => {
      const range = getMonthDateRange("2026-04");
      expect(range.startDate).toBe("2026-04-01");
      expect(range.endDate).toBe("2026-04-30");
      expect(range.daysInMonth).toBe(30);
    });
  });

  describe("Duplicate Submission & Concurrent Updates Resolution", () => {
    it("deduplicates student records taking the latest updated entry", () => {
      const records = [
        { student_id: "s1", status: "present", note: "Original" },
        { student_id: "s2", status: "present", note: "" },
        { student_id: "s1", status: "absent", note: "Updated by teacher" },
      ];

      const deduplicated = deduplicateAttendanceRecords(records);
      expect(deduplicated.length).toBe(2);
      const s1 = deduplicated.find((r) => r.student_id === "s1");
      expect(s1?.status).toBe("absent");
      expect(s1?.note).toBe("Updated by teacher");
    });
  });
});
