import mongoose from "mongoose";
import connectDB from "@/lib/db";
import School from "@/lib/models/School";
import User from "@/lib/models/User";
import Class from "@/lib/models/Class";
import Student from "@/lib/models/Student";
import Admission from "@/lib/models/Admission";
import Teacher from "@/lib/models/Teacher";
import {
  SubjectMaster,
  TeacherAssignment,
  Section,
  Stream,
  Subject,
  Syllabus,
  Exam,
  ExamSchedule,
  Result,
  ResultAudit,
  Grade,
  ClassTest,
  ClassTestMark,
  ClassTestMarkAudit,
  Attendance,
  Holiday,
  ClassFee,
  StudentFeePayment,
  StudentFeeAssignment,
  SalaryPayment,
  FeeGroup,
  FeeType,
  FeeMaster,
  FeeAllocation,
  FeesStructure,
  Notice,
  Homework,
  Bus,
  Route,
  TransportAllocation,
  Room,
} from "@/lib/models/index";
import Parent from "@/lib/models/Parent";
import bcrypt from "bcryptjs";

export interface TestDataContext {
  schoolA: any;
  schoolB: any;
  classA1: any;
  classA2: any;
  classB1: any;
  studentDocA: any;
  studentDocB: any;
  teacherDocA: any;
  teacherDocB: any;
  subjectA1: any;
  subjectA2: any;
  subjectB1: any;
  superAdmin: any;
  schoolAAdmin: any;
  schoolATeacher: any;
  schoolAStudent: any;
  schoolBAdmin: any;
  schoolBTeacher: any;
  schoolBStudent: any;
}

export async function setupTestDatabase(prefix = "test"): Promise<TestDataContext> {
  await connectDB();

  const slugA = `${prefix}-school-alpha`;
  const slugB = `${prefix}-school-beta`;
  const domainA = `${prefix}-admin@testschool.com`;
  const domainTeacherA = `${prefix}-teacher@testschool.com`;
  const domainStudentA = `${prefix}-student@testschool.com`;
  const domainB = `${prefix}-admin@testschool.org`;
  const domainTeacherB = `${prefix}-teacher@testschool.org`;
  const domainStudentB = `${prefix}-student@testschool.org`;

  // Clean any previous test data with test slugs/emails
  await User.deleteMany({
    email: { $in: [domainA, domainTeacherA, domainStudentA, domainB, domainTeacherB, domainStudentB, `${prefix}-superadmin@myschoollife.com`] },
  });
  const existingSchools = await School.find({ slug: { $in: [slugA, slugB] } }).select("_id").lean();
  const schoolIds = existingSchools.map(s => s._id);
  if (schoolIds.length > 0) {
    await Student.deleteMany({ school_id: { $in: schoolIds } });
    await Teacher.deleteMany({ school_id: { $in: schoolIds } });
    await TeacherAssignment.deleteMany({ school_id: { $in: schoolIds } });
    await SubjectMaster.deleteMany({ school_id: { $in: schoolIds } });
    await Subject.deleteMany({ school_id: { $in: schoolIds } });
    await Syllabus.deleteMany({ school_id: { $in: schoolIds } });
    await Exam.deleteMany({ school_id: { $in: schoolIds } });
    await ExamSchedule.deleteMany({ school_id: { $in: schoolIds } });
    await Result.deleteMany({ school_id: { $in: schoolIds } });
    await ResultAudit.deleteMany({ school_id: { $in: schoolIds } });
    await Grade.deleteMany({ school_id: { $in: schoolIds } });
    await ClassTest.deleteMany({ school_id: { $in: schoolIds } });
    await ClassTestMark.deleteMany({ school_id: { $in: schoolIds } });
    await ClassTestMarkAudit.deleteMany({ school_id: { $in: schoolIds } });
    await Section.deleteMany({ school_id: { $in: schoolIds } });
    await Stream.deleteMany({ school_id: { $in: schoolIds } });
    await Class.deleteMany({ school_id: { $in: schoolIds } });
    await Admission.deleteMany({ school_id: { $in: schoolIds } });
    await Homework.deleteMany({ school_id: { $in: schoolIds } });
    await TransportAllocation.deleteMany({ school_id: { $in: schoolIds } });
    await Bus.deleteMany({ school_id: { $in: schoolIds } });
    await Route.deleteMany({ school_id: { $in: schoolIds } });
    await Room.deleteMany({ school_id: { $in: schoolIds } });
    await School.deleteMany({ _id: { $in: schoolIds } });
  }

  // 1. Create School Alpha
  const schoolA = await School.create({
    name: `Alpha International School (${prefix})`,
    slug: slugA,
    subdomain: `${prefix}-alpha`,
    is_active: true,
    academic_config: {
      enable_streams: false,
      enable_sections: true,
    },
    login_config: {
      disable_student_login: false,
      disable_teacher_login: false,
    },
  });

  // 2. Create School Beta (for cross-tenant IDOR tests)
  const schoolB = await School.create({
    name: `Beta Grammar School (${prefix})`,
    slug: slugB,
    subdomain: `${prefix}-beta`,
    is_active: true,
    academic_config: {
      enable_streams: false,
      enable_sections: true,
    },
    login_config: {
      disable_student_login: false,
      disable_teacher_login: false,
    },
  });

  // 3. Classes
  const classA1 = await Class.create({
    school_id: schoolA._id,
    name: "Class 10",
    section: "A",
    academic_year: "2026-2027",
    capacity: 40,
    status: "Active",
  });

  const classA2 = await Class.create({
    school_id: schoolA._id,
    name: "Class 11",
    section: "A",
    academic_year: "2026-2027",
    capacity: 40,
    status: "Active",
  });

  const classB1 = await Class.create({
    school_id: schoolB._id,
    name: "Class 10",
    section: "B",
    academic_year: "2026-2027",
    capacity: 40,
    status: "Active",
  });

  const passwordHash = await bcrypt.hash("Password123#", 10);

  // 4. Super Admin
  const superAdmin = await User.create({
    name: `Global Super Admin (${prefix})`,
    email: `${prefix}-superadmin@myschoollife.com`,
    username: `${prefix}.superadmin`,
    password_hash: passwordHash,
    role: "super_admin",
    school_id: null,
    is_active: true,
  });

  // 5. School A Admin
  const schoolAAdmin = await User.create({
    name: "Alpha Admin",
    email: domainA,
    username: `${prefix}.admin.alpha.myschoollife`,
    password_hash: passwordHash,
    role: "school_admin",
    school_id: schoolA._id,
    is_active: true,
  });

  // 6. School A Teacher
  const schoolATeacher = await User.create({
    name: "Alpha Teacher John",
    email: domainTeacherA,
    username: `${prefix}.teacher.john.myschoollife`,
    password_hash: passwordHash,
    role: "teacher",
    school_id: schoolA._id,
    is_active: true,
  });

  // 7. School A Student User
  const schoolAStudent = await User.create({
    name: "Alpha Student Alice",
    email: domainStudentA,
    username: `${prefix}.student.alice.myschoollife`,
    password_hash: passwordHash,
    role: "student",
    school_id: schoolA._id,
    is_active: true,
  });

  // 8. School A Student Document
  const studentDocA = await Student.create({
    school_id: schoolA._id,
    user_id: schoolAStudent._id,
    class_id: classA1._id,
    name: "Alpha Student Alice",
    roll_no: "101",
    admission_no: `${prefix}-ADM-001`,
    academic_year: "2026-2027",
    gender: "female",
    phone: "9876543210",
    email: domainStudentA,
    guardian_name: "Robert Alpha",
    guardian_phone: "9876543211",
    guardian_relation: "Father",
    is_active: true,
  });

  // 9. School B Admin
  const schoolBAdmin = await User.create({
    name: "Beta Admin",
    email: domainB,
    username: `${prefix}.admin.beta.myschoollife`,
    password_hash: passwordHash,
    role: "school_admin",
    school_id: schoolB._id,
    is_active: true,
  });

  // 10. School B Teacher
  const schoolBTeacher = await User.create({
    name: "Beta Teacher Mary",
    email: domainTeacherB,
    username: `${prefix}.teacher.mary.myschoollife`,
    password_hash: passwordHash,
    role: "teacher",
    school_id: schoolB._id,
    is_active: true,
  });

  // 11. School B Student User
  const schoolBStudent = await User.create({
    name: "Beta Student Bob",
    email: domainStudentB,
    username: `${prefix}.student.bob.myschoollife`,
    password_hash: passwordHash,
    role: "student",
    school_id: schoolB._id,
    is_active: true,
  });

  // 12. School B Student Document
  const studentDocB = await Student.create({
    school_id: schoolB._id,
    user_id: schoolBStudent._id,
    class_id: classB1._id,
    name: "Beta Student Bob",
    roll_no: "102",
    admission_no: `${prefix}-ADM-002`,
    academic_year: "2026-2027",
    gender: "male",
    phone: "9876543220",
    email: domainStudentB,
    guardian_name: "Richard Beta",
    guardian_phone: "9876543221",
    guardian_relation: "Father",
    is_active: true,
  });

  // 13. School A Teacher Document
  const teacherDocA = await Teacher.create({
    school_id: schoolA._id,
    user_id: schoolATeacher._id,
    name: "Alpha Teacher John",
    employee_id: `${prefix}-EMP-001`,
    gender: "male",
    phone: "9876543230",
    email: domainTeacherA,
    qualification: "M.Sc Mathematics",
    subject_specialization: "Mathematics",
    expertise: ["Mathematics", "Physics"],
    experience_years: 5,
    join_date: new Date("2024-01-15"),
    is_active: true,
    basic_salary: 50000,
    department: "Science",
    designation: "Senior Teacher",
  });

  // 14. School B Teacher Document
  const teacherDocB = await Teacher.create({
    school_id: schoolB._id,
    user_id: schoolBTeacher._id,
    name: "Beta Teacher Mary",
    employee_id: `${prefix}-EMP-002`,
    gender: "female",
    phone: "9876543240",
    email: domainTeacherB,
    qualification: "M.A English",
    subject_specialization: "English",
    expertise: ["English"],
    experience_years: 3,
    join_date: new Date("2024-02-01"),
    is_active: true,
    basic_salary: 45000,
    department: "Humanities",
    designation: "Teacher",
  });

  // 15. Subjects for School A
  const subjectA1 = await SubjectMaster.create({
    school_id: schoolA._id,
    name: "Mathematics",
    subject_code: "MATH101",
    status: "Active",
  });

  const subjectA2 = await SubjectMaster.create({
    school_id: schoolA._id,
    name: "Physics",
    subject_code: "PHY101",
    status: "Active",
  });

  // 16. Subject for School B
  const subjectB1 = await SubjectMaster.create({
    school_id: schoolB._id,
    name: "English",
    subject_code: "ENG101",
    status: "Active",
  });

  return {
    schoolA,
    schoolB,
    classA1,
    classA2,
    classB1,
    studentDocA,
    studentDocB,
    teacherDocA,
    teacherDocB,
    subjectA1,
    subjectA2,
    subjectB1,
    superAdmin,
    schoolAAdmin,
    schoolATeacher,
    schoolAStudent,
    schoolBAdmin,
    schoolBTeacher,
    schoolBStudent,
  };
}

export async function teardownTestDatabase(prefix = "test"): Promise<void> {
  const slugA = `${prefix}-school-alpha`;
  const slugB = `${prefix}-school-beta`;
  const domainA = `${prefix}-admin@testschool.com`;
  const domainTeacherA = `${prefix}-teacher@testschool.com`;
  const domainStudentA = `${prefix}-student@testschool.com`;
  const domainB = `${prefix}-admin@testschool.org`;
  const domainTeacherB = `${prefix}-teacher@testschool.org`;
  const domainStudentB = `${prefix}-student@testschool.org`;

  await User.deleteMany({
    email: { $in: [domainA, domainTeacherA, domainStudentA, domainB, domainTeacherB, domainStudentB, `${prefix}-superadmin@myschoollife.com`] },
  });
  const existingSchools = await School.find({ slug: { $in: [slugA, slugB] } }).select("_id").lean();
  const schoolIds = existingSchools.map(s => s._id);
  if (schoolIds.length > 0) {
    await Student.deleteMany({ school_id: { $in: schoolIds } });
    await Teacher.deleteMany({ school_id: { $in: schoolIds } });
    await TeacherAssignment.deleteMany({ school_id: { $in: schoolIds } });
    await SubjectMaster.deleteMany({ school_id: { $in: schoolIds } });
    await Subject.deleteMany({ school_id: { $in: schoolIds } });
    await Syllabus.deleteMany({ school_id: { $in: schoolIds } });
    await Exam.deleteMany({ school_id: { $in: schoolIds } });
    await ExamSchedule.deleteMany({ school_id: { $in: schoolIds } });
    await Result.deleteMany({ school_id: { $in: schoolIds } });
    await ResultAudit.deleteMany({ school_id: { $in: schoolIds } });
    await Grade.deleteMany({ school_id: { $in: schoolIds } });
    await ClassTest.deleteMany({ school_id: { $in: schoolIds } });
    await ClassTestMark.deleteMany({ school_id: { $in: schoolIds } });
    await ClassTestMarkAudit.deleteMany({ school_id: { $in: schoolIds } });
    await Attendance.deleteMany({ school_id: { $in: schoolIds } });
    await Holiday.deleteMany({ school_id: { $in: schoolIds } });
    await StudentFeePayment.deleteMany({ school_id: { $in: schoolIds } });
    await StudentFeeAssignment.deleteMany({ school_id: { $in: schoolIds } });
    await ClassFee.deleteMany({ school_id: { $in: schoolIds } });
    await SalaryPayment.deleteMany({ school_id: { $in: schoolIds } });
    await FeeAllocation.deleteMany({ school_id: { $in: schoolIds } });
    await FeeMaster.deleteMany({ school_id: { $in: schoolIds } });
    await FeeGroup.deleteMany({ school_id: { $in: schoolIds } });
    await FeeType.deleteMany({ school_id: { $in: schoolIds } });
    await FeesStructure.deleteMany({ school_id: { $in: schoolIds } });
    await Section.deleteMany({ school_id: { $in: schoolIds } });
    await Stream.deleteMany({ school_id: { $in: schoolIds } });
    await Class.deleteMany({ school_id: { $in: schoolIds } });
    await Admission.deleteMany({ school_id: { $in: schoolIds } });
    await Parent.deleteMany({ school_id: { $in: schoolIds } });
    await Notice.deleteMany({ school_id: { $in: schoolIds } });
    await Homework.deleteMany({ school_id: { $in: schoolIds } });
    await TransportAllocation.deleteMany({ school_id: { $in: schoolIds } });
    await Bus.deleteMany({ school_id: { $in: schoolIds } });
    await Route.deleteMany({ school_id: { $in: schoolIds } });
    await Room.deleteMany({ school_id: { $in: schoolIds } });
    await School.deleteMany({ _id: { $in: schoolIds } });
  }
}

