"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Clock,
  CreditCard,
  Award,
  Bus,
  Megaphone,
  Settings,
  Search,
  Bell,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  ChevronRight,
  ChevronLeft,
  Filter,
  Check,
  X,
  QrCode,
  Receipt,
  FileSpreadsheet,
  UserCheck,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  RefreshCcw,
  Calendar as CalendarIcon,
  CalendarDays,
  FileText,
  BookOpen,
  Sun,
  Moon,
  Laptop,
  MoreVertical,
  Plus,
  Eye,
  Pencil,
  Building2,
  Square,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  Phone,
  Mail,
  User,
  CheckSquare,
  Play,
  Pause,
  Layers,
} from "lucide-react";

export function SaaSPortalPreview() {
  const [previewMode, setPreviewMode] = useState<"3d-zoom" | "live-slides">("3d-zoom");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true); // Auto-scroll ON by default
  const [isHovered, setIsHovered] = useState(false);
  const [erpTheme, setErpTheme] = useState<"light" | "dark">("light");

  // Filter & Search states
  const [studentSearch, setStudentSearch] = useState("");
  const [parentSearch, setParentSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");

  const slides = useMemo(
    () => [
      {
        id: "dashboard",
        title: "Admin Dashboard",
        badge: "Overview",
        image3d: "/images/saas/zoom_style_erp_mockup.jpg",
        icon: LayoutDashboard,
        mobileTag: "Campus Sync",
        mobileTitle: "Live Operations Active",
        mobileDesc: "1,240 students checked in, ₹4.85L fees collected today.",
        hotspotTitle: "Campus ERP Ecosystem",
        hotspotDesc: "All 1,286 students and 32 classes synchronized in real time.",
      },
      {
        id: "students",
        title: "Students Directory",
        badge: "Directory",
        image3d: "/images/saas/zoom_students_3d.jpg",
        icon: GraduationCap,
        mobileTag: "Student KYC",
        mobileTitle: "Aarav Ansari Enrolled",
        mobileDesc: "Class 4 admission confirmed. Digital ID ADM04009 issued.",
        hotspotTitle: "Unified Student Profiles",
        hotspotDesc: "Search, filter, and access student records in milliseconds.",
      },
      {
        id: "attendance",
        title: "Daily Attendance Register",
        badge: "Registers",
        image3d: "/images/saas/zoom_attendance_3d.jpg",
        icon: UserCheck,
        mobileTag: "Real-Time Roll Call",
        mobileTitle: "Aarav Ali marked Present",
        mobileDesc: "RFID biometric scan at 08:15 AM. Instant SMS to parents.",
        hotspotTitle: "96.4% Daily Attendance",
        hotspotDesc: "32 sections logged daily with instant parent SMS / WhatsApp.",
      },
      {
        id: "timetable",
        title: "Academic Timetable",
        badge: "Schedule",
        image3d: "/images/saas/zoom_timetable_3d.jpg",
        icon: Clock,
        mobileTag: "Daily Schedule",
        mobileTitle: "Period 2 Physics in Lab 3",
        mobileDesc: "Class 10-A with Dr. Verma. Room and time synchronized.",
        hotspotTitle: "Zero Clashing Timetable",
        hotspotDesc: "Conflict-free teacher and room allocation for 5-day school week.",
      },
      {
        id: "report-cards",
        title: "CBSE Marksheets Engine",
        badge: "Report Cards",
        image3d: "/images/saas/zoom_marksheet_3d.jpg",
        icon: FileText,
        mobileTag: "CBSE Marksheet",
        mobileTitle: "Annual Marksheet Published",
        mobileDesc: "Vikram Rathore scored Grade A1 (92.4%). Digital PDF signed.",
        hotspotTitle: "Official CBSE Format",
        hotspotDesc: "1-click automated marks calculation and bulk PDF printing.",
      },
      {
        id: "fees",
        title: "Finance & Fees UPI Ledger",
        badge: "Reconciliation",
        image3d: "/images/saas/zoom_fees_3d.jpg",
        icon: CreditCard,
        mobileTag: "UPI Autopay",
        mobileTitle: "Fees Paid: ₹25,000",
        mobileDesc: "Instant bank settlement with automated WhatsApp receipt.",
        hotspotTitle: "Zero-Touch Reconciliation",
        hotspotDesc: "Direct bank credit with instant QR and online fee portal.",
      },
      {
        id: "teachers",
        title: "Teacher Assignment",
        badge: "Faculty",
        image3d: "/images/saas/zoom_teachers_3d.jpg",
        icon: Users,
        mobileTag: "Faculty Portal",
        mobileTitle: "Class Teacher Assigned",
        mobileDesc: "Priya Sharma assigned as Class Teacher for 10th-A.",
        hotspotTitle: "Faculty Workload Balancing",
        hotspotDesc: "Assign periods, class teachers, and monitor faculty logs.",
      },
      {
        id: "syllabus",
        title: "Syllabus Tracker",
        badge: "Curriculum",
        image3d: "/images/saas/zoom_syllabus_3d.jpg",
        icon: BookOpen,
        mobileTag: "Curriculum Milestone",
        mobileTitle: "Class 10 Science 82%",
        mobileDesc: "Chapter 6 completed. Weekly quiz scheduled for Friday.",
        hotspotTitle: "Academic Progress Bar",
        hotspotDesc: "Track completion rates across all grades and term exams.",
      },
      {
        id: "parents",
        title: "Parents Directory",
        badge: "Guardians",
        image3d: "/images/saas/zoom_parents_3d.jpg",
        icon: Users,
        mobileTag: "Parent Connect",
        mobileTitle: "1,240 Parents Connected",
        mobileDesc: "Direct WhatsApp communication and fee reminder gateway.",
        hotspotTitle: "Guardian KYC & Communication",
        hotspotDesc: "Direct contact logs, emergency alerts, and meeting bookings.",
      },
      {
        id: "classes",
        title: "Classes & Capacity",
        badge: "Capacity",
        image3d: "/images/saas/zoom_classes_3d.jpg",
        icon: Building2,
        mobileTag: "Classroom Allocation",
        mobileTitle: "Class 10th-A at Capacity",
        mobileDesc: "38 / 40 seats filled. Room 204 smart classroom configured.",
        hotspotTitle: "Section & Strength Balancer",
        hotspotDesc: "Monitor student-teacher ratios and classroom capacity.",
      },
      {
        id: "subjects",
        title: "Subject Assignments",
        badge: "Curriculum",
        image3d: "/images/saas/zoom_subjects_3d.jpg",
        icon: BookOpen,
        mobileTag: "Board Curricula",
        mobileTitle: "CBSE Subject Codes Set",
        mobileDesc: "Math (041), Science (086) mapped with certified faculty.",
        hotspotTitle: "Subject & Exam Mapping",
        hotspotDesc: "Theory and practical assessment schema pre-configured.",
      },
    ],
    []
  );

  // Auto-scroll loop every 4.5 seconds (pauses on hover)
  useEffect(() => {
    if (!isPlaying || isHovered) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlaying, isHovered, slides.length]);

  function nextSlide() {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }

  function prevSlide() {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }

  const isLight = erpTheme === "light";

  // Mini Calendar generation
  const calendarDays = [
    { date: 27, inMonth: false },
    { date: 28, inMonth: false },
    { date: 29, inMonth: false },
    { date: 30, inMonth: false },
    { date: 1, inMonth: true, isSelected: true },
    { date: 2, inMonth: true, isHoliday: true },
    { date: 3, inMonth: true },
    { date: 4, inMonth: true },
    { date: 5, inMonth: true },
    { date: 6, inMonth: true },
    { date: 7, inMonth: true },
    { date: 8, inMonth: true },
    { date: 9, inMonth: true },
    { date: 10, inMonth: true },
    { date: 11, inMonth: true },
    { date: 12, inMonth: true },
    { date: 13, inMonth: true },
    { date: 14, inMonth: true },
    { date: 15, inMonth: true },
    { date: 16, inMonth: true },
    { date: 17, inMonth: true },
    { date: 18, inMonth: true },
    { date: 19, inMonth: true },
    { date: 20, inMonth: true },
    { date: 21, inMonth: true },
    { date: 22, inMonth: true },
    { date: 23, inMonth: true },
    { date: 24, inMonth: true },
    { date: 25, inMonth: true },
    { date: 26, inMonth: true },
    { date: 27, inMonth: true },
    { date: 28, inMonth: true },
    { date: 29, inMonth: true },
    { date: 30, inMonth: true },
    { date: 31, inMonth: true },
  ];

  // Real Students Data (Screenshot 2)
  const studentsData = [
    { adm: "ADM02057", name: "Aarav Ali", class: "Class 2", roll: "57", gender: "male", joined: "23 Jul 2026", status: "Active" },
    { adm: "ADM03065", name: "Aarav Ali", class: "Class 3", roll: "65", gender: "female", joined: "23 Jul 2026", status: "Active" },
    { adm: "ADM10001", name: "Aarav Ali", class: "Class 10", roll: "1", gender: "male", joined: "23 Jul 2026", status: "Active" },
    { adm: "ADM03050", name: "Aarav Ansari", class: "Class 3", roll: "50", gender: "female", joined: "23 Jul 2026", status: "Active" },
    { adm: "ADM04009", name: "Aarav Ansari", class: "Class 4", roll: "9", gender: "male", joined: "23 Jul 2026", status: "Active" },
    { adm: "ADM04098", name: "Aarav Ansari", class: "Class 4", roll: "98", gender: "male", joined: "23 Jul 2026", status: "Active" },
    { adm: "ADM05083", name: "Aarav Gupta", class: "Class 5", roll: "83", gender: "male", joined: "23 Jul 2026", status: "Active" },
    { adm: "ADM06071", name: "Aarav Gupta", class: "Class 6", roll: "71", gender: "female", joined: "23 Jul 2026", status: "Active" },
  ];

  // Real Parents Data (Screenshot 3)
  const parentsData = [
    { id: "EA8ACB", name: "Amit Ali", joined: "23 Jul 2026", type: "Mother", fatherOf: "—", motherOf: "Pooja Jain", count: "1 Student", phone: "9672222500" },
    { id: "EA8D13", name: "Amit Ali", joined: "23 Jul 2026", type: "Father", fatherOf: "Yash Mehta", motherOf: "—", count: "1 Student", phone: "9056201561" },
    { id: "EA8D80", name: "Amit Ali", joined: "23 Jul 2026", type: "Father", fatherOf: "Ananya Kumar", motherOf: "—", count: "1 Student", phone: "9451642748" },
    { id: "EA8EE6", name: "Amit Ali", joined: "23 Jul 2026", type: "Father", fatherOf: "Ishita Gupta", motherOf: "—", count: "1 Student", phone: "9765805343" },
    { id: "EA90B8", name: "Amit Ali", joined: "23 Jul 2026", type: "Mother", fatherOf: "—", motherOf: "Ananya Patel", count: "1 Student", phone: "9984461431" },
    { id: "229045", name: "Amit Ali", joined: "23 Jul 2026", type: "Mother", fatherOf: "—", motherOf: "Sneha Ansari", count: "1 Student", phone: "9702026260" },
    { id: "2291FF", name: "Amit Ali", joined: "23 Jul 2026", type: "Father", fatherOf: "Ananya Mehta", motherOf: "—", count: "1 Student", phone: "9070491839" },
    { id: "EA8DFF", name: "Amit Ansari", joined: "23 Jul 2026", type: "Mother", fatherOf: "—", motherOf: "Rahul Singh", count: "1 Student", phone: "9473945600" },
  ];

  // Real Classes Data (Screenshot 4)
  const classesData = [
    { num: 1, name: "Class 1", students: 100, teacher: "Deepak Meena", subjects: 2 },
    { num: 2, name: "Class 2", students: 100, teacher: "Mohit Agarwal", subjects: 2 },
    { num: 3, name: "Class 3", students: 100, teacher: "Anjali Yadav", subjects: 2 },
    { num: 4, name: "Class 4", students: 100, teacher: "Ritu Mishra", subjects: 3 },
    { num: 5, name: "Class 5", students: 100, teacher: "HARINDER", subjects: 3 },
    { num: 6, name: "Class 6", students: 90, teacher: "Priya Sen", subjects: 3 },
    { num: 7, name: "Class 7", students: 100, teacher: "Karan Mal", subjects: 4 },
    { num: 8, name: "Class 8", students: 101, teacher: "Neha Verma", subjects: 4 },
  ];

  return (
    <section id="preview" className="py-16 md:py-24 bg-[#080B12] border-b border-slate-800/80 relative overflow-hidden">
      {/* Background Subtle Ambience */}
      <div className="absolute inset-0 saas-dot-grid opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[360px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Clean Minimal Section Header (No Clutter) */}
        <div className="text-center max-w-3xl mx-auto mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 text-xs font-semibold text-amber-300 bg-amber-500/10 rounded-full border border-amber-500/25 tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Actual ERP Live Preview</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
            The Actual MySchoolLife Campus Software
          </h2>
          <p className="text-slate-400 mt-2.5 text-sm sm:text-base font-normal leading-relaxed">
            Live auto-scrolling preview of our actual school management interface — exactly what administrators, teachers, and staff experience daily.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex justify-center mt-6">
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
              <button
                onClick={() => setPreviewMode("3d-zoom")}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  previewMode === "3d-zoom"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-[1.02]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>3D Panoramic View (Zoom Style)</span>
              </button>
              <button
                onClick={() => setPreviewMode("live-slides")}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  previewMode === "live-slides"
                    ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20 scale-[1.02]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>11 Live System Screens</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 3D PANORAMIC VIEW (DIRECTLY MATCHING ZOOM WORKPLACE LAYOUT) ── */}
        {previewMode === "3d-zoom" && (
          <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* VIBRANT ROYAL BLUE 3D STAGE */}
            <div className="relative rounded-3xl overflow-hidden border border-blue-400/30 shadow-[0_25px_60px_-15px_rgba(20,71,198,0.35)] bg-gradient-to-b from-[#144DCF] via-[#0E38A3] to-[#09226B] p-4 sm:p-6 md:p-10 text-white">
              
              {/* Ambient Spotlight Lighting & Atmospheric Depth */}
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[750px] h-[320px] bg-sky-300/30 rounded-full blur-[120px] pointer-events-none" />
              <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#061747] to-transparent pointer-events-none" />

              {/* Top Bar of the 3D Stage with Status and Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 relative z-10 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs sm:text-sm font-bold tracking-wide">
                    Live 3D Panoramic Ecosystem
                  </span>
                  <span className="text-[11px] text-blue-200 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15 hidden sm:inline-block">
                    Screen {currentSlide + 1} of {slides.length}: {slides[currentSlide].title}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-white transition-all"
                    title={isPlaying ? "Pause auto-rotation" : "Resume auto-rotation"}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3 h-3 text-emerald-400" />
                        <span className="text-[11px]">Auto-Play ON</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-amber-300" />
                        <span className="text-[11px]">Paused</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={prevSlide}
                      className="p-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white cursor-pointer"
                      title="Previous 3D Screen"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="p-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white cursor-pointer"
                      title="Next 3D Screen"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 11 Screens Horizontal Pill Ribbon Navigator */}
              <div className="mb-6 relative z-10">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {slides.map((s, idx) => {
                    const Icon = s.icon;
                    const isActive = currentSlide === idx;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setCurrentSlide(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                          isActive
                            ? "bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-400/30 scale-105"
                            : "bg-white/10 hover:bg-white/20 text-white/90 border border-white/15"
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? "text-slate-950" : "text-amber-300"}`} />
                        <span>{s.title}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                            isActive ? "bg-slate-950/20 text-slate-950" : "bg-blue-500/30 text-sky-200"
                          }`}
                        >
                          3D
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic 3D Mockup Container for the Active Slide (Zoom Workplace Layout) */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/25 bg-slate-950/20 backdrop-blur-sm group">
                <div className="relative w-full aspect-[16/9]">
                  <Image
                    key={slides[currentSlide].id}
                    src={slides[currentSlide].image3d!}
                    alt={`MySchoolLife 3D ${slides[currentSlide].title}`}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>

                {/* Left Floating Interactive Hotspot (Contextual to active slide) */}
                <div className="absolute top-[26%] left-[4%] sm:left-[6%] z-20">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/25 shadow-2xl text-left max-w-[180px] sm:max-w-[240px] hover:scale-105 transition-all cursor-pointer">
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {slides[currentSlide].mobileTag}
                    </div>
                    <div className="text-xs font-bold text-white">{slides[currentSlide].mobileTitle}</div>
                    <p className="text-[10px] text-slate-300 mt-0.5 leading-snug hidden sm:block">
                      {slides[currentSlide].mobileDesc}
                    </p>
                  </div>
                </div>

                {/* Right Floating Hotspot (Contextual to active slide) */}
                <div className="absolute bottom-[8%] right-[6%] sm:right-[8%] z-20">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/25 shadow-2xl text-left max-w-[180px] sm:max-w-[240px] hover:scale-105 transition-all cursor-pointer">
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      {slides[currentSlide].badge}
                    </div>
                    <div className="text-xs font-bold text-white">{slides[currentSlide].hotspotTitle}</div>
                    <p className="text-[10px] text-slate-300 mt-0.5 leading-snug hidden sm:block">
                      {slides[currentSlide].hotspotDesc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Feature Badges Under the 3D Mockup */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 relative z-10 text-left">
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>📱</span> Multi-Channel Sync
                  </div>
                  <div className="text-[11px] text-blue-100 mt-0.5">Parent mobile notifications in real time</div>
                </div>

                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>⚡</span> 100% Zero-Touch
                  </div>
                  <div className="text-[11px] text-blue-100 mt-0.5">Automated registers, marksheets &amp; fees</div>
                </div>

                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🛡️</span> Tenant Isolation
                  </div>
                  <div className="text-[11px] text-blue-100 mt-0.5">your-school.myschoollife.in</div>
                </div>

                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                  <button
                    onClick={() => setPreviewMode("live-slides")}
                    className="w-full text-left text-xs font-bold text-amber-300 flex items-center justify-between group cursor-pointer"
                  >
                    <span>Switch to Raw Data Tables</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-300 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <div className="text-[11px] text-blue-200 mt-0.5">11 full-screen functional tables</div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── 11 LIVE SYSTEM SCREENS (AUTO-SCROLLING REGISTERS & MODULES) ── */}
        {previewMode === "live-slides" && (
          <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between px-2">
              <button
                onClick={() => setPreviewMode("3d-zoom")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                <span>← Back to 3D Panoramic View</span>
              </button>
              <span className="text-xs text-slate-400 font-mono">
                Slide {currentSlide + 1} of {slides.length} • {slides[currentSlide].title}
              </span>
            </div>

            {/* THE REAL DASHBOARD BROWSER WINDOW WITH MOVING GRADIENT BORDER */}
            <div
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="moving-border-card shadow-2xl relative"
            >
          <div
            className={`moving-border-inner rounded-[calc(1.5rem-1.5px)] overflow-hidden flex flex-col transition-colors duration-300 min-h-[620px] ${
              isLight ? "bg-[#F8FAFC] text-slate-900" : "bg-[#0A0E17] text-slate-100"
            }`}
          >
            {/* 1. Realistic Browser Title Bar */}
            <div className="bg-[#0F1420] px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-4 text-white relative">
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block" />
                <span className="ml-3 text-xs font-medium text-slate-300 hidden md:inline">
                  MySchoolLife Campus ERP • {slides[currentSlide].title}
                </span>
              </div>

              {/* URL Address Bar */}
              <div className="flex-1 max-w-md bg-[#070A11] border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-300 font-mono flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-500">https://</span>
                  <span className="text-amber-400 font-bold">your-school</span>
                  <span className="text-slate-300">
                    .myschoollife.in/{slides[currentSlide].id}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-sans font-semibold bg-emerald-500/15 px-1.5 py-0.2 rounded">
                  SSL Encrypted
                </span>
              </div>

              {/* Theme & Auto-Play Status Controller */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    isPlaying
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                  title={isPlaying ? "Click to Pause Auto-scroll" : "Click to Resume Auto-scroll"}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3 h-3 text-emerald-400" />
                      <span className="hidden sm:inline text-[11px]">Auto-Scrolling</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 text-slate-400" />
                      <span className="hidden sm:inline text-[11px]">Paused</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setErpTheme(isLight ? "dark" : "light")}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                  title="Toggle Light / Dark mode in ERP"
                >
                  {isLight ? (
                    <>
                      <Moon className="w-3 h-3 text-amber-300" />
                      <span className="hidden sm:inline text-[11px]">Dark</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-3 h-3 text-amber-400" />
                      <span className="hidden sm:inline text-[11px]">Light</span>
                    </>
                  )}
                </button>
              </div>

              {/* Subtle Auto-scroll Progress Line */}
              {isPlaying && !isHovered && (
                <div
                  key={currentSlide}
                  className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-amber-500 to-amber-300"
                  style={{
                    animation: "progress-fill 4.5s linear forwards",
                    width: "100%",
                  }}
                />
              )}
            </div>

            {/* 2. FULL WIDTH SLIDE CONTENT (NO SIDEBAR, NO REDUNDANT INNER BREADCRUMB BAR) */}
            <div className="flex-1 p-5 sm:p-7 overflow-x-auto relative">
              {/* ─────────────────────────────────────────────────────────────
                  SLIDE 1: ADMIN DASHBOARD OVERVIEW (Screenshot 1)
                  ───────────────────────────────────────────────────────────── */}
              {currentSlide === 0 && (
                <div key="slide-0" className="space-y-5 animate-in fade-in duration-300 text-left">
                  {/* Banner */}
                  <div className="relative overflow-hidden bg-[#262D4A] rounded-2xl text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between text-left shadow-sm">
                    <div
                      className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: "url('/asset 11.svg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center right",
                      }}
                    />
                    <div className="relative z-10">
                      <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
                        Welcome Back, Admin
                        <span className="bg-white/10 p-1.5 rounded-lg border border-white/20">
                          <Pencil className="w-3.5 h-3.5 text-white" />
                        </span>
                      </h2>
                      <p className="text-[13px] text-slate-300 mt-2 font-normal">Have a Good day at work</p>
                    </div>
                    <div className="relative z-10 mt-4 md:mt-0 flex items-center gap-1.5 text-[12px] text-slate-300 bg-black/20 px-4 py-2 rounded-lg border border-white/10">
                      <RefreshCcw className="w-3.5 h-3.5" />
                      <span>Updated Oct 1, 2026</span>
                    </div>
                  </div>

                  {/* 3 Top Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className={`border rounded-xl p-5 shadow-sm flex flex-col ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="flex items-center gap-4 mb-4">
                        <img src="/asset 7.webp" alt="Students" className="w-[52px] h-[52px] object-contain rounded-lg" />
                        <div>
                          <h3 className={`text-2xl font-bold leading-none ${isLight ? "text-slate-900" : "text-white"}`}>980</h3>
                          <p className="text-[13px] text-slate-400 mt-1 font-medium">Total Students</p>
                        </div>
                      </div>
                      <div className={`flex items-center justify-between text-[12px] pt-4 border-t ${isLight ? "border-slate-100 text-slate-500" : "border-slate-800 text-slate-400"}`}>
                        <span>Active : <strong className={isLight ? "text-slate-900" : "text-white"}>980</strong></span>
                        <span className="text-slate-300">|</span>
                        <span>Inactive : <strong className={isLight ? "text-slate-900" : "text-white"}>0</strong></span>
                      </div>
                    </div>

                    <div className={`border rounded-xl p-5 shadow-sm flex flex-col ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="flex items-center gap-4 mb-4">
                        <img src="/asset 8.webp" alt="Teachers" className="w-[52px] h-[52px] object-contain rounded-lg" />
                        <div>
                          <h3 className={`text-2xl font-bold leading-none ${isLight ? "text-slate-900" : "text-white"}`}>54</h3>
                          <p className="text-[13px] text-slate-400 mt-1 font-medium">Total Teachers</p>
                        </div>
                      </div>
                      <div className={`flex items-center justify-between text-[12px] pt-4 border-t ${isLight ? "border-slate-100 text-slate-500" : "border-slate-800 text-slate-400"}`}>
                        <span>Active : <strong className={isLight ? "text-slate-900" : "text-white"}>54</strong></span>
                        <span className="text-slate-300">|</span>
                        <span>Inactive : <strong className={isLight ? "text-slate-900" : "text-white"}>0</strong></span>
                      </div>
                    </div>

                    <div className={`border rounded-xl p-5 shadow-sm flex flex-col ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="flex items-center gap-4 mb-4">
                        <img src="/asset 9.webp" alt="Classes" className="w-[52px] h-[52px] object-contain rounded-lg" />
                        <div>
                          <h3 className={`text-2xl font-bold leading-none ${isLight ? "text-slate-900" : "text-white"}`}>10</h3>
                          <p className="text-[13px] text-slate-400 mt-1 font-medium">Total Classes</p>
                        </div>
                      </div>
                      <div className={`flex items-center justify-between text-[12px] pt-4 border-t ${isLight ? "border-slate-100 text-slate-500" : "border-slate-800 text-slate-400"}`}>
                        <span>Sections : <strong className={isLight ? "text-slate-900" : "text-white"}>10</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Columns: Schedules, Attendance, Quick Links */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className={`border rounded-xl p-6 shadow-sm ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-[15px] font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Schedules</h3>
                        <span className="text-[12px] font-semibold text-amber-500 cursor-pointer">+ Add New</span>
                      </div>
                      <div className="text-left mb-3">
                        <span className={`font-bold text-[14px] ${isLight ? "text-slate-900" : "text-white"}`}>October 2026</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-[12px] font-semibold text-slate-400 mb-2 text-center">
                        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-[13px]">
                        {calendarDays.map((d, i) => (
                          <div
                            key={i}
                            className={`p-2 rounded-lg font-medium text-[12px] flex items-center justify-center ${
                              d.isSelected
                                ? "bg-amber-500 text-white font-bold shadow-sm"
                                : d.inMonth
                                ? isLight
                                  ? "text-slate-700 hover:bg-slate-100"
                                  : "text-slate-300 hover:bg-slate-800"
                                : "text-slate-300 dark:text-slate-600"
                            }`}
                          >
                            {d.date}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={`border rounded-xl p-6 shadow-sm ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-[15px] font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Today's Attendance</h3>
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg font-mono">Oct 1</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <div className={`rounded-lg p-3 text-center border ${isLight ? "bg-[#F8F9FA] border-slate-200" : "bg-slate-800/40 border-slate-700"}`}>
                          <div className={`text-[15px] font-bold ${isLight ? "text-slate-900" : "text-white"}`}>00</div>
                          <div className="text-[10px] text-slate-500">Present</div>
                        </div>
                        <div className={`rounded-lg p-3 text-center border ${isLight ? "bg-[#F8F9FA] border-slate-200" : "bg-slate-800/40 border-slate-700"}`}>
                          <div className={`text-[15px] font-bold ${isLight ? "text-slate-900" : "text-white"}`}>00</div>
                          <div className="text-[10px] text-slate-500">Absent</div>
                        </div>
                        <div className={`rounded-lg p-3 text-center border ${isLight ? "bg-[#F8F9FA] border-slate-200" : "bg-slate-800/40 border-slate-700"}`}>
                          <div className={`text-[15px] font-bold ${isLight ? "text-slate-900" : "text-white"}`}>00</div>
                          <div className="text-[10px] text-slate-500">Late</div>
                        </div>
                      </div>
                      <div className="my-4 flex flex-col items-center justify-center relative min-h-[120px]">
                        <svg viewBox="0 0 100 50" className="w-[80%] h-auto">
                          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={isLight ? "#E2E8F0" : "#1E293B"} strokeWidth="10" strokeLinecap="round" />
                          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeDasharray="6 125.66" />
                        </svg>
                        <div className={`absolute bottom-3 text-[12px] font-extrabold ${isLight ? "text-slate-800" : "text-slate-200"}`}>0.0%</div>
                      </div>
                      <div className="flex justify-center">
                        <button className={`font-semibold text-[12px] px-4 py-2 rounded-lg flex items-center gap-1.5 ${isLight ? "bg-[#F1F3F5] text-slate-600" : "bg-slate-800 text-slate-300"}`}>
                          <CalendarIcon className="w-3.5 h-3.5" /> View All
                        </button>
                      </div>
                    </div>

                    <div className={`border rounded-xl p-6 shadow-sm ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <h3 className={`text-[15px] font-bold mb-5 ${isLight ? "text-slate-900" : "text-white"}`}>Quick Links</h3>
                      <div className="grid grid-cols-4 gap-3 my-auto">
                        <div className="flex flex-col items-center gap-2 p-2 rounded-lg">
                          <div className="w-12 h-12 rounded-full bg-[#E8F8E8] border border-[#BDE8B5] text-emerald-600 flex items-center justify-center">
                            <CalendarIcon className="w-5 h-5" />
                          </div>
                          <span className="text-[11px] font-semibold">Calendar</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 p-2 rounded-lg">
                          <div className="w-12 h-12 rounded-full bg-blue-50 border border-[#C5D5FF] text-blue-600 flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className="text-[11px] font-semibold">Result</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 p-2 rounded-lg">
                          <div className="w-12 h-12 rounded-full bg-[#FFF5E5] border border-[#FFE7B3] text-amber-600 flex items-center justify-center">
                            <UserCheck className="w-5 h-5" />
                          </div>
                          <span className="text-[11px] font-semibold">Attendance</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 p-2 rounded-lg">
                          <div className="w-12 h-12 rounded-full bg-[#EAF9F5] border border-[#C4F0E4] text-teal-600 flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className="text-[11px] font-semibold">Reports</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
                        All modules live and active
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  SLIDE 2: STUDENTS LIST (Screenshot 2)
                  ───────────────────────────────────────────────────────────── */}
              {currentSlide === 1 && (
                <div key="slide-1" className="space-y-4 animate-in fade-in duration-300 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className={`text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Students List</h2>
                    <div className="flex items-center gap-2">
                      <button className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${isLight ? "bg-white border-slate-200 text-slate-700" : "bg-slate-800 border-slate-700 text-slate-200"}`}>
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>All Time</span>
                      </button>
                      <button className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${isLight ? "bg-white border-slate-200 text-slate-700" : "bg-slate-800 border-slate-700 text-slate-200"}`}>
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span>Filter</span>
                        <span className="text-[10px]">▼</span>
                      </button>
                      <button className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${isLight ? "bg-white border-slate-200 text-slate-700" : "bg-slate-800 border-slate-700 text-slate-200"}`}>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                        <span>Sort by A-Z</span>
                        <span className="text-[10px]">▼</span>
                      </button>
                      <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 p-0.5">
                        <span className="p-1.5 rounded bg-amber-500 text-white"><LayoutGrid className="w-4 h-4" /></span>
                        <span className="p-1.5 rounded text-slate-400"><ListIcon className="w-4 h-4" /></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="text-xs text-slate-500">
                      Showing <strong className={isLight ? "text-slate-900" : "text-white"}>1–8 of 980</strong> students
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search name, ID, class..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs outline-none ${isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-slate-800 text-slate-200"}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    {studentsData.map((st, idx) => (
                      <div key={idx} className={`border rounded-xl p-4 shadow-sm flex flex-col justify-between ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-amber-500 font-mono">{st.adm}</span>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                            <MoreVertical className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-11 h-11 rounded-full bg-slate-950 text-white font-bold flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <h4 className={`text-sm font-bold leading-tight ${isLight ? "text-slate-900" : "text-white"}`}>{st.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">{st.class}</p>
                          </div>
                        </div>

                        <div className={`grid grid-cols-3 gap-2 py-2 border-t border-b text-[11px] mb-3 ${isLight ? "border-slate-100 text-slate-600" : "border-slate-800 text-slate-400"}`}>
                          <div>
                            <div className="text-[10px] text-slate-400">Roll No</div>
                            <div className="font-bold mt-0.5">{st.roll}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400">Gender</div>
                            <div className="font-bold mt-0.5 capitalize">{st.gender}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400">Joined On</div>
                            <div className="font-bold mt-0.5 text-[10px]">{st.joined}</div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button className={`px-3 py-1 rounded-md text-xs font-semibold border ${isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
                            Add Fees
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  SLIDE 3: DAILY ATTENDANCE CLASSROOM REGISTER (New Image 4)
                  ───────────────────────────────────────────────────────────── */}
              {currentSlide === 2 && (
                <div key="slide-2" className="space-y-5 animate-in fade-in duration-300 text-left">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={`text-xl font-bold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>10</div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">TOTAL CLASSES</div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={`text-xl font-bold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>0</div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">COMPLETED</div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={`text-xl font-bold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>10</div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">PENDING</div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={`text-xl font-bold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>0%</div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">ATTENDANCE %</div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={`text-xl font-bold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>0</div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">PRESENT</div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                        <X className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={`text-xl font-bold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>0</div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">ABSENT</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { name: "Class 1", count: "100 Students", teacher: "Deepak Meena", emp: "EMP013" },
                      { name: "Class 2", count: "100 Students", teacher: "Mohit Agarwal", emp: "EMP011" },
                      { name: "Class 3", count: "100 Students", teacher: "Anjali Yadav", emp: "EMP008" },
                      { name: "Class 4", count: "100 Students", teacher: "Ritu Mishra", emp: "EMP010" },
                      { name: "Class 5", count: "100 Students", teacher: "HARINDER", emp: "EMP002" },
                      { name: "Class 6", count: "90 Students", teacher: "Priya Sen", emp: "EMP002" },
                      { name: "Class 7", count: "100 Students", teacher: "Karan Mal", emp: "EMP001" },
                      { name: "Class 8", count: "100 Students", teacher: "Neha Verma", emp: "EMP004" },
                    ].map((cl, idx) => (
                      <div
                        key={idx}
                        className={`border rounded-xl p-4 shadow-sm flex flex-col justify-between ${
                          isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center">
                                <GraduationCap className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{cl.name}</h4>
                                <p className="text-[11px] text-slate-400">{cl.count}</p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                              PENDING
                            </span>
                          </div>

                          <div className="py-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>Class Teacher: <strong className={isLight ? "text-slate-900" : "text-white"}>{cl.teacher}</strong></span>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-5 mt-0.5">Emp ID: {cl.emp}</div>
                          </div>
                        </div>

                        <button className="w-full mt-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm">
                          Mark Attendance Register
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  SLIDE 4: TEACHER ASSIGNMENT (New Image 1)
                  ───────────────────────────────────────────────────────────── */}
              {currentSlide === 3 && (
                <div key="slide-3" className="space-y-4 animate-in fade-in duration-300 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Teacher Assignments</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Faculty subject allocation &amp; class teacher mapping</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Class 1 */}
                    <div className={`border rounded-xl p-4 shadow-sm ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold">Class 1</h4>
                            <p className="text-[11px] text-slate-400 font-mono">2026-2027</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Eye className="w-4 h-4 cursor-pointer" />
                          <Pencil className="w-3.5 h-3.5 cursor-pointer ml-1" />
                        </div>
                      </div>

                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ASSIGNED TEACHERS (2)</div>
                      <div className="space-y-2">
                        <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${isLight ? "bg-[#F8FAFC] border-slate-200/80" : "bg-slate-850 border-slate-800"}`}>
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">DM</div>
                          <div>
                            <div className="text-xs font-bold">Deepak Meena</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">📖 NO SUBJECT • <span className="text-amber-500 font-bold">CLASS TEACHER</span></div>
                          </div>
                        </div>

                        <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${isLight ? "bg-[#F8FAFC] border-slate-200/80" : "bg-slate-850 border-slate-800"}`}>
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">AS</div>
                          <div>
                            <div className="text-xs font-bold">Amit Sharma</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">📖 HINDI • <span className="text-amber-500 font-bold">SUBJECT TEACHER</span></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Class 5 */}
                    <div className={`border rounded-xl p-4 shadow-sm ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold">Class 5</h4>
                            <p className="text-[11px] text-slate-400 font-mono">2026-2027</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Eye className="w-4 h-4 cursor-pointer" />
                          <Pencil className="w-3.5 h-3.5 cursor-pointer ml-1" />
                        </div>
                      </div>

                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ASSIGNED TEACHERS (3)</div>
                      <div className="space-y-2">
                        <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${isLight ? "bg-[#F8FAFC] border-slate-200/80" : "bg-slate-850 border-slate-800"}`}>
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">HA</div>
                          <div>
                            <div className="text-xs font-bold">HARINDER</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">📖 NO SUBJECT • <span className="text-amber-500 font-bold">CLASS TEACHER</span></div>
                          </div>
                        </div>

                        <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${isLight ? "bg-[#F8FAFC] border-slate-200/80" : "bg-slate-850 border-slate-800"}`}>
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">VJ</div>
                          <div>
                            <div className="text-xs font-bold">Vivek Jain</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">📖 HINDI • <span className="text-amber-500 font-bold">SUBJECT TEACHER</span></div>
                          </div>
                        </div>

                        <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${isLight ? "bg-[#F8FAFC] border-slate-200/80" : "bg-slate-850 border-slate-800"}`}>
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">VJ</div>
                          <div>
                            <div className="text-xs font-bold">Vivek Jain</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">📖 MATH • <span className="text-amber-500 font-bold">SUBJECT TEACHER</span></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Class 8 */}
                    <div className={`border rounded-xl p-4 shadow-sm ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold">Class 8</h4>
                            <p className="text-[11px] text-slate-400 font-mono">2026-2027</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Eye className="w-4 h-4 cursor-pointer" />
                          <Pencil className="w-3.5 h-3.5 cursor-pointer ml-1" />
                        </div>
                      </div>

                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ASSIGNED TEACHERS (9)</div>
                      <div className="space-y-2">
                        <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${isLight ? "bg-[#F8FAFC] border-slate-200/80" : "bg-slate-850 border-slate-800"}`}>
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">NV</div>
                          <div>
                            <div className="text-xs font-bold">Neha Verma</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">📖 NO SUBJECT • <span className="text-amber-500 font-bold">CLASS TEACHER</span></div>
                          </div>
                        </div>

                        <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${isLight ? "bg-[#F8FAFC] border-slate-200/80" : "bg-slate-850 border-slate-800"}`}>
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">SC</div>
                          <div>
                            <div className="text-xs font-bold">Sneha Choudhary</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">📖 MATH • <span className="text-amber-500 font-bold">SUBJECT TEACHER</span></div>
                          </div>
                        </div>

                        <div className="text-center pt-1">
                          <span className="text-xs font-bold text-amber-500 hover:underline cursor-pointer">+ 6 More Assignments</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  SLIDE 5: MASTER ACADEMIC TIMETABLE (New Image 3)
                  ───────────────────────────────────────────────────────────── */}
              {currentSlide === 4 && (
                <div key="slide-4" className="space-y-4 animate-in fade-in duration-300 text-left">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      Master Academic Timetable (2026-2027) <span className="text-slate-400 font-normal text-xs">(7 slots)</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2">
                    {/* Monday */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-800">
                        Monday
                      </div>
                      <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40">
                        <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-mono">
                          <Clock className="w-3 h-3" /> 09:00 AM - 10:00 AM
                        </div>
                        <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mt-1">ENGLISH</div>
                        <div className="mt-2 p-1.5 rounded bg-white dark:bg-slate-900 text-[11px] font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300 shadow-2xs">
                          <User className="w-3 h-3 text-slate-400" /> HARINDER
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/40">
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-mono">
                          <Clock className="w-3 h-3" /> 09:00 AM - 10:00 AM
                        </div>
                        <div className="text-xs font-bold text-rose-900 dark:text-rose-300 mt-1">MATH</div>
                        <div className="mt-2 p-1.5 rounded bg-white dark:bg-slate-900 text-[11px] font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300 shadow-2xs">
                          <User className="w-3 h-3 text-slate-400" /> MAHENDAR
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40">
                        <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-mono">
                          <Clock className="w-3 h-3" /> 09:00 AM - 10:00 AM
                        </div>
                        <div className="text-xs font-bold text-blue-900 dark:text-blue-300 mt-1">ENGLISH</div>
                        <div className="mt-2 p-1.5 rounded bg-white dark:bg-slate-900 text-[11px] font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300 shadow-2xs">
                          <User className="w-3 h-3 text-slate-400" /> SUNITA
                        </div>
                      </div>
                    </div>

                    {/* Tuesday */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-800">
                        Tuesday
                      </div>
                      <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40">
                        <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-mono">
                          <Clock className="w-3 h-3" /> 09:00 AM - 10:00 AM
                        </div>
                        <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mt-1">ENGLISH</div>
                        <div className="mt-2 p-1.5 rounded bg-white dark:bg-slate-900 text-[11px] font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300 shadow-2xs">
                          <User className="w-3 h-3 text-slate-400" /> HARINDER
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40">
                        <div className="flex items-center gap-1.5 text-[11px] text-purple-600 font-mono">
                          <Clock className="w-3 h-3" /> 10:00 AM - 11:00 AM
                        </div>
                        <div className="text-xs font-bold text-purple-900 dark:text-purple-300 mt-1">HINDI</div>
                        <div className="mt-2 p-1.5 rounded bg-white dark:bg-slate-900 text-[11px] font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300 shadow-2xs">
                          <User className="w-3 h-3 text-slate-400" /> SUNITA
                        </div>
                      </div>
                    </div>

                    {/* Wednesday */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-800">
                        Wednesday
                      </div>
                      <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                        No classes
                      </div>
                    </div>

                    {/* Thursday */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-800">
                        Thursday
                      </div>
                      <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                        No classes
                      </div>
                    </div>

                    {/* Friday */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-800">
                        Friday
                      </div>
                      <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                        No classes
                      </div>
                    </div>

                    {/* Saturday */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-800">
                        Saturday
                      </div>
                      <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                        No classes
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  SLIDE 6: SYLLABUS CURRICULUM (New Image 2)
                  ───────────────────────────────────────────────────────────── */}
              {currentSlide === 5 && (
                <div key="slide-5" className="space-y-4 animate-in fade-in duration-300 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Syllabus Curriculum Tracker</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Chapter-wise completion status across all sections</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`border rounded-xl p-4 shadow-sm ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold">Class 1</h4>
                            <p className="text-[10px] text-slate-400">Class Teacher: Deepak Meena</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          ⏱ NOT STARTED
                        </span>
                      </div>

                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ASSIGNED SUBJECTS (2)</div>
                      <div className="space-y-2 mb-4">
                        <div className={`p-2 rounded-lg border flex items-center justify-between text-xs ${isLight ? "bg-[#F8FAFC] border-slate-200" : "bg-slate-850 border-slate-800"}`}>
                          <span className="font-semibold">HINDI</span>
                          <span className="text-[10px] text-slate-400">⏱ NOT STARTED</span>
                        </div>
                        <div className={`p-2 rounded-lg border flex items-center justify-between text-xs ${isLight ? "bg-[#F8FAFC] border-slate-200" : "bg-slate-850 border-slate-800"}`}>
                          <span className="font-semibold">ENGLISH</span>
                          <span className="text-[10px] text-slate-400">⏱ NOT STARTED</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400">OVERALL PROGRESS</div>
                          <div className="font-bold text-sm">0%</div>
                        </div>
                        <button className="text-amber-500 font-bold text-xs hover:underline cursor-pointer">
                          View Syllabus →
                        </button>
                      </div>
                    </div>

                    <div className={`border rounded-xl p-4 shadow-sm ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold">Class 4</h4>
                            <p className="text-[10px] text-slate-400">Class Teacher: Ritu Mishra</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          ⏱ NOT STARTED
                        </span>
                      </div>

                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ASSIGNED SUBJECTS (3)</div>
                      <div className="space-y-2 mb-4">
                        <div className={`p-2 rounded-lg border flex items-center justify-between text-xs ${isLight ? "bg-[#F8FAFC] border-slate-200" : "bg-slate-850 border-slate-800"}`}>
                          <span className="font-semibold">HINDI</span>
                          <span className="text-[10px] text-slate-400">⏱ NOT STARTED</span>
                        </div>
                        <div className={`p-2 rounded-lg border flex items-center justify-between text-xs ${isLight ? "bg-[#F8FAFC] border-slate-200" : "bg-slate-850 border-slate-800"}`}>
                          <span className="font-semibold">MATH</span>
                          <span className="text-[10px] text-slate-400">⏱ NOT STARTED</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400">OVERALL PROGRESS</div>
                          <div className="font-bold text-sm">0%</div>
                        </div>
                        <button className="text-amber-500 font-bold text-xs hover:underline cursor-pointer">
                          View Syllabus →
                        </button>
                      </div>
                    </div>

                    <div className={`border rounded-xl p-4 shadow-sm ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold">Class 7</h4>
                            <p className="text-[10px] text-slate-400">Class Teacher: Karan Mal</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          ⏱ NOT STARTED
                        </span>
                      </div>

                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ASSIGNED SUBJECTS (3)</div>
                      <div className="space-y-2 mb-4">
                        <div className={`p-2 rounded-lg border flex items-center justify-between text-xs ${isLight ? "bg-[#F8FAFC] border-slate-200" : "bg-slate-850 border-slate-800"}`}>
                          <span className="font-semibold">HINDI</span>
                          <span className="text-[10px] text-slate-400">⏱ NOT STARTED</span>
                        </div>
                        <div className={`p-2 rounded-lg border flex items-center justify-between text-xs ${isLight ? "bg-[#F8FAFC] border-slate-200" : "bg-slate-850 border-slate-800"}`}>
                          <span className="font-semibold">SANSKRIT</span>
                          <span className="text-[10px] text-slate-400">⏱ NOT STARTED</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400">OVERALL PROGRESS</div>
                          <div className="font-bold text-sm">0%</div>
                        </div>
                        <button className="text-amber-500 font-bold text-xs hover:underline cursor-pointer">
                          View Syllabus →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  SLIDE 7: PARENTS DIRECTORY (Screenshot 3)
                  ───────────────────────────────────────────────────────────── */}
              {currentSlide === 6 && (
                <div key="slide-6" className="space-y-4 animate-in fade-in duration-300 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className={`text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Parents Directory</h2>
                    <div className="flex items-center gap-2">
                      <button className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${isLight ? "bg-white border-slate-200 text-slate-700" : "bg-slate-800 border-slate-700 text-slate-200"}`}>
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span>Filters</span>
                        <span className="text-[10px]">▼</span>
                      </button>
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search Parent, Student..."
                          value={parentSearch}
                          onChange={(e) => setParentSearch(e.target.value)}
                          className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs outline-none ${isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-slate-800 text-slate-200"}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span>Show</span>
                      <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-semibold">10</span>
                      <span>entries</span>
                    </div>
                    <div>Showing <strong className={isLight ? "text-slate-900" : "text-white"}>1 to 8 of 981</strong> records</div>
                  </div>

                  <div className={`border rounded-xl overflow-hidden shadow-sm ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className={`text-[11px] font-semibold border-b ${isLight ? "bg-slate-50 text-slate-600 border-slate-200" : "bg-slate-850 text-slate-400 border-slate-800"}`}>
                          <th className="p-3">ID</th>
                          <th className="p-3">Parent Name</th>
                          <th className="p-3">Guardian Type</th>
                          <th className="p-3">Father of</th>
                          <th className="p-3">Mother of</th>
                          <th className="p-3">Students Count</th>
                          <th className="p-3">Primary Mobile</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {parentsData.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-mono font-bold text-amber-500">{p.id}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">AA</div>
                                <div>
                                  <div className="font-bold leading-tight">{p.name}</div>
                                  <div className="text-[10px] text-slate-400 leading-none mt-0.5">Added {p.joined}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">{p.type}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">{p.fatherOf}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">{p.motherOf}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-200">
                                {p.count}
                              </span>
                            </td>
                            <td className="p-3 font-mono">{p.phone}</td>
                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <MoreVertical className="w-3.5 h-3.5 text-slate-400 inline-block cursor-pointer" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  SLIDE 8: CLASSES LIST (Screenshot 4)
                  ───────────────────────────────────────────────────────────── */}
              {currentSlide === 7 && (
                <div key="slide-7" className="space-y-4 animate-in fade-in duration-300 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className={`text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      Classes List <span className="text-slate-400 font-normal text-sm">(10)</span>
                    </h2>
                    <button className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${isLight ? "bg-white border-slate-200 text-slate-700" : "bg-slate-800 border-slate-700 text-slate-200"}`}>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      <span>Sort: A → Z</span>
                    </button>
                  </div>

                  <div className={`border rounded-xl overflow-hidden shadow-sm ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className={`text-[11px] font-semibold border-b ${isLight ? "bg-slate-50 text-slate-600 border-slate-200" : "bg-slate-850 text-slate-400 border-slate-800"}`}>
                          <th className="p-3 w-8"><Square className="w-3.5 h-3.5 text-slate-400" /></th>
                          <th className="p-3">#</th>
                          <th className="p-3">Class</th>
                          <th className="p-3">Students</th>
                          <th className="p-3">Class Teacher</th>
                          <th className="p-3">Subjects</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {classesData.map((c) => (
                          <tr key={c.num} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-3"><Square className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" /></td>
                            <td className="p-3 font-mono text-slate-500">{c.num}</td>
                            <td className="p-3 font-bold">{c.name}</td>
                            <td className="p-3 font-mono font-semibold">{c.students}</td>
                            <td className="p-3 font-medium">{c.teacher}</td>
                            <td className="p-3 font-mono">{c.subjects}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">Active</span>
                            </td>
                            <td className="p-3 text-right">
                              <MoreVertical className="w-3.5 h-3.5 text-slate-400 inline-block cursor-pointer" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  SLIDE 9: SUBJECT ASSIGNMENTS (Screenshot 5)
                  ───────────────────────────────────────────────────────────── */}
              {currentSlide === 8 && (
                <div key="slide-8" className="space-y-4 animate-in fade-in duration-300 text-left">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Subject Assignments</h2>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500 text-white flex items-center gap-1">
                        <LayoutGrid className="w-3.5 h-3.5" /> Grouped
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { name: "Class 1", subs: [{ n: "HINDI", c: "HN" }, { n: "ENGLISH", c: "EN" }] },
                      { name: "Class 5", subs: [{ n: "MATH", c: "MH" }, { n: "HINDI", c: "HN" }, { n: "ENGLISH", c: "EN" }] },
                      { name: "Class 8", subs: [{ n: "SCIENCE", c: "SC" }, { n: "MATH", c: "MH" }, { n: "HINDI", c: "HN" }], extra: "+ 1 More Subjects" },
                      { name: "Class 2", subs: [{ n: "ENGLISH", c: "EN" }, { n: "HINDI", c: "HN" }] },
                      { name: "Class 6", subs: [{ n: "HINDI", c: "HN" }, { n: "MATH", c: "MH" }, { n: "SCIENCE", c: "SC" }] },
                      { name: "Class 9", subs: [{ n: "SCIENCE", c: "SC" }, { n: "SOCIAL SCIENCE", c: "SST" }] },
                    ].map((g, idx) => (
                      <div key={idx} className={`border rounded-xl p-4 shadow-sm ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                              <GraduationCap className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold">{g.name}</h4>
                              <p className="text-[11px] text-slate-400 font-mono">2026-2027</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <Eye className="w-4 h-4 cursor-pointer" />
                            <Pencil className="w-3.5 h-3.5 cursor-pointer ml-1" />
                          </div>
                        </div>

                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ASSIGNED SUBJECTS ({g.subs.length})</div>
                        <div className="space-y-2">
                          {g.subs.map((s, sIdx) => (
                            <div key={sIdx} className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${isLight ? "bg-[#F8FAFC] border-slate-200/80" : "bg-slate-850 border-slate-800"}`}>
                              <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                              <div>
                                <div className="text-xs font-bold leading-tight">{s.n}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">CODE: {s.c}</div>
                              </div>
                            </div>
                          ))}
                          {g.extra && (
                            <div className="text-center pt-1 text-xs font-bold text-amber-500">{g.extra}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  SLIDE 10: CBSE REPORT CARD ENGINE (High Quality Creation)
                  ───────────────────────────────────────────────────────────── */}
              {currentSlide === 9 && (
                <div key="slide-9" className="space-y-4 animate-in fade-in duration-300 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                        CBSE Automated Report Card Engine
                      </h3>
                      <p className="text-xs text-slate-400">Class 10th Board Format • Student: Vikram Rathore • Roll #18</p>
                    </div>
                    <button className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${isLight ? "bg-slate-100 border-slate-300 text-slate-700" : "bg-slate-800 border-slate-700 text-slate-200"}`}>
                      <Printer className="w-3.5 h-3.5 text-amber-500" />
                      <span>Bulk Print (38 Students)</span>
                    </button>
                  </div>

                  <div className={`p-5 rounded-2xl border shadow-sm ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0D121F] border-slate-800 text-white"}`}>
                    <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Demonstration Senior Secondary School • Affiliated to CBSE
                      </div>
                      <h4 className="text-base font-bold mt-0.5">ANNUAL ACADEMIC PERFORMANCE REPORT (2026-27)</h4>
                      <div className="flex justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                        <span>Name: <strong>Vikram Rathore</strong></span>
                        <span>Roll No: <strong>10-18</strong></span>
                        <span>Class: <strong>10th-A</strong></span>
                      </div>
                    </div>

                    <table className="w-full text-left text-xs mt-3">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                          <th className="py-2 font-medium">Subject</th>
                          <th className="py-2 font-medium text-center">Max Marks</th>
                          <th className="py-2 font-medium text-center">Obtained</th>
                          <th className="py-2 font-medium text-center">Grade</th>
                          <th className="py-2 font-medium text-right">Teacher Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-sans">
                        {[
                          { sub: "English Communicative", max: 100, obt: 92, grade: "A1", rem: "Outstanding comprehension" },
                          { sub: "Hindi Course-A", max: 100, obt: 88, grade: "A2", rem: "Strong grammar command" },
                          { sub: "Mathematics Standard", max: 100, obt: 96, grade: "A1", rem: "Exemplary analytical skills" },
                          { sub: "Science & Technology", max: 100, obt: 94, grade: "A1", rem: "Excellent practical work" },
                          { sub: "Social Science", max: 100, obt: 90, grade: "A1", rem: "Very good concept clarity" },
                        ].map((row, idx) => (
                          <tr key={idx}>
                            <td className="py-2 font-semibold">{row.sub}</td>
                            <td className="py-2 text-center text-slate-400 font-mono">{row.max}</td>
                            <td className="py-2 text-center font-bold font-mono">{row.obt}</td>
                            <td className="py-2 text-center text-emerald-600 dark:text-emerald-400 font-bold font-mono">{row.grade}</td>
                            <td className="py-2 text-right text-slate-400 text-[11px]">{row.rem}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="font-bold">Grand Total: <span className="text-amber-600 dark:text-amber-400 font-mono">460 / 500 (92.0%)</span></div>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded text-[11px]">
                        Overall Grade: A1 (PASSED WITH DISTINCTION)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  SLIDE 11: FEES & UPI RECONCILIATION LEDGER (High Quality)
                  ───────────────────────────────────────────────────────────── */}
              {currentSlide === 10 && (
                <div key="slide-10" className="space-y-4 animate-in fade-in duration-300 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Fee Management &amp; UPI Collection</h3>
                      <p className="text-xs text-slate-400">Direct school bank reconciliation &amp; automatic WhatsApp receipts</p>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      Daily Collection: ₹ 84,500
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className={`p-3.5 rounded-xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="text-[11px] text-slate-400">Total Term 2 Expected</div>
                      <div className="text-xl font-bold font-mono mt-0.5">₹ 24,50,000</div>
                    </div>
                    <div className={`p-3.5 rounded-xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="text-[11px] text-slate-400">Received via UPI / QR</div>
                      <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">₹ 18,40,000 (75%)</div>
                    </div>
                    <div className={`p-3.5 rounded-xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                      <div className="text-[11px] text-slate-400">Pending Defaulter Dues</div>
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">₹ 6,10,000 (SMS Sent)</div>
                    </div>
                  </div>

                  <div className={`rounded-xl border overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className={`text-[11px] border-b ${isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-slate-850 border-slate-800 text-slate-400"}`}>
                          <th className="p-3 font-semibold">Receipt No</th>
                          <th className="p-3 font-semibold">Student Name</th>
                          <th className="p-3 font-semibold">Fee Head</th>
                          <th className="p-3 font-semibold">Amount</th>
                          <th className="p-3 font-semibold">Mode</th>
                          <th className="p-3 font-semibold text-right">Receipt Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-sans">
                        {[
                          { rcp: "RCP-2026-0842", name: "Rahul Sharma", head: "Term 2 Tuition + Transport", amt: "₹ 14,500", mode: "UPI QR (PhonePe)" },
                          { rcp: "RCP-2026-0841", name: "Pooja Choudhary", head: "Term 2 Tuition + Exam", amt: "₹ 12,000", mode: "UPI (Google Pay)" },
                          { rcp: "RCP-2026-0840", name: "Vikram Rathore", head: "Term 1 Installment", amt: "₹ 8,500", mode: "Cash at Desk" },
                          { rcp: "RCP-2026-0839", name: "Aarav Sharma", head: "Admission & Lab Fee", amt: "₹ 15,000", mode: "NetBanking" },
                        ].map((f, fIdx) => (
                          <tr key={fIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="p-3 font-mono text-amber-600 dark:text-amber-400 font-bold">{f.rcp}</td>
                            <td className="p-3 font-semibold">{f.name}</td>
                            <td className="p-3 text-slate-500">{f.head}</td>
                            <td className="p-3 font-mono font-bold">{f.amt}</td>
                            <td className="p-3 text-[11px] text-emerald-600 font-medium">{f.mode}</td>
                            <td className="p-3 text-right">
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-semibold cursor-pointer">
                                <Download className="w-3 h-3" />
                                <span>PDF Receipt</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Minimal Bottom Navigation & Dot Indicators (Sleek, Clean) */}
            <div
              className={`px-6 py-2.5 border-t flex items-center justify-between gap-3 text-xs transition-colors ${
                isLight ? "bg-white border-slate-200 text-slate-500" : "bg-[#0F1420] border-slate-800 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px]">
                  <strong>{currentSlide + 1} / {slides.length}</strong> •{" "}
                  <span className="font-semibold text-amber-500">{slides[currentSlide].title}</span>
                </span>
              </div>

              {/* Minimal Dot Indicators */}
              <div className="flex items-center gap-1">
                {slides.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    onClick={() => setCurrentSlide(dotIdx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      currentSlide === dotIdx ? "w-5 bg-amber-400" : "w-1.5 bg-slate-300 dark:bg-slate-700"
                    }`}
                    title={`Slide ${dotIdx + 1}`}
                  />
                ))}
              </div>

              {/* Prev / Next controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={prevSlide}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextSlide}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  </section>
);
}
