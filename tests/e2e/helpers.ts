import { Page } from "@playwright/test";
import { generateAccessToken, generateRefreshToken } from "@/lib/utils/jwt";

export interface MockOptions {
  schoolId?: string;
  subdomain?: string;
  stats?: any;
  children?: any[];
  enableStreams?: boolean;
  enableSections?: boolean;
  classes?: any;
  sectionsData?: any;
  streamsData?: any;
  subjectsData?: any;
  teachersData?: any;
  syllabusData?: any;
  teacherAssignmentData?: any;
  subjectAssignmentData?: any;
  subjectMasterData?: any;
  leaveRequestsData?: any;
  leaveTypesData?: any;
  schedulesData?: any;
  dependencyCheckData?: any;
  studentsData?: any;
  parentsData?: any;
  admissionsData?: any;
  feesData?: any;
  feePaymentsData?: any;
  feeTypesData?: any;
  feeGroupsData?: any;
  feeMastersData?: any;
  feeAllocationsData?: any;
  salariesData?: any;
  salariesPreviewData?: any;
  studentAttendanceData?: any;
  teacherAttendanceData?: any;
  attendanceReportsDaily?: any;
  attendanceReportsMonthly?: any;
  attendanceSummaryData?: any;
  busesData?: any;
  routesData?: any;
  allocationsData?: any;
  roomsData?: any;
  holidaysData?: any;
  noticesData?: any;
  studentValidateData?: any;
  studentImportData?: any;
  teacherValidateData?: any;
  teacherImportData?: any;
  uploadData?: any;
}

export async function mockCommonDashboardApis(page: Page, options: MockOptions = {}) {
  const schoolId = options.schoolId || "60f000000000000000000100";
  const subdomain = options.subdomain || "myschool";

  const defaultBuses = [
    {
      _id: "60f000000000000000000701",
      id: "60f000000000000000000701",
      busNumber: "BUS-101",
      busModel: "Tata Starbus Ultra",
      capacity: 40,
      driverName: "Rajesh Sharma",
      driverPhone: "+91 98765 43210",
      licenseNumber: "DL-12345678",
      registrationNo: "KA-01-AB-1234",
      assignedRoute: "Route North",
      status: "Active",
      school_id: schoolId,
      createdAt: "2026-01-10T08:00:00Z",
    },
    {
      _id: "60f000000000000000000702",
      id: "60f000000000000000000702",
      busNumber: "BUS-102",
      busModel: "Ashok Leyland Sunshine",
      capacity: 30,
      driverName: "Vikram Singh",
      driverPhone: "+91 98765 43211",
      licenseNumber: "DL-87654321",
      registrationNo: "KA-01-CD-5678",
      assignedRoute: "Route South",
      status: "Active",
      school_id: schoolId,
      createdAt: "2026-01-11T08:00:00Z",
    },
    {
      _id: "60f000000000000000000703",
      id: "60f000000000000000000703",
      busNumber: "BUS-103",
      busModel: "Eicher Skyline Pro",
      capacity: 25,
      driverName: "Suresh Patel",
      driverPhone: "+91 98765 43212",
      licenseNumber: "DL-54321678",
      registrationNo: "KA-01-EF-9012",
      assignedRoute: "Not Assigned",
      status: "Inactive",
      school_id: schoolId,
      createdAt: "2026-01-12T08:00:00Z",
    },
  ];

  const defaultRoutes = [
    {
      _id: "60f000000000000000000801",
      id: "60f000000000000000000801",
      routeName: "Route North",
      startPoint: "School Gate",
      endPoint: "North Terminal",
      stops: [
        { name: "School Gate", time: "06:30 AM" },
        { name: "City Mall", time: "07:00 AM" },
        { name: "North Terminal", time: "07:30 AM" },
      ],
      assignedBus: "BUS-101",
      morningTime: "06:30 AM",
      eveningTime: "04:00 PM",
      status: "Active",
      totalStudents: 15,
      school_id: schoolId,
    },
    {
      _id: "60f000000000000000000802",
      id: "60f000000000000000000802",
      routeName: "Route South",
      startPoint: "School Gate",
      endPoint: "South Square",
      stops: [
        { name: "School Gate", time: "06:45 AM" },
        { name: "Metro Station", time: "07:15 AM" },
        { name: "South Square", time: "07:45 AM" },
      ],
      assignedBus: "BUS-102",
      morningTime: "06:45 AM",
      eveningTime: "04:15 PM",
      status: "Active",
      totalStudents: 10,
      school_id: schoolId,
    },
  ];

  const defaultAllocations = [
    {
      _id: "60f000000000000000000901",
      id: "60f000000000000000000901",
      student_id: "60f000000000000000000301",
      studentId: "60f000000000000000000301",
      studentName: "Bart Simpson",
      admissionNo: "ADM-2026-001",
      className: "Grade 5",
      route_id: "60f000000000000000000801",
      route: "Route North",
      bus_id: "60f000000000000000000701",
      busNumber: "BUS-101",
      pickupStop: "City Mall",
      status: "Active",
      createdAt: "2026-01-15T08:00:00Z",
      school_id: schoolId,
    },
    {
      _id: "60f000000000000000000902",
      id: "60f000000000000000000902",
      student_id: "60f000000000000000000302",
      studentId: "60f000000000000000000302",
      studentName: "Lisa Simpson",
      admissionNo: "ADM-2026-002",
      className: "Grade 3",
      route_id: "60f000000000000000000802",
      route: "Route South",
      bus_id: "60f000000000000000000702",
      busNumber: "BUS-102",
      pickupStop: "Metro Station",
      status: "Active",
      createdAt: "2026-01-16T08:00:00Z",
      school_id: schoolId,
    },
  ];

  const defaultRooms = [
    {
      _id: "60f000000000000000000a01",
      room_no: "101",
      capacity: 40,
      is_active: true,
      school_id: schoolId,
      createdAt: "2026-01-01T08:00:00Z",
    },
    {
      _id: "60f000000000000000000a02",
      room_no: "102",
      capacity: 35,
      is_active: true,
      school_id: schoolId,
      createdAt: "2026-01-02T08:00:00Z",
    },
    {
      _id: "60f000000000000000000a03",
      room_no: "Lab-1",
      capacity: 25,
      is_active: false,
      school_id: schoolId,
      createdAt: "2026-01-03T08:00:00Z",
    },
  ];

  const defaultHolidays = [
    {
      _id: "60f000000000000000000b01",
      display_id: "HOL-001",
      title: "New Year Celebration",
      date: "2026-01-01T00:00:00.000Z",
      description: "Official School holiday for New Year",
      status: "Active",
      school_id: schoolId,
      createdAt: "2026-01-01T08:00:00Z",
    },
    {
      _id: "60f000000000000000000b02",
      display_id: "HOL-002",
      title: "Republic Day Festival",
      date: "2026-01-26T00:00:00.000Z",
      description: "National pride holiday celebration",
      status: "Active",
      school_id: schoolId,
      createdAt: "2026-01-26T08:00:00Z",
    },
    {
      _id: "60f000000000000000000b03",
      display_id: "HOL-003",
      title: "Mid-Term Spring Break",
      date: "2026-03-20T00:00:00.000Z",
      description: "Annual Spring semester vacation break",
      status: "Inactive",
      school_id: schoolId,
      createdAt: "2026-03-20T08:00:00Z",
    },
  ];

  const defaultNotices = [
    {
      _id: "60f000000000000000000c01",
      title: "Annual Sports Meet 2026",
      content: "All students and teachers please gather at the sports complex by 08:30 AM.",
      target_audience: "all",
      is_published: true,
      publish_date: "2026-01-20T08:00:00.000Z",
      attachment_url: "/uploads/sports_schedule.pdf",
      school_id: schoolId,
      createdAt: "2026-01-20T08:00:00.000Z",
    },
    {
      _id: "60f000000000000000000c02",
      title: "Staff Meeting on Curriculum",
      content: "Faculty meeting in Auditorium 1 regarding semester examination schedule.",
      target_audience: "teachers",
      is_published: true,
      publish_date: "2026-01-22T08:00:00.000Z",
      school_id: schoolId,
      createdAt: "2026-01-22T08:00:00.000Z",
    },
    {
      _id: "60f000000000000000000c03",
      title: "Parent Teacher Conference Notice",
      content: "Term 1 student progress review with class teachers this coming Saturday.",
      target_audience: "parents",
      is_published: true,
      publish_date: "2026-01-25T08:00:00.000Z",
      school_id: schoolId,
      createdAt: "2026-01-25T08:00:00.000Z",
    },
  ];

  let busesStore = options.busesData ? JSON.parse(JSON.stringify(options.busesData)) : JSON.parse(JSON.stringify(defaultBuses));
  let routesStore = options.routesData ? JSON.parse(JSON.stringify(options.routesData)) : JSON.parse(JSON.stringify(defaultRoutes));
  let allocationsStore = options.allocationsData ? JSON.parse(JSON.stringify(options.allocationsData)) : JSON.parse(JSON.stringify(defaultAllocations));
  let roomsStore = options.roomsData ? JSON.parse(JSON.stringify(options.roomsData)) : JSON.parse(JSON.stringify(defaultRooms));
  let holidaysStore = options.holidaysData ? JSON.parse(JSON.stringify(options.holidaysData)) : JSON.parse(JSON.stringify(defaultHolidays));
  let noticesStore = options.noticesData ? JSON.parse(JSON.stringify(options.noticesData)) : JSON.parse(JSON.stringify(defaultNotices));

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();

    if (url.includes("/api/public/school-info")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: schoolId,
            name: "Springfield Academy",
            subtitle: "Management",
            subdomain: subdomain,
            logo_url: "/logo.png",
          },
        }),
      });
      return;
    }

    if (url.includes("/api/dashboard/stats")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: options.stats || {
            students: { total: 450, active: 420, inactive: 30 },
            teachers: { total: 32, active: 30, inactive: 2 },
            classes: { total: 18, active: 18, inactive: 0 },
            subjects: { total: 42 },
            attendance: {
              total: 420,
              present: 395,
              absent: 15,
              late: 5,
              leave: 5,
              percentage: 94.0,
              marked: true,
            },
          },
        }),
      });
      return;
    }

    if (url.includes("/api/dashboard/super-analytics")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            totalCampuses: 8,
            activeCampuses: 7,
            totalStudents: 3200,
            totalTeachers: 210,
            mrr: 120000,
          },
        }),
      });
      return;
    }

    if (url.includes("/api/schools")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              _id: schoolId,
              name: "Springfield Academy",
              slug: subdomain,
              subdomain: subdomain,
              is_active: true,
              studentsCount: 450,
              teachersCount: 32,
              classesCount: 18,
            },
          ],
        }),
      });
      return;
    }

    if (url.includes("/api/parent/children")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: options.children !== undefined
            ? options.children
            : [
                {
                  _id: "60f000000000000000000301",
                  name: "Bart Simpson",
                  roll_no: "101",
                  class_id: { _id: "60f000000000000000000401", name: "Grade 5", section: "A" },
                },
                {
                  _id: "60f000000000000000000302",
                  name: "Lisa Simpson",
                  roll_no: "102",
                  class_id: { _id: "60f000000000000000000402", name: "Grade 3", section: "B" },
                },
              ],
        }),
      });
      return;
    }

    if (url.includes("/api/academic/dependency-check")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: options.dependencyCheckData ?? {
            deletable: true,
            reasons: [],
          },
        }),
      });
      return;
    }

    if (url.includes("/api/classes")) {
      const classesList = Array.isArray(options.classes)
        ? options.classes
        : (options.classes?.classes ?? [
            { _id: "60f000000000000000000401", name: "Grade 5", section: "A", academic_year: "2026-2027", status: "Active", studentCount: 25, subjectCount: 6, capacity: 40 },
            { _id: "60f000000000000000000402", name: "Grade 3", section: "B", academic_year: "2026-2027", status: "Active", studentCount: 20, subjectCount: 5, capacity: 40 },
          ]);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            classes: classesList,
            total: classesList.length,
            totalPages: 1,
            page: 1,
          },
        }),
      });
      return;
    }

    if (url.includes("/api/settings/permissions")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
      return;
    }

    if (url.includes("/api/settings/academic-config")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            enable_streams: options.enableStreams ?? true,
            enable_sections: options.enableSections ?? true,
          },
        }),
      });
      return;
    }



    if (url.includes("/api/sections")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: options.sectionsData ?? {
            sections: [
              { _id: "60f000000000000000000701", name: "A", status: "Active" },
              { _id: "60f000000000000000000702", name: "B", status: "Active" },
            ],
            total: 2,
            totalPages: 1,
          },
        }),
      });
      return;
    }

    if (url.includes("/api/streams")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: options.streamsData ?? {
            streams: [
              { _id: "60f000000000000000000601", name: "Science", status: "Active", classesCount: 3, studentsCount: 90 },
              { _id: "60f000000000000000000602", name: "Commerce", status: "Active", classesCount: 2, studentsCount: 65 },
              { _id: "60f000000000000000000603", name: "Arts", status: "Active", classesCount: 1, studentsCount: 30 },
            ],
            total: 3,
            totalPages: 1,
            page: 1,
          },
        }),
      });
      return;
    }

    if (url.includes("/api/syllabus")) {
      const defaultSyllabus = {
        _id: "60f000000000000000000951",
        title: "CBSE Class 10 Mathematics 2026-2027",
        academic_year: "2026-2027",
        class_id: { _id: "60f000000000000000000401", name: "Grade 5", section: "A" },
        subject_master_id: { _id: "60f000000000000000000501", name: "Mathematics", subject_code: "MATH" },
        teacher_id: { _id: "60f000000000000000000003", name: "Edna Krabappel" },
        version: 1,
        status: "Published",
        visibility: "Public",
        nodes: [
          {
            id: "unit_1",
            title: "Unit 1: Real Numbers & Polynomials",
            type: "unit",
            description: "Fundamental concepts of number systems",
            children: [
              {
                id: "chap_1",
                title: "Chapter 1: Euclid Division Lemma",
                type: "chapter",
                description: "Proofs and algorithms",
                resources: [
                  { title: "Intro to Numbers Video", type: "youtube", url: "https://youtube.com/watch?v=12345" }
                ]
              }
            ]
          }
        ],
        attachments: [
          { filename: "Math_Syllabus_Guide.pdf", file_url: "https://example.com/math.pdf", mime_type: "application/pdf" }
        ],
        reference_links: ["https://cbse.gov.in/curriculum-math"],
        history: []
      };

      const isDetailRequest = /\/api\/syllabus\/[a-zA-Z0-9_-]+/.test(url) && !url.includes("?mode=");
      let returnData: any;
      if (isDetailRequest) {
        if (options.syllabusData) {
          returnData = Array.isArray(options.syllabusData) ? options.syllabusData[0] : options.syllabusData;
        } else {
          returnData = defaultSyllabus;
        }
      } else {
        returnData = options.syllabusData ?? [defaultSyllabus];
      }

      const req = route.request();
      const method = req.method();
      if ((method === "PUT" || method === "PATCH") && returnData) {
        try {
          const body = JSON.parse(req.postData() || "{}");
          Object.assign(returnData, body);
        } catch {}
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: returnData,
        }),
      });
      return;
    }

    if (url.includes("/api/students/filters")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            academicYears: ["2026-2027", "2025-2026"],
            sections: ["A", "B", "C"],
            houses: ["Red", "Blue", "Green"],
            genders: ["Male", "Female", "Other"],
            statuses: ["Active", "Inactive"],
            admissionStatuses: ["Confirmed", "Pending", "Cancelled"],
          },
        }),
      });
      return;
    }

    if (url.includes("/api/parents/filters")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            academicYears: ["2026-2027", "2025-2026"],
            classes: [
              { _id: "60f000000000000000000401", name: "Grade 5", section: "A" },
              { _id: "60f000000000000000000402", name: "Grade 3", section: "B" },
            ],
            sections: ["A", "B"],
            students: [
              { _id: "60f000000000000000000301", name: "Bart Simpson" },
              { _id: "60f000000000000000000302", name: "Lisa Simpson" },
            ],
            guardianTypes: ["Father", "Mother", "Other"],
          },
        }),
      });
      return;
    }

    if (url.includes("/api/results")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { results: [] },
        }),
      });
      return;
    }

    if (url.includes("/api/admissions")) {
      const defaultAdmissions = [
        {
          _id: "60f000000000000000000101",
          application_no: "APP-2026-001",
          first_name: "Milhouse",
          last_name: "Van Houten",
          student_name: "Milhouse Van Houten",
          class_id: { _id: "60f000000000000000000401", name: "Grade 5", section: "A" },
          guardian_name: "Kirk Van Houten",
          phone: "9876543212",
          email: "kirk@vanhouten.com",
          submission_date: "2026-06-15",
          status: "Under Review",
          academic_year: "2026-2027",
        },
        {
          _id: "60f000000000000000000102",
          application_no: "APP-2026-002",
          first_name: "Nelson",
          last_name: "Muntz",
          student_name: "Nelson Muntz",
          class_id: { _id: "60f000000000000000000401", name: "Grade 5", section: "A" },
          guardian_name: "Mrs. Muntz",
          phone: "9876543213",
          email: "muntz@school.com",
          submission_date: "2026-06-18",
          status: "Approved",
          academic_year: "2026-2027",
        },
      ];
      const appsList = Array.isArray(options.admissionsData)
        ? options.admissionsData
        : (options.admissionsData?.applications ?? defaultAdmissions);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: appsList,
          pagination: {
            total: appsList.length,
            pages: 1,
            currentPage: 1,
          },
        }),
      });
      return;
    }

    if (url.includes("/api/parents")) {
      const defaultParents = [
        {
          _id: "60f000000000000000000201",
          name: "Homer Simpson",
          phone: "9876543210",
          email: "homer@simpson.com",
          relation: "Father",
          occupation: "Safety Inspector",
          address: "742 Evergreen Terrace",
          is_active: true,
          children: [
            {
              _id: "60f000000000000000000301",
              name: "Bart Simpson",
              admission_no: "ADM-2026-001",
              roll_no: "101",
              class_id: { _id: "60f000000000000000000401", name: "Grade 5", section: "A" },
            },
            {
              _id: "60f000000000000000000302",
              name: "Lisa Simpson",
              admission_no: "ADM-2026-002",
              roll_no: "102",
              class_id: { _id: "60f000000000000000000402", name: "Grade 3", section: "B" },
            },
          ],
        },
      ];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: options.parentsData ?? {
            parents: defaultParents,
            pagination: { totalItems: defaultParents.length, totalPages: 1, currentPage: 1 },
          },
        }),
      });
      return;
    }

    if (url.includes("/api/students/filters")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            academicYears: ["2026-2027"],
            sections: ["A", "B"],
            houses: [],
            genders: ["Male", "Female"],
            statuses: ["Active", "Inactive"],
            admissionStatuses: ["Confirmed"],
          },
        }),
      });
      return;
    }

    if (url.includes("/api/students/promote")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Students successfully promoted to academic year 2026 - 2027.",
        }),
      });
      return;
    }

    if (url.includes("/api/students/import/template")) {
      await route.fulfill({
        status: 200,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: Buffer.from("PK\x03\x04MockExcelTemplateContent"),
      });
      return;
    }

    if (url.includes("/api/students/import/validate")) {
      if (options.studentValidateData) {
        await route.fulfill({
          status: options.studentValidateData.status || 200,
          contentType: "application/json",
          body: JSON.stringify(options.studentValidateData.body || options.studentValidateData),
        });
        return;
      }

      const postData = route.request().postDataJSON();
      const rows = postData?.rows;
      if (Array.isArray(rows) && rows.length > 0) {
        const validated = rows.map((r: any, idx: number) => {
          const name = r.name || r["Student Name*"] || r["Student Name"] || r["student name"] || "";
          const admNo = r.admission_no || r["Admission No*"] || r["Admission No"] || r["admission no"] || "";
          const rawPhone = String(r.phone ?? r["Primary Phone"] ?? r["guardian_phone"] ?? r["Guardian Phone"] ?? "").trim();
          const cleanPhone = rawPhone.replace(/\D/g, "");
          const errors: string[] = [];
          if (!name) errors.push("Student name is required.");
          if (!admNo) errors.push("Admission number is required.");
          if (name && name.toLowerCase().includes("invalid")) errors.push("Malformed student name format.");
          if (admNo && admNo.toLowerCase().includes("dup")) errors.push("Duplicate admission number detected.");
          if (rawPhone && cleanPhone.length !== 10) errors.push("Mobile Number must be exactly 10 digits.");
          return {
            index: idx,
            isValid: errors.length === 0,
            errors,
            data: {
              name: name || "Unknown Student",
              admission_no: admNo || `ADM-MOCK-${idx}`,
              classNameStr: r.class || r["Class*"] || "Grade 5 A",
              dob: r.dob || "2015-01-01",
              guardian_email: r.guardian_email || "guardian@example.com",
            },
          };
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: validated }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              index: 0,
              isValid: true,
              errors: [],
              data: { name: "Milhouse Van Houten", admission_no: "ADM-001", classNameStr: "Grade 5 A" },
            },
            {
              index: 1,
              isValid: false,
              errors: ["Mobile Number must be exactly 10 digits.", "Guardian Name is required."],
              data: { name: "Nelson Muntz", admission_no: "ADM-002", classNameStr: "Grade 5 A" },
            },
          ],
        }),
      });
      return;
    }

    if (url.includes("/api/students/import")) {
      if (options.studentImportData) {
        await route.fulfill({
          status: options.studentImportData.status || 200,
          contentType: "application/json",
          body: JSON.stringify(options.studentImportData.body || options.studentImportData),
        });
        return;
      }
      const postData = route.request().postDataJSON();
      const count = postData?.rows?.length || 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { successCount: count, failedCount: 0, failures: [] },
        }),
      });
      return;
    }

    if (url.includes("/api/students")) {
      const defaultStudents = [
        {
          _id: "60f000000000000000000301",
          name: "Bart Simpson",
          admission_no: "ADM-2026-001",
          roll_no: "101",
          gender: "male",
          dob: "2015-04-01",
          phone: "9876543210",
          email: "bart.simpson@school.com",
          academic_year: "2026-2027",
          is_active: true,
          class_id: { _id: "60f000000000000000000401", name: "Grade 5", section: "A" },
          parent_id: { _id: "60f000000000000000000201", name: "Homer Simpson", phone: "9876543210", relation: "Father" },
          father_name: "Homer Simpson",
          father_phone: "9876543210",
          guardian_name: "Homer Simpson",
          guardian_phone: "9876543210",
          guardian_relation: "Father",
          guardian_type: "father",
          address: "742 Evergreen Terrace",
        },
        {
          _id: "60f000000000000000000302",
          name: "Lisa Simpson",
          admission_no: "ADM-2026-002",
          roll_no: "102",
          gender: "female",
          dob: "2017-05-09",
          phone: "9876543211",
          email: "lisa.simpson@school.com",
          academic_year: "2026-2027",
          is_active: true,
          class_id: { _id: "60f000000000000000000402", name: "Grade 3", section: "B" },
          parent_id: { _id: "60f000000000000000000201", name: "Homer Simpson", phone: "9876543210", relation: "Father" },
          father_name: "Homer Simpson",
          father_phone: "9876543210",
          guardian_name: "Homer Simpson",
          guardian_phone: "9876543210",
          guardian_relation: "Father",
          guardian_type: "father",
          address: "742 Evergreen Terrace",
        },
      ];

      const urlObj = new URL(url);
      const isDetailRequest = /\/api\/students\/[a-zA-Z0-9_-]+$/.test(urlObj.pathname) &&
        !urlObj.pathname.endsWith("/filters") &&
        !urlObj.pathname.endsWith("/promote") &&
        !urlObj.pathname.endsWith("/import");

      let returnData: any;
      if (isDetailRequest) {
        if (options.studentsData) {
          returnData = Array.isArray(options.studentsData) ? options.studentsData[0] : options.studentsData;
        } else {
          returnData = defaultStudents[0];
        }
      } else {
        returnData = options.studentsData ?? {
          students: defaultStudents,
          total: defaultStudents.length,
          totalPages: 1,
          page: 1,
          limit: 12,
        };
      }

      const req = route.request();
      const method = req.method();
      if ((method === "PUT" || method === "PATCH") && returnData) {
        try {
          const body = JSON.parse(req.postData() || "{}");
          Object.assign(returnData, body);
        } catch {}
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: returnData,
        }),
      });
      return;
    }

    if (url.includes("/api/teachers/filters")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            academicYears: ["2026-2027", "2025-2026"],
            departments: ["Academic", "Science", "Humanities", "Sports"],
            designations: ["Teacher", "Senior Teacher", "Head of Department"],
            statuses: ["Active", "Inactive"],
          },
        }),
      });
      return;
    }

    if (url.includes("/api/teachers/import/validate")) {
      if (options.teacherValidateData) {
        await route.fulfill({
          status: options.teacherValidateData.status || 200,
          contentType: "application/json",
          body: JSON.stringify(options.teacherValidateData.body || options.teacherValidateData),
        });
        return;
      }

      const postData = route.request().postDataJSON();
      const rows = postData?.rows;
      if (Array.isArray(rows) && rows.length > 0) {
        const validated = rows.map((r: any, idx: number) => {
          const empId = r.employee_id || r["Employee ID*"] || r["Employee ID"] || r["employee_id"] || "";
          const name = r.name || r["Full Name*"] || r["Full Name"] || r["Teacher Name"] || "";
          const rawPhone = String(r.phone ?? r["Phone"] ?? "").trim();
          const cleanPhone = rawPhone.replace(/\D/g, "");
          const spec = r.subject_specialization || r["Subject Specialization*"] || r["Subject Specialization"] || r["subject"] || "";
          const errors: string[] = [];
          if (!name) errors.push("Teacher name is required.");
          if (!empId) errors.push("Employee ID is required.");
          if (!spec) errors.push("Subject specialization is required.");
          if (rawPhone && cleanPhone.length !== 10) errors.push("Mobile Number must be exactly 10 digits.");
          return {
            index: idx,
            isValid: errors.length === 0,
            errors,
            data: {
              employee_id: empId || `EMP-${idx}`,
              name: name || "Unknown Teacher",
              phone: rawPhone,
              subject_specialization: spec || "General",
              classNameStr: r.assigned_classes || "Class 10 - A",
            },
          };
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: validated }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              index: 0,
              isValid: true,
              errors: [],
              data: { employee_id: "EMP-001", name: "Seymour Skinner", phone: "9876543201", subject_specialization: "History" },
            },
            {
              index: 1,
              isValid: false,
              errors: ["Mobile Number must be exactly 10 digits.", "Subject Specialization is required."],
              data: { employee_id: "EMP-002", name: "Dewey Largo", phone: "123", subject_specialization: "" },
            },
          ],
        }),
      });
      return;
    }

    if (url.includes("/api/teachers/import")) {
      if (options.teacherImportData) {
        await route.fulfill({
          status: options.teacherImportData.status || 200,
          contentType: "application/json",
          body: JSON.stringify(options.teacherImportData.body || options.teacherImportData),
        });
        return;
      }
      const postData = route.request().postDataJSON();
      const count = postData?.rows?.length || 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { successCount: count, failedCount: 0, failures: [] },
        }),
      });
      return;
    }

    if (url.includes("/api/teachers")) {
      const defaultTeachers = [
        {
          _id: "60f000000000000000000003",
          user_id: "60f000000000000000000003",
          employee_id: "EMP-2026-001",
          name: "Edna Krabappel",
          gender: "female",
          dob: "1982-08-15",
          phone: "9876543201",
          email: "edna.krabappel@springfield.edu",
          join_date: "2020-07-01",
          qualification: "M.Ed",
          expertise: ["Mathematics", "Science"],
          subject_specialization: "Mathematics",
          experience_years: 8,
          department: "Academic",
          designation: "Senior Teacher",
          is_active: true,
          class_id: { _id: "60f000000000000000000401", name: "Grade 5", section: "A" },
          class_ids: [{ _id: "60f000000000000000000401", name: "Grade 5", section: "A" }],
          address: "82 Evergreen Terrace, Springfield",
        },
        {
          _id: "60f000000000000000000006",
          user_id: "60f000000000000000000006",
          employee_id: "EMP-2026-002",
          name: "Elizabeth Hoover",
          gender: "female",
          dob: "1985-03-22",
          phone: "9876543202",
          email: "elizabeth.hoover@springfield.edu",
          join_date: "2021-08-15",
          qualification: "B.Ed",
          expertise: ["English", "History"],
          subject_specialization: "English",
          experience_years: 5,
          department: "Science",
          designation: "Teacher",
          is_active: true,
          class_id: { _id: "60f000000000000000000402", name: "Grade 3", section: "B" },
          class_ids: [{ _id: "60f000000000000000000402", name: "Grade 3", section: "B" }],
          address: "94 Elm Street, Springfield",
        },
      ];

      const urlObj = new URL(url);
      const isDetailRequest = /\/api\/teachers\/[a-zA-Z0-9_-]+$/.test(urlObj.pathname) &&
        !urlObj.pathname.endsWith("/filters") &&
        !urlObj.pathname.endsWith("/import");

      let returnData: any;
      if (isDetailRequest) {
        if (options.teachersData) {
          returnData = Array.isArray(options.teachersData) ? options.teachersData[0] : (options.teachersData.teachers?.[0] || options.teachersData);
        } else {
          returnData = defaultTeachers[0];
        }
      } else {
        if (Array.isArray(options.teachersData)) {
          returnData = {
            teachers: options.teachersData,
            total: options.teachersData.length,
            totalPages: 1,
            page: 1,
            limit: options.teachersData.length,
          };
        } else {
          returnData = options.teachersData ?? {
            teachers: defaultTeachers,
            total: defaultTeachers.length,
            totalPages: 1,
            page: 1,
            limit: 12,
          };
        }
      }

      const req = route.request();
      const method = req.method();

      if (method === "POST") {
        try {
          const body = JSON.parse(req.postData() || "{}");
          const createdTeacher = {
            _id: "tea_new_" + Date.now(),
            ...body,
            is_active: body.is_active ?? true,
          };
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              message: "Teacher created successfully",
              data: createdTeacher,
              credentials: {
                loginId: body.email || (body.name?.toLowerCase().replace(/\s+/g, ".") + "@school.com"),
                password: "AutoPassword123#",
              },
            }),
          });
          return;
        } catch {}
      }

      if ((method === "PUT" || method === "PATCH") && returnData) {
        try {
          const body = JSON.parse(req.postData() || "{}");
          Object.assign(returnData, body);
        } catch {}
      }

      if (method === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "Teacher deleted successfully" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: returnData,
        }),
      });
      return;
    }

    if (url.includes("/api/teacher-assignment")) {
      const defaultAssignments = [
        {
          _id: "asgn_001",
          academic_year: "2026-2027",
          assignment_type: "Subject Teacher",
          status: "Active",
          effective_date: "2026-06-01",
          remarks: "Senior Faculty Lead",
          teacher_id: {
            _id: "60f000000000000000000003",
            name: "Edna Krabappel",
            employee_id: "EMP-2026-001",
            phone: "9876543201",
            email: "edna.krabappel@springfield.edu",
          },
          class_id: {
            _id: "60f000000000000000000401",
            name: "Grade 5",
            section: "A",
            academic_year: "2026-2027",
          },
          subject_master_id: {
            _id: "60f000000000000000000501",
            name: "Mathematics",
            subject_code: "MATH",
          },
        },
      ];

      const assignmentsList = Array.isArray(options.teacherAssignmentData)
        ? options.teacherAssignmentData
        : (options.teacherAssignmentData?.assignments ?? defaultAssignments);

      const req = route.request();
      const method = req.method();

      if (method === "POST") {
        const body = JSON.parse(req.postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { _id: "asgn_new_" + Date.now(), ...body },
          }),
        });
        return;
      }

      if (method === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "Assignment deleted successfully" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            assignments: assignmentsList,
            total: assignmentsList.length,
            totalPages: 1,
            page: 1,
          },
        }),
      });
      return;
    }

    if (url.includes("/api/subject-assignment")) {
      const defaultSubjectAssignments = [
        {
          _id: "sub_asgn_001",
          academic_year: "2026-2027",
          status: "Active",
          weekly_periods: 5,
          class_id: { _id: "60f000000000000000000401", name: "Grade 5", section: "A" },
          subject_master_id: { _id: "60f000000000000000000501", name: "Mathematics", status: "Active" },
          teacher_id: { _id: "60f000000000000000000003", name: "Edna Krabappel" },
        },
      ];
      const list = options.subjectAssignmentData ?? defaultSubjectAssignments;
      const assignmentsArr = Array.isArray(list) ? list : (list.assignments || []);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            assignments: assignmentsArr,
            total: assignmentsArr.length,
            totalPages: 1,
            page: 1,
          },
        }),
      });
      return;
    }

    if (url.includes("/api/subject-master")) {
      const defaultSubjects = [
        { _id: "60f000000000000000000501", name: "Mathematics", subject_code: "MATH", status: "Active" },
        { _id: "60f000000000000000000502", name: "English", subject_code: "ENG", status: "Active" },
        { _id: "60f000000000000000000503", name: "Science", subject_code: "SCI", status: "Active" },
      ];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: options.subjectMasterData ?? defaultSubjects,
        }),
      });
      return;
    }

    if (url.includes("/api/leave-types")) {
      const defaultLeaveTypes = [
        { _id: "lt_001", name: "Sick Leave", code: "SL", days_allowed: 12, is_active: true },
        { _id: "lt_002", name: "Casual Leave", code: "CL", days_allowed: 10, is_active: true },
      ];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: options.leaveTypesData ?? defaultLeaveTypes,
        }),
      });
      return;
    }

    if (url.includes("/api/leave")) {
      const defaultLeaves = [
        {
          _id: "leave_001",
          user_id: {
            _id: "60f000000000000000000003",
            name: "Edna Krabappel",
            email: "edna.myschoollife",
            role: "teacher",
          },
          leave_type: "sick",
          from_date: "2026-11-01",
          to_date: "2026-11-03",
          total_days: 3,
          reason: "Viral flu and doctor recommended bed rest",
          status: "pending",
          createdAt: "2026-10-25T10:00:00.000Z",
        },
        {
          _id: "leave_002",
          user_id: {
            _id: "60f000000000000000000006",
            name: "Elizabeth Hoover",
            email: "elizabeth.myschoollife",
            role: "teacher",
          },
          leave_type: "casual",
          from_date: "2026-10-10",
          to_date: "2026-10-11",
          total_days: 2,
          reason: "Family function in hometown",
          status: "approved",
          admin_note: "Approved by Principal Skinner",
          createdAt: "2026-10-05T09:00:00.000Z",
        },
      ];

      const leaveList = Array.isArray(options.leaveRequestsData)
        ? options.leaveRequestsData
        : (options.leaveRequestsData?.leaves ?? defaultLeaves);

      const req = route.request();
      const method = req.method();

      if (method === "POST") {
        const body = JSON.parse(req.postData() || "{}");
        const newLeave = {
          _id: "leave_new_" + Date.now(),
          user_id: { _id: "60f000000000000000000003", name: "Edna Krabappel", role: "teacher" },
          status: "pending",
          createdAt: new Date().toISOString(),
          ...body,
        };
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: newLeave }),
        });
        return;
      }

      if (method === "PUT" || method === "PATCH") {
        const body = JSON.parse(req.postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: `Leave status updated to ${body.status}` }),
        });
        return;
      }

      if (method === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "Leave request cancelled successfully" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            leaves: leaveList,
            total: leaveList.length,
            totalPages: 1,
            page: 1,
          },
        }),
      });
      return;
    }

    if (url.includes("/api/schedules")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: options.schedulesData ?? [
            {
              _id: "sch_001",
              day_of_week: "Monday",
              start_time: "09:00",
              end_time: "10:00",
              room: "Room 101",
              subject: "Mathematics",
              subject_master_id: { name: "Mathematics" },
              class_id: { name: "Grade 5", section: "A" },
            },
          ],
        }),
      });
      return;
    }

    if (url.includes("/api/fees/payments")) {
      const defaultPayments = [
        {
          _id: "pmt_001",
          receipt_number: "REC-20261025-00001",
          receipt_no: "REC-20261025-00001",
          student_id: {
            _id: "60f000000000000000000301",
            name: "Bart Simpson",
            admission_no: "ADM-2026-001",
            class_id: { name: "Grade 5", section: "A" },
          },
          amount_paid: 15000,
          total_amount: 15000,
          payment_method: "Cash",
          payment_date: "2026-10-25",
          start_date: "2026-06-01",
          end_date: "2026-10-31",
          collection_type: "Monthly",
          remarks: "First term tuition payment",
          fee_breakdown: [
            { name: "Academic Fees", amount_paid: 10000 },
            { name: "Tuition Fees", amount_paid: 5000 },
          ],
          discount: 0,
          fine: 0,
          status: "Paid",
          createdAt: "2026-10-25T10:00:00.000Z",
        },
      ];

      const list = options.feePaymentsData ?? defaultPayments;
      const req = route.request();
      const method = req.method();

      if (method === "POST") {
        const body = JSON.parse(req.postData() || "{}");
        if (body.amount_paid <= 0) {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ success: false, message: "Amount paid must be greater than ₹0" }),
          });
          return;
        }

        const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
        const newPayment = {
          _id: "pmt_" + Date.now(),
          receipt_number: `REC-${dateStr}-00042`,
          receipt_no: `REC-${dateStr}-00042`,
          status: "Paid",
          createdAt: new Date().toISOString(),
          ...body,
        };
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { payment: newPayment } }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            payments: list,
            total: list.length,
            totalPages: 1,
            page: 1,
          },
        }),
      });
      return;
    }

    if (url.includes("/api/fees/types")) {
      const defaultTypes = [
        { _id: "ft_001", name: "Academic Fees", description: "Standard tuition and curriculum fees", is_active: true },
        { _id: "ft_002", name: "Tuition Fees", description: "Monthly instructional charges", is_active: true },
        { _id: "ft_003", name: "Transport Fees", description: "Bus transit coverage", is_active: true },
      ];
      const list = options.feeTypesData ?? defaultTypes;
      const method = route.request().method();
      if (method === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { _id: "ft_" + Date.now(), ...body } }),
        });
        return;
      }
      if (method === "PUT" || method === "PATCH") {
        const body = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: body }),
        });
        return;
      }
      if (method === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "Fee Type deleted successfully" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { types: list } }),
      });
      return;
    }

    if (url.includes("/api/fees/groups")) {
      const defaultGroups = [
        { _id: "fg_001", name: "General Primary", description: "Fee group for Grades 1 through 5", is_active: true },
        { _id: "fg_002", name: "Senior Secondary", description: "Fee group for High School science and commerce", is_active: true },
      ];
      const list = options.feeGroupsData ?? defaultGroups;
      const method = route.request().method();
      if (method === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { _id: "fg_" + Date.now(), ...body } }),
        });
        return;
      }
      if (method === "PUT" || method === "PATCH") {
        const body = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: body }),
        });
        return;
      }
      if (method === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "Fee Group deleted successfully" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { groups: list } }),
      });
      return;
    }

    if (url.includes("/api/fees/master")) {
      const defaultMasters = [
        {
          _id: "fm_001",
          fee_group_id: { _id: "fg_001", name: "General Primary" },
          fee_type_id: { _id: "ft_001", name: "Academic Fees" },
          amount: 25000,
          due_date: "2026-11-30",
        },
        {
          _id: "fm_002",
          fee_group_id: { _id: "fg_001", name: "General Primary" },
          fee_type_id: { _id: "ft_002", name: "Tuition Fees" },
          amount: 3500,
          due_date: "2026-12-15",
        },
      ];
      const list = options.feeMastersData ?? defaultMasters;
      const method = route.request().method();
      if (method === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { _id: "fm_" + Date.now(), ...body } }),
        });
        return;
      }
      if (method === "PUT" || method === "PATCH") {
        const body = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: body }),
        });
        return;
      }
      if (method === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "Fee Master deleted successfully" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { masters: list } }),
      });
      return;
    }

    if (url.includes("/api/fees/allocations")) {
      const defaultAllocations = [
        {
          _id: "fa_001",
          student_id: { _id: "60f000000000000000000301", name: "Bart Simpson" },
          fee_group_id: { _id: "fg_001", name: "General Primary" },
          academic_year: "2026-2027",
        },
      ];
      const list = options.feeAllocationsData ?? defaultAllocations;
      const method = route.request().method();
      if (method === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "Fees allocated successfully", data: body }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { allocations: list } }),
      });
      return;
    }

    if (url.includes("/api/fees")) {
      if (url.includes("config_only=true")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              fee_types: [
                { name: "Academic Fees", amount: 25000, frequency: "Yearly", is_enabled: true },
                { name: "Tuition Fees", amount: 3500, frequency: "Monthly", is_enabled: true },
                { name: "Transport Fees", amount: 1500, frequency: "Monthly", is_enabled: true },
                { name: "Exam Fees", amount: 1000, frequency: "Quarterly", is_enabled: true },
              ],
            },
          }),
        });
        return;
      }

      const defaultStudents = [
        {
          _id: "60f000000000000000000301",
          name: "Bart Simpson",
          admission_no: "ADM-2026-001",
          class_name: "Grade 5 - A",
          class_id: "60f000000000000000000401",
          section: "A",
          guardian_name: "Homer Simpson",
          guardian_phone: "9876543210",
          guardian_relation: "Father",
          fee_structure: ["Academic Fees (₹25,000)", "Tuition Fees (₹3,500/mo)"],
          totalFees: 35000,
          totalPaid: 15000,
          balanceAmount: 20000,
          lastPaidAmount: 15000,
          lastPaymentDate: "2026-10-25T10:00:00.000Z",
          status: "Partial",
          dueStatus: "Due",
          academic_year: "2026-2027",
        },
        {
          _id: "60f000000000000000000302",
          name: "Lisa Simpson",
          admission_no: "ADM-2026-002",
          class_name: "Grade 3 - B",
          class_id: "60f000000000000000000402",
          section: "B",
          guardian_name: "Homer Simpson",
          guardian_phone: "9876543210",
          guardian_relation: "Father",
          fee_structure: ["Academic Fees (₹25,000)"],
          totalFees: 25000,
          totalPaid: 25000,
          balanceAmount: 0,
          lastPaidAmount: 25000,
          lastPaymentDate: "2026-10-15T09:00:00.000Z",
          status: "Paid",
          dueStatus: "No Due",
          academic_year: "2026-2027",
        },
        {
          _id: "60f000000000000000000303",
          name: "Milhouse Van Houten",
          admission_no: "ADM-2026-003",
          class_name: "Grade 5 - A",
          class_id: "60f000000000000000000401",
          section: "A",
          guardian_name: "Kirk Van Houten",
          guardian_phone: "9876543211",
          guardian_relation: "Father",
          fee_structure: ["Academic Fees (₹30,000)"],
          totalFees: 30000,
          totalPaid: 0,
          balanceAmount: 30000,
          lastPaidAmount: 0,
          lastPaymentDate: null,
          status: "Pending",
          dueStatus: "Overdue",
          academic_year: "2026-2027",
        },
      ];

      const list = options.feesData ?? defaultStudents;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            students: list,
            pagination: {
              totalItems: list.length,
              totalPages: 1,
              currentPage: 1,
              limit: 10,
            },
          },
        }),
      });
      return;
    }

    if (url.includes("/api/salaries/preview")) {
      const defaultPreview = {
        monthlySalary: 50000,
        workingDays: 30,
        presentDays: 28,
        absentDays: 2,
        lateDays: 1,
        halfDays: 0,
        leaveDays: 0,
        holidayDays: 0,
        suggestedDeduction: 3333.33,
        totalPayableAmount: 46666.67,
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: options.salariesPreviewData ?? defaultPreview,
        }),
      });
      return;
    }

    if (url.includes("/api/salaries")) {
      const defaultSalaries = [
        {
          _id: "sal_001",
          teacher_id: {
            _id: "60f000000000000000000003",
            name: "Edna Krabappel",
            employee_id: "EMP-2026-001",
            designation: "Senior Teacher",
          },
          salary_period: "2026-10",
          monthly_salary: 50000,
          working_days: 30,
          present_days: 28,
          absent_days: 2,
          suggested_deduction: 3333.33,
          payable_amount: 46666.67,
          bonus: 2000,
          deduction: 0,
          overtime_amount: 1500,
          tax_deduction: 500,
          final_salary: 49666.67,
          status: "Draft",
          payment_method: "Bank Transfer",
          createdAt: "2026-10-25T10:00:00.000Z",
        },
      ];

      const list = options.salariesData ?? defaultSalaries;
      const req = route.request();
      const method = req.method();

      if (method === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "Draft generated successfully" }),
        });
        return;
      }

      if (method === "PUT" || method === "PATCH") {
        const body = JSON.parse(req.postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "Salary record updated successfully", data: body }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            payments: list,
            summary: {
              totalPaid: 150000,
              totalPending: 50000,
              pendingCount: 1,
              count: list.length,
            },
          },
        }),
      });
      return;
    }
    if (url.includes("/api/attendance/student")) {
      const req = route.request();
      const method = req.method();

      if (method === "POST") {
        const body = JSON.parse(req.postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Attendance saved successfully",
            data: {
              _id: "att_saved_new_001",
              school_id: schoolId,
              ...body,
            },
          }),
        });
        return;
      }

      // Check if it is student history quick view
      if (/\/api\/attendance\/student\/[a-zA-Z0-9_-]+/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              student: {
                _id: "60f000000000000000000301",
                name: "Bart Simpson",
                roll_no: "101",
                admission_no: "ADM-2026-001",
              },
              stats: {
                attendancePercentage: 91,
                totalWorkingDays: 22,
                totalPresent: 20,
                totalAbsent: 1,
                totalLate: 1,
                totalLeave: 0,
                totalHalfDay: 0,
              },
              history: [
                { date: "2026-10-01", status: "present", note: "Present and attentive" },
                { date: "2026-10-02", status: "late", note: "Bus delay" },
                { date: "2026-10-03", status: "absent", note: "Sick" },
              ],
            },
          }),
        });
        return;
      }

      // If classId is specified, return class register record
      if (url.includes("classId=")) {
        if (options.studentAttendanceData === null) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: null }),
          });
          return;
        }

        const defaultAttendanceRecord = {
          _id: "att_grade5_saved",
          school_id: schoolId,
          academic_year: "2026-2027",
          class_id: "60f000000000000000000401",
          date: new Date().toISOString().split("T")[0],
          records: [
            {
              student_id: {
                _id: "60f000000000000000000301",
                name: "Bart Simpson",
                roll_no: "101",
                admission_no: "ADM-2026-001",
              },
              status: "present",
              note: "",
            },
            {
              student_id: {
                _id: "60f000000000000000000302",
                name: "Lisa Simpson",
                roll_no: "102",
                admission_no: "ADM-2026-002",
              },
              status: "present",
              note: "",
            },
          ],
        };

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: options.studentAttendanceData ?? defaultAttendanceRecord,
          }),
        });
        return;
      }

      // Otherwise overview list of attendances
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              _id: "att_grade5_overview",
              school_id: schoolId,
              class_id: {
                _id: "60f000000000000000000401",
                name: "Grade 5",
                section: "A",
              },
              date: new Date().toISOString().split("T")[0],
              records: [
                { status: "present" },
                { status: "present" },
              ],
            },
          ],
          classStudentCounts: {
            "60f000000000000000000401": 2,
            "60f000000000000000000402": 2,
          },
        }),
      });
      return;
    }

    if (url.includes("/api/attendance/teacher")) {
      const req = route.request();
      const method = req.method();

      if (method === "POST") {
        const body = JSON.parse(req.postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Attendance saved successfully",
            data: {
              _id: "teacher_att_saved_001",
              date: new Date().toISOString().split("T")[0],
              records: body.records || [],
            },
          }),
        });
        return;
      }

      if (options.teacherAttendanceData === null) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: null }),
        });
        return;
      }

      const defaultTeacherAtt = {
        _id: "t_att_today_rec",
        date: new Date().toISOString().split("T")[0],
        records: [
          {
            teacher_id: {
              _id: "60f000000000000000000003",
              name: "Edna Krabappel",
              employee_id: "EMP-2026-001",
              department: "Academic",
              designation: "Senior Teacher",
            },
            status: "present",
            note: "On duty",
            check_in: "09:00",
            check_out: "17:00",
            working_hours: 8,
            late_minutes: 0,
          },
          {
            teacher_id: {
              _id: "60f000000000000000000006",
              name: "Elizabeth Hoover",
              employee_id: "EMP-2026-002",
              department: "Academic",
              designation: "Teacher",
            },
            status: "present",
            note: "On time",
            check_in: "09:00",
            check_out: "17:00",
            working_hours: 8,
            late_minutes: 0,
          },
        ],
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: options.teacherAttendanceData ?? defaultTeacherAtt,
        }),
      });
      return;
    }

    if (url.includes("/api/attendance/summary")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: options.attendanceSummaryData ?? {
            student: { present: 45, absent: 3, late: 2, percentage: 94 },
            teacher: { present: 10, absent: 0, late: 1, percentage: 91 },
          },
        }),
      });
      return;
    }

    if (url.includes("/api/reports/attendance")) {
      if (url.includes("type=monthly")) {
        const monthlyStats = options.attendanceReportsMonthly ?? [
          {
            classId: "60f000000000000000000401",
            className: "Grade 5",
            section: "A",
            studentCount: 30,
            workingDays: 22,
            averagePresent: 28,
            averageAbsent: 2,
            rate: 93,
          },
          {
            classId: "60f000000000000000000402",
            className: "Grade 3",
            section: "B",
            studentCount: 25,
            workingDays: 22,
            averagePresent: 24,
            averageAbsent: 1,
            rate: 96,
          },
        ];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: monthlyStats }),
        });
        return;
      }

      // Default daily report
      const dailyStats = options.attendanceReportsDaily ?? [
        {
          classId: "60f000000000000000000401",
          className: "Grade 5",
          section: "A",
          total: 30,
          present: 27,
          absent: 2,
          late: 1,
          leave: 0,
          halfDay: 0,
          isMarked: true,
          rate: 93,
        },
        {
          classId: "60f000000000000000000402",
          className: "Grade 3",
          section: "B",
          total: 25,
          present: 23,
          absent: 1,
          late: 1,
          leave: 0,
          halfDay: 0,
          isMarked: true,
          rate: 96,
        },
      ];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: dailyStats }),
      });
      return;
    }

    if (url.includes("/api/transport/buses")) {
      const method = route.request().method();
      const urlObj = new URL(url);
      const isItem = /\/api\/transport\/buses\/[a-zA-Z0-9_-]+$/.test(urlObj.pathname);
      const idMatch = urlObj.pathname.match(/\/api\/transport\/buses\/([a-zA-Z0-9_-]+)$/);
      const id = idMatch ? idMatch[1] : null;

      if (method === "GET") {
        if (isItem && id) {
          const item = busesStore.find((b: any) => b._id === id || b.id === id) || busesStore[0];
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: item }) });
          return;
        }
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: busesStore }) });
        return;
      }
      if (method === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        const newBus = {
          _id: "bus-" + Date.now(),
          id: "bus-" + Date.now(),
          createdAt: new Date().toISOString(),
          ...body,
        };
        busesStore.push(newBus);
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: newBus }) });
        return;
      }
      if (method === "PUT" || method === "PATCH") {
        const body = JSON.parse(route.request().postData() || "{}");
        const idx = busesStore.findIndex((b: any) => b._id === id || b.id === id);
        if (idx >= 0) {
          busesStore[idx] = { ...busesStore[idx], ...body };
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: busesStore[idx] }) });
        } else {
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: body }) });
        }
        return;
      }
      if (method === "DELETE") {
        busesStore = busesStore.filter((b: any) => b._id !== id && b.id !== id);
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "Bus deleted" }) });
        return;
      }
    }

    if (url.includes("/api/transport/routes")) {
      const method = route.request().method();
      const urlObj = new URL(url);
      const isItem = /\/api\/transport\/routes\/[a-zA-Z0-9_-]+$/.test(urlObj.pathname);
      const idMatch = urlObj.pathname.match(/\/api\/transport\/routes\/([a-zA-Z0-9_-]+)$/);
      const id = idMatch ? idMatch[1] : null;

      if (method === "GET") {
        if (isItem && id) {
          const item = routesStore.find((r: any) => r._id === id || r.id === id) || routesStore[0];
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: item }) });
          return;
        }
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: routesStore }) });
        return;
      }
      if (method === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        const newRoute = {
          _id: "route-" + Date.now(),
          id: "route-" + Date.now(),
          createdAt: new Date().toISOString(),
          totalStudents: 0,
          ...body,
        };
        routesStore.push(newRoute);
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: newRoute }) });
        return;
      }
      if (method === "PUT" || method === "PATCH") {
        const body = JSON.parse(route.request().postData() || "{}");
        const idx = routesStore.findIndex((r: any) => r._id === id || r.id === id);
        if (idx >= 0) {
          routesStore[idx] = { ...routesStore[idx], ...body };
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: routesStore[idx] }) });
        } else {
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: body }) });
        }
        return;
      }
      if (method === "DELETE") {
        routesStore = routesStore.filter((r: any) => r._id !== id && r.id !== id);
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "Route deleted" }) });
        return;
      }
    }

    if (url.includes("/api/transport/allocations")) {
      const method = route.request().method();
      const urlObj = new URL(url);
      const isItem = /\/api\/transport\/allocations\/[a-zA-Z0-9_-]+$/.test(urlObj.pathname);
      const idMatch = urlObj.pathname.match(/\/api\/transport\/allocations\/([a-zA-Z0-9_-]+)$/);
      const id = idMatch ? idMatch[1] : null;

      if (method === "GET") {
        if (isItem && id) {
          const item = allocationsStore.find((a: any) => a._id === id || a.id === id) || allocationsStore[0];
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: item }) });
          return;
        }
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: allocationsStore }) });
        return;
      }
      if (method === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        if (body.student_ids && Array.isArray(body.student_ids)) {
          const createdList = body.student_ids.map((stId: string, idx: number) => ({
            _id: `alloc-${Date.now()}-${idx}`,
            id: `alloc-${Date.now()}-${idx}`,
            student_id: stId,
            studentId: stId,
            studentName: `Allocated Student ${idx + 1}`,
            admissionNo: `ADM-2026-${idx + 100}`,
            className: "Grade 5",
            route_id: body.route_id,
            route: "Route North",
            bus_id: body.bus_id,
            busNumber: "BUS-101",
            pickupStop: body.pickupStop || "Main Stop",
            status: body.status || "Active",
            createdAt: new Date().toISOString(),
            school_id: schoolId,
          }));
          allocationsStore.push(...createdList);
          await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: createdList }) });
          return;
        }
        const newAlloc = {
          _id: "alloc-" + Date.now(),
          id: "alloc-" + Date.now(),
          studentName: "Bart Simpson",
          admissionNo: "ADM-2026-001",
          className: "Grade 5",
          busNumber: "BUS-101",
          route: body.routeName || "Route North",
          createdAt: new Date().toISOString(),
          ...body,
        };
        allocationsStore.push(newAlloc);
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: newAlloc }) });
        return;
      }
      if (method === "PUT" || method === "PATCH") {
        const body = JSON.parse(route.request().postData() || "{}");
        const idx = allocationsStore.findIndex((a: any) => a._id === id || a.id === id);
        if (idx >= 0) {
          allocationsStore[idx] = { ...allocationsStore[idx], ...body, route: body.routeName || allocationsStore[idx].route };
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: allocationsStore[idx] }) });
        } else {
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: body }) });
        }
        return;
      }
      if (method === "DELETE") {
        allocationsStore = allocationsStore.filter((a: any) => a._id !== id && a.id !== id);
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "Allocation deleted" }) });
        return;
      }
    }

    if (url.includes("/api/rooms")) {
      const method = route.request().method();
      const urlObj = new URL(url);
      const isItem = /\/api\/rooms\/[a-zA-Z0-9_-]+$/.test(urlObj.pathname);
      const idMatch = urlObj.pathname.match(/\/api\/rooms\/([a-zA-Z0-9_-]+)$/);
      const id = idMatch ? idMatch[1] : null;

      if (method === "GET") {
        if (isItem && id) {
          const item = roomsStore.find((r: any) => r._id === id) || roomsStore[0];
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: item }) });
          return;
        }
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { rooms: roomsStore } }) });
        return;
      }
      if (method === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        const newRoom = {
          _id: "room-" + Date.now(),
          createdAt: new Date().toISOString(),
          school_id: schoolId,
          ...body,
        };
        roomsStore.push(newRoom);
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: newRoom }) });
        return;
      }
      if (method === "PUT" || method === "PATCH") {
        const body = JSON.parse(route.request().postData() || "{}");
        const idx = roomsStore.findIndex((r: any) => r._id === id);
        if (idx >= 0) {
          roomsStore[idx] = { ...roomsStore[idx], ...body };
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: roomsStore[idx] }) });
        } else {
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: body }) });
        }
        return;
      }
      if (method === "DELETE") {
        roomsStore = roomsStore.filter((r: any) => r._id !== id);
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "Room deleted" }) });
        return;
      }
    }

    if (url.includes("/api/holidays")) {
      const method = route.request().method();
      const urlObj = new URL(url);
      const isItem = /\/api\/holidays\/[a-zA-Z0-9_-]+$/.test(urlObj.pathname);
      const idMatch = urlObj.pathname.match(/\/api\/holidays\/([a-zA-Z0-9_-]+)$/);
      const id = idMatch ? idMatch[1] : null;

      if (method === "GET") {
        if (isItem && id) {
          const item = holidaysStore.find((h: any) => h._id === id) || holidaysStore[0];
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: item }) });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              holidays: holidaysStore,
              total: holidaysStore.length,
              totalPages: Math.max(1, Math.ceil(holidaysStore.length / 25)),
            },
          }),
        });
        return;
      }
      if (method === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        const newHol = {
          _id: "hol-" + Date.now(),
          display_id: "HOL-" + Math.floor(100 + Math.random() * 900),
          createdAt: new Date().toISOString(),
          school_id: schoolId,
          ...body,
        };
        holidaysStore.push(newHol);
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: newHol }) });
        return;
      }
      if (method === "PUT" || method === "PATCH") {
        const body = JSON.parse(route.request().postData() || "{}");
        const idx = holidaysStore.findIndex((h: any) => h._id === id);
        if (idx >= 0) {
          holidaysStore[idx] = { ...holidaysStore[idx], ...body };
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: holidaysStore[idx] }) });
        } else {
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: body }) });
        }
        return;
      }
      if (method === "DELETE") {
        holidaysStore = holidaysStore.filter((h: any) => h._id !== id);
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "Holiday deleted" }) });
        return;
      }
    }

    if (url.includes("/api/notices")) {
      const method = route.request().method();
      const urlObj = new URL(url);
      const isItem = /\/api\/notices\/[a-zA-Z0-9_-]+$/.test(urlObj.pathname);
      const idMatch = urlObj.pathname.match(/\/api\/notices\/([a-zA-Z0-9_-]+)$/);
      const id = idMatch ? idMatch[1] : null;

      if (method === "GET") {
        if (isItem && id) {
          const item = noticesStore.find((n: any) => n._id === id) || noticesStore[0];
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: item }) });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              notices: noticesStore,
              total: noticesStore.length,
              totalPages: Math.max(1, Math.ceil(noticesStore.length / 25)),
            },
          }),
        });
        return;
      }
      if (method === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        const newNotice = {
          _id: "not-" + Date.now(),
          createdAt: new Date().toISOString(),
          school_id: schoolId,
          ...body,
        };
        noticesStore.unshift(newNotice);
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: newNotice }) });
        return;
      }
      if (method === "PUT" || method === "PATCH") {
        const body = JSON.parse(route.request().postData() || "{}");
        const idx = noticesStore.findIndex((n: any) => n._id === id);
        if (idx >= 0) {
          noticesStore[idx] = { ...noticesStore[idx], ...body };
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: noticesStore[idx] }) });
        } else {
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: body }) });
        }
        return;
      }
      if (method === "DELETE") {
        noticesStore = noticesStore.filter((n: any) => n._id !== id);
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "Notice deleted" }) });
        return;
      }
    }

    if (url.includes("/api/upload") || url.includes("/api/public/upload")) {
      if (options.uploadData) {
        await route.fulfill({
          status: options.uploadData.status || 200,
          contentType: "application/json",
          body: JSON.stringify(options.uploadData.body || options.uploadData),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          url: "https://res.cloudinary.com/demo/image/upload/v1234567/sample_document.pdf",
          data: {
            url: "https://res.cloudinary.com/demo/image/upload/v1234567/sample_document.pdf",
            public_id: "sample_doc_123",
          },
        }),
      });
      return;
    }

    // Default fallback
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

export async function loginAsSuperAdmin(page: Page, options: MockOptions = {}) {
  await mockCommonDashboardApis(page, options);

  const payload = {
    user_id: "60f000000000000000000001",
    school_id: null,
    role: "super_admin",
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const user = {
    id: "60f000000000000000000001",
    name: "Super Admin",
    email: "superadmin@school.com",
    role: "super_admin",
    school_id: null,
    must_change_password: false,
  };

  await page.addInitScript(
    ({ access, refresh, usr }) => {
      window.localStorage.setItem("sm_access_token", access);
      window.localStorage.setItem("sm_refresh_token", refresh);
      window.localStorage.setItem("sm_user", JSON.stringify(usr));
    },
    { access: accessToken, refresh: refreshToken, usr: user }
  );
}

export async function loginAsSchoolAdmin(page: Page, options: MockOptions = {}) {
  const schoolId = options.schoolId || "60f000000000000000000100";
  const subdomain = options.subdomain || "myschool";
  await mockCommonDashboardApis(page, { ...options, schoolId, subdomain });

  const payload = {
    user_id: "60f000000000000000000002",
    school_id: schoolId,
    role: "school_admin",
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const user = {
    id: "60f000000000000000000002",
    name: "Principal Skinner",
    email: "skinner@school.com",
    role: "school_admin",
    school_id: schoolId,
    must_change_password: false,
  };

  await page.addInitScript(
    ({ access, refresh, usr, sub, streams, sections }) => {
      window.localStorage.setItem("sm_access_token", access);
      window.localStorage.setItem("sm_refresh_token", refresh);
      window.localStorage.setItem("sm_user", JSON.stringify(usr));
      window.sessionStorage.setItem("sm_active_subdomain", sub);
      window.sessionStorage.setItem(
        "sm_academic_config",
        JSON.stringify({ enable_streams: streams, enable_sections: sections })
      );
    },
    {
      access: accessToken,
      refresh: refreshToken,
      usr: user,
      sub: subdomain,
      streams: options.enableStreams ?? true,
      sections: options.enableSections ?? true,
    }
  );
}

export async function loginAsTeacher(page: Page, options: MockOptions = {}) {
  const schoolId = options.schoolId || "60f000000000000000000100";
  const subdomain = options.subdomain || "myschool";
  await mockCommonDashboardApis(page, { ...options, schoolId, subdomain });

  const payload = {
    user_id: "60f000000000000000000003",
    school_id: schoolId,
    role: "teacher",
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const user = {
    id: "60f000000000000000000003",
    name: "Edna Krabappel",
    email: "edna.myschoollife",
    role: "teacher",
    school_id: schoolId,
    must_change_password: false,
  };

  await page.addInitScript(
    ({ access, refresh, usr, sub }) => {
      window.localStorage.setItem("sm_access_token", access);
      window.localStorage.setItem("sm_refresh_token", refresh);
      window.localStorage.setItem("sm_user", JSON.stringify(usr));
      window.sessionStorage.setItem("sm_active_subdomain", sub);
    },
    { access: accessToken, refresh: refreshToken, usr: user, sub: subdomain }
  );
}

export async function loginAsStudent(page: Page, options: MockOptions = {}) {
  const schoolId = options.schoolId || "60f000000000000000000100";
  const subdomain = options.subdomain || "myschool";
  await mockCommonDashboardApis(page, { ...options, schoolId, subdomain });

  const payload = {
    user_id: "60f000000000000000000004",
    school_id: schoolId,
    role: "student",
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const user = {
    id: "60f000000000000000000004",
    name: "Bart Simpson",
    email: "bart.myschoollife",
    role: "student",
    school_id: schoolId,
    must_change_password: false,
  };

  await page.addInitScript(
    ({ access, refresh, usr, sub }) => {
      window.localStorage.setItem("sm_access_token", access);
      window.localStorage.setItem("sm_refresh_token", refresh);
      window.localStorage.setItem("sm_user", JSON.stringify(usr));
      window.sessionStorage.setItem("sm_active_subdomain", sub);
    },
    { access: accessToken, refresh: refreshToken, usr: user, sub: subdomain }
  );
}

export async function loginAsParent(page: Page, options: MockOptions = {}) {
  const schoolId = options.schoolId || "60f000000000000000000100";
  const subdomain = options.subdomain || "myschool";
  await mockCommonDashboardApis(page, { ...options, schoolId, subdomain });

  const payload = {
    user_id: "60f000000000000000000005",
    school_id: schoolId,
    role: "parent",
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const user = {
    id: "60f000000000000000000005",
    name: "Homer Simpson",
    email: "homer@simpson.com",
    role: "parent",
    school_id: schoolId,
    must_change_password: false,
  };

  await page.addInitScript(
    ({ access, refresh, usr, sub }) => {
      window.localStorage.setItem("sm_access_token", access);
      window.localStorage.setItem("sm_refresh_token", refresh);
      window.localStorage.setItem("sm_user", JSON.stringify(usr));
      window.sessionStorage.setItem("sm_active_subdomain", sub);
    },
    { access: accessToken, refresh: refreshToken, usr: user, sub: subdomain }
  );
}

// Keep backwards-compatibility for existing tests
export async function loginAsAdmin(page: Page) {
  return loginAsSuperAdmin(page);
}
