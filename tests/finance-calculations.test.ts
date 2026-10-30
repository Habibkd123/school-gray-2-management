import { describe, it, expect } from "vitest";

// Pure financial calculations tested against independent expected values
describe("Finance — Fees & Salaries Financial Calculations & Precision", () => {
  describe("Fee Calculations & Balance Rules", () => {
    it("should calculate outstanding balance accurately: balance = max(0, totalFees - totalPaid)", () => {
      const totalFees = 35000;
      const totalPaid = 15000;
      const balance = Math.max(0, totalFees - totalPaid);
      expect(balance).toBe(20000);
    });

    it("should prevent negative balance when totalPaid exceeds or equals totalFees", () => {
      const totalFees = 25000;
      const totalPaid = 25000;
      const balance = Math.max(0, totalFees - totalPaid);
      expect(balance).toBe(0);

      const overpaid = 26000;
      const balanceOverpaid = Math.max(0, totalFees - overpaid);
      expect(balanceOverpaid).toBe(0);
    });

    it("should compute grand total with fine, discount, scholarship, waiver, and round-off accurately", () => {
      // Subtotal of fee heads
      const feeHeads = [
        { name: "Academic Fees", amount: 10000 },
        { name: "Tuition Fees", amount: 3500 },
        { name: "Transport Fees", amount: 1500 },
      ];
      const subtotal = feeHeads.reduce((acc, h) => acc + h.amount, 0); // 15,000
      expect(subtotal).toBe(15000);

      const fine = 250;
      const discount = 500;
      const scholarship = 1000;
      const waiver = 250;
      const adjustment = 100;
      const roundOff = -0.50;

      // Grand Total = (subtotal + fine) - (discount + scholarship + waiver + adjustment) + roundOff
      const totalDeductions = discount + scholarship + waiver + adjustment; // 1850
      const calculated = (subtotal + fine) - totalDeductions + roundOff; // 15250 - 1850 - 0.5 = 13399.50
      const grandTotal = Math.max(0.01, Math.round(calculated * 100) / 100);

      // Independent expected value:
      // (15000 + 250) - (500 + 1000 + 250 + 100) - 0.50 = 13399.50
      expect(grandTotal).toBe(13399.5);
    });

    it("should enforce minimum payment threshold of 0.01 if deductions exceed subtotal + fine", () => {
      const subtotal = 1000;
      const fine = 0;
      const waiver = 1500;
      const calculated = Math.max(0.01, (subtotal + fine) - waiver);
      expect(calculated).toBe(0.01);
    });

    it("should correctly calculate billing multiplier based on frequency and calendar months", () => {
      const getMultiplier = (frequency: string, startStr: string, endStr: string) => {
        if (!startStr || !endStr) return 1;
        const start = new Date(startStr);
        const end = new Date(endStr);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 1;
        if (frequency === "One Time" || frequency === "Yearly") return 1;

        const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
        switch (frequency) {
          case "Monthly":
            return Math.max(1, monthsDiff);
          case "Quarterly":
            return Math.max(1, Math.ceil(monthsDiff / 3));
          case "Half Yearly":
            return Math.max(1, Math.ceil(monthsDiff / 6));
          default:
            return 1;
        }
      };

      // June to November = 6 months
      expect(getMultiplier("Monthly", "2026-06-01", "2026-11-30")).toBe(6);
      expect(getMultiplier("Quarterly", "2026-06-01", "2026-11-30")).toBe(2);
      expect(getMultiplier("Half Yearly", "2026-06-01", "2026-11-30")).toBe(1);
      expect(getMultiplier("One Time", "2026-06-01", "2026-11-30")).toBe(1);
      expect(getMultiplier("Yearly", "2026-06-01", "2026-11-30")).toBe(1);
    });
  });

  describe("Salary & Attendance-Based Deductions Calculations", () => {
    it("should compute daily salary rate and suggested deduction with 2 decimal places precision", () => {
      const monthlySalary = 50000;
      const dailySalary = Math.round((monthlySalary / 30) * 100) / 100;
      // 50000 / 30 = 1666.666666... → 1666.67
      expect(dailySalary).toBe(1666.67);

      const absentDays = 3;
      const suggestedDeduction = Math.round((absentDays * dailySalary) * 100) / 100;
      // 3 * 1666.67 = 5000.01
      expect(suggestedDeduction).toBe(5000.01);

      const payableAmount = Math.max(0, Math.round((monthlySalary - suggestedDeduction) * 100) / 100);
      // 50000 - 5000.01 = 44999.99
      expect(payableAmount).toBe(44999.99);
    });

    it("should calculate zero deduction for full attendance (0 absent days)", () => {
      const monthlySalary = 65000;
      const dailySalary = Math.round((monthlySalary / 30) * 100) / 100;
      const absentDays = 0;
      const suggestedDeduction = Math.round((absentDays * dailySalary) * 100) / 100;
      const payableAmount = Math.max(0, Math.round((monthlySalary - suggestedDeduction) * 100) / 100);

      expect(suggestedDeduction).toBe(0);
      expect(payableAmount).toBe(65000);
    });

    it("should calculate half-day attendance (0.5 absent days) accurately", () => {
      const monthlySalary = 45000;
      const dailySalary = Math.round((monthlySalary / 30) * 100) / 100; // 1500.00
      expect(dailySalary).toBe(1500);

      const halfDays = 1;
      const absentDays = halfDays * 0.5; // 0.5
      const suggestedDeduction = Math.round((absentDays * dailySalary) * 100) / 100; // 750.00
      expect(suggestedDeduction).toBe(750);

      const payableAmount = Math.max(0, Math.round((monthlySalary - suggestedDeduction) * 100) / 100);
      expect(payableAmount).toBe(44250);
    });

    it("should compute final salary with allowances and deductions", () => {
      const payableAmount = 44999.99;
      const bonus = 2500;
      const overtimeAmount = 1200;
      const deduction = 500;
      const taxDeduction = 1000;

      // Final = payable + bonus - deduction + overtime - tax
      const finalSalary = Math.max(
        0,
        Math.round((payableAmount + bonus - deduction + overtimeAmount - taxDeduction) * 100) / 100
      );
      // 44999.99 + 2500 - 500 + 1200 - 1000 = 47199.99
      expect(finalSalary).toBe(47199.99);
    });
  });

  describe("Currency Formatting & Precision", () => {
    it("should format currency in Indian numbering system without precision loss", () => {
      const money = (val: number) => {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);
      };

      const formatted1 = money(50000);
      expect(formatted1).toMatch(/₹\s?50,000/);

      const formatted2 = money(125000.50);
      expect(formatted2).toMatch(/₹\s?1,25,000\.5/);

      const formatted3 = money(1000000);
      expect(formatted3).toMatch(/₹\s?10,000,00|₹\s?10,00,000/);
    });
  });
});
