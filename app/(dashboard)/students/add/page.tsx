"use client";

import React, { useState, useEffect, Suspense, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useClasses } from "../../../hooks/useClasses";
import { useStudents } from "../../../hooks/useStudents";
import { useUpload } from "../../../hooks/useUpload";
import {
  Upload, User, MapPin, Users,
  X, Loader2, ImageIcon, Copy, Check, Lock, KeyRound, AlertCircle
} from "lucide-react";

import { validateSequential } from "@/lib/utils/formValidation";

// ─── Types ─────────────────────────────────────────────────────────
interface DocFile { name: string; url: string; }

// ─── Photo Uploader (calls /api/upload) ────────────────────────────
function PhotoUploader({
  label, preview, onChange, onRemove, uploading,
}: {
  label?: string;
  preview: string;
  onChange: (file: File) => void;
  onRemove: () => void;
  uploading?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex-shrink-0 w-full lg:w-40 flex flex-col items-center">
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ""; }}
      />
      <div
        onClick={() => !uploading && ref.current?.click()}
        className="w-28 h-28 bg-[#F1F5F9] dark:bg-slate-800 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3 overflow-hidden relative cursor-pointer hover:border-primary/60 transition-colors"
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        ) : preview ? (
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-50">
            <ImageIcon className="w-7 h-7" />
            <span className="text-[9px]">Click to upload</span>
          </div>
        )}
      </div>
      {label && <p className="text-[10px] text-slate-400 text-center mb-2 px-1">{label}</p>}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="px-3 py-1 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold rounded hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
        {preview && !uploading && (
          <button
            type="button"
            onClick={onRemove}
            className="px-3 py-1 bg-rose-50 text-white text-[11px] font-semibold rounded hover:bg-rose-600 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Input group ───────────────────────────────────────────────────
function InputGroup({ label, type = "text", placeholder, options, value, onChange, required, error, id }: {
  label: string; type?: "text" | "email" | "date" | "select" | "number";
  placeholder?: string; options?: (string | { label: string; value: string })[];
  value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; required?: boolean;
  error?: string; id?: string;
}) {
  const borderClass = error 
    ? "border border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" 
    : "border border-border focus:border-primary/50";

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {type === "select" ? (
        <div className="relative">
          <select 
            id={id}
            className={`w-full px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 rounded-lg outline-none transition-all appearance-none cursor-pointer ${borderClass}`} 
            value={value} 
            onChange={onChange as any}
          >
            {options?.map(opt => {
              const isObj = typeof opt === "object" && opt !== null;
              const val = isObj ? opt.value : opt;
              const lbl = isObj ? opt.label : opt;
              return <option key={val} value={val}>{lbl}</option>;
            })}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
        </div>
      ) : (
        <input 
          id={id}
          type={type} 
          placeholder={placeholder} 
          value={value} 
          onChange={onChange as any} 
          className={`w-full px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 rounded-lg outline-none transition-all ${borderClass}`} 
        />
      )}
      {error && (
        <p className="text-[11px] text-rose-500 font-bold mt-0.5 text-left animate-in slide-in-from-top-1">
          ❌ {error}
        </p>
      )}
    </div>
  );
}

// ─── Section card ──────────────────────────────────────────────────
function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden card-shadow">
      <div className="bg-slate-50/80 dark:bg-slate-800/50 px-6 py-4 border-b border-border flex items-center gap-2">
        <span className="text-slate-500 dark:text-slate-400">{icon}</span>
        <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────
function AddStudentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { classes: apiClasses } = useClasses();
  const { createStudent, updateStudent, getStudent } = useStudents({ skip: true });
  const { uploadFile } = useUpload();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [formError, setFormError] = useState("");
  const [valErrors, setValErrors] = useState<Record<string, string>>({});

  // Upload states
  const [uploadingStudentPhoto, setUploadingStudentPhoto] = useState(false);
  const [uploadingGuardianPhoto, setUploadingGuardianPhoto] = useState(false);

  const classOptions = apiClasses.map(c => ({ label: c.section ? `${c.name} - ${c.section}` : c.name, value: c._id }));

  // ── Personal Info ──────────────────────────────────────────────
  const [photoPreview, setPhotoPreview] = useState("");
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("Select");
  const [dob, setDob] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [religion, setReligion] = useState("Select");
  const [category, setCategory] = useState("Select");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [section, setSection] = useState("Select");
  const [academicYear, setAcademicYear] = useState("June 2025 - 2026");
  const [aadhaarNo, setAadhaarNo] = useState("");
  const [address, setAddress] = useState("");

  // ── Login Credentials Popup ────────────────────────────────────
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ loginId: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyCredential = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  // ── Parents ────────────────────────────────────────────────────
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [fatherEmail, setFatherEmail] = useState("");
  const [fatherOccupation, setFatherOccupation] = useState("");

  // ── Guardian Details ───────────────────────────────────────────
  const [guardianPhoto, setGuardianPhoto] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianOccupation, setGuardianOccupation] = useState("");
  const [guardianAddress, setGuardianAddress] = useState("");
  const [guardianType, setGuardianType] = useState("father");

  // ── Load edit data ─────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      if (editId) {
        const student = await getStudent(editId);
        if (student) {
          setName(student.name || "");
          setClassId(typeof student.class_id === "object" ? student.class_id._id : student.class_id || "");
          setRollNo(student.roll_no || "");
          setEmail(student.email || "");
          if (student.photo_url) setPhotoPreview(student.photo_url);
          if (student.gender) setGender(student.gender.charAt(0).toUpperCase() + student.gender.slice(1));
          if (student.dob) setDob(new Date(student.dob).toISOString().split("T")[0]);
          if (student.admission_no) setAdmissionNo(student.admission_no);
          if (student.admission_date) setAdmissionDate(new Date(student.admission_date).toISOString().split("T")[0]);
          if (student.academic_year) setAcademicYear(student.academic_year);
          if (student.religion) setReligion(student.religion);
          if (student.category) setCategory(student.category);
          if (student.phone) setPrimaryPhone(student.phone);
          if (student.address) setAddress(student.address);
          if (student.aadhaar_no) setAadhaarNo(student.aadhaar_no);

          // Father Details
          if (student.parent_id && typeof student.parent_id === "object") {
            const p = student.parent_id;
            setFatherName(student.father_name || p.name || "");
            setFatherPhone(student.father_phone || p.phone || "");
            setFatherEmail(student.father_email || p.email || "");
            setFatherOccupation(student.father_occupation || p.occupation || "");
          } else {
            setFatherName(student.father_name || "");
            setFatherPhone(student.father_phone || "");
            setFatherEmail(student.father_email || "");
            setFatherOccupation(student.father_occupation || "");
          }

          // Parent / guardian details
          if (student.parent_id && typeof student.parent_id === "object") {
            const p = student.parent_id;
            setGuardianName(student.guardian_name || p.name || "");
            setGuardianPhone(student.guardian_phone || p.phone || "");
            setGuardianEmail(student.guardian_email || p.email || "");
            setGuardianRelation(student.guardian_relation || p.relation || "");
            setGuardianPhoto(student.guardian_photo || p.photo_url || "");
            setGuardianOccupation(student.guardian_occupation || p.occupation || "");
            setGuardianAddress(student.guardian_address || p.address || "");
            setGuardianType(student.guardian_type || (p.relation?.toLowerCase() === "father" ? "father" : p.relation?.toLowerCase() === "mother" ? "mother" : "other"));
          } else {
            setGuardianName(student.guardian_name || "");
            setGuardianPhone(student.guardian_phone || "");
            setGuardianEmail(student.guardian_email || "");
            setGuardianRelation(student.guardian_relation || "");
            setGuardianPhoto(student.guardian_photo || "");
            setGuardianOccupation(student.guardian_occupation || "");
            setGuardianAddress(student.guardian_address || "");
            setGuardianType(student.guardian_type || "father");
          }
        }
      }
    }
    loadData();
  }, [editId]);

  // Keep guardian in sync with selected parent
  useEffect(() => {
    if (guardianType === "father") {
      setGuardianName(fatherName);
      setGuardianRelation("Father");
      setGuardianPhone(fatherPhone);
      setGuardianEmail(fatherEmail);
      setGuardianOccupation(fatherOccupation);
    } else if (guardianType === "mother") {
      setGuardianRelation("Mother");
    }
  }, [guardianType, fatherName, fatherPhone, fatherEmail, fatherOccupation]);

  // Pre-populate admission date on create mode
  useEffect(() => {
    if (!editId) {
      const today = new Date().toISOString().split("T")[0];
      setAdmissionDate(today);
    }
  }, [editId]);

  // Sync section state automatically when classId or apiClasses changes
  useEffect(() => {
    if (classId && apiClasses.length > 0) {
      const cls = apiClasses.find(c => c._id === classId);
      if (cls && cls.section) {
        setSection(cls.section);
      }
    } else if (!classId) {
      setSection("Select");
    }
  }, [classId, apiClasses]);

  // ── Upload handlers ────────────────────────────────────────────
  const handlePhotoUpload = useCallback(async (file: File) => {
    setUploadingStudentPhoto(true);
    const url = await uploadFile(file);
    setUploadingStudentPhoto(false);
    if (url) setPhotoPreview(url);
  }, [uploadFile]);

  const handleGuardianPhoto = useCallback(async (file: File) => {
    setUploadingGuardianPhoto(true);
    const url = await uploadFile(file);
    setUploadingGuardianPhoto(false);
    if (url) setGuardianPhoto(url);
  }, [uploadFile]);

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const fieldsToValidate = [
      { id: "academicYear", value: academicYear, label: "Academic Year" },
      { id: "admissionNo", value: admissionNo, label: "Admission Number" },
      { id: "admissionDate", value: admissionDate, label: "Admission Date" },
      {
        id: "classId",
        value: classId,
        label: "Class",
        customValidate: (val: any) => {
          if (!val) return "Class selection is mandatory.";
          const selectedClass = apiClasses.find(c => c._id === val);
          if (!selectedClass) return "Selected class is invalid.";
          
          const sectionsExistForClass = apiClasses.some(
            c => c.name.toLowerCase() === selectedClass.name.toLowerCase() && c.section && c.section.trim() !== ""
          );
          if (sectionsExistForClass && (!selectedClass.section || !selectedClass.section.trim())) {
            return "Section selection is mandatory because sections exist for this class.";
          }
          return true;
        }
      },
      { id: "name", value: name, label: "Student Name" },
      {
        id: "gender",
        value: gender,
        label: "Gender",
        customValidate: (val: any) => (!val || val === "Select" ? "Gender selection is mandatory." : true)
      },
      {
        id: "primaryPhone",
        value: primaryPhone,
        label: "Mobile Number",
        customValidate: (val: any) => {
          if (!val) return true;
          const clean = String(val).trim();
          if (clean === "") return true;
          if (!/^\d+$/.test(clean)) return "Mobile Number must contain only digits.";
          if (clean.length !== 10) return "Mobile Number must be exactly 10 digits.";
          return true;
        }
      },
      { id: "guardianName", value: guardianName, label: "Guardian Name" },
      {
        id: "guardianRelation",
        value: guardianRelation,
        label: "Guardian Relation",
        customValidate: (val: any) => (!val || val === "Select" ? "Guardian Relation selection is mandatory." : true)
      },
      {
        id: "guardianPhone",
        value: guardianPhone,
        label: "Guardian Phone Number",
        customValidate: (val: any) => {
          if (!val || String(val).trim() === "") return "Guardian Phone Number is required.";
          const clean = String(val).trim();
          if (!/^\d+$/.test(clean)) return "Guardian Phone Number must contain only digits.";
          if (clean.length !== 10) return "Guardian Phone Number must be exactly 10 digits.";
          return true;
        }
      },
      {
        id: "fatherPhone",
        value: fatherPhone,
        label: "Father Phone Number",
        customValidate: (val: any) => {
          if (!val) return true;
          const clean = String(val).trim();
          if (clean === "") return true;
          if (!/^\d+$/.test(clean)) return "Father Phone Number must contain only digits.";
          if (clean.length !== 10) return "Father Phone Number must be exactly 10 digits.";
          return true;
        }
      }
    ];

    const valResult = validateSequential(fieldsToValidate);
    if (!valResult.isValid) {
      setValErrors({ [valResult.fieldId!]: valResult.error! });
      setFormError(valResult.error!);
      return;
    }
    setValErrors({});

    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const studentName = name.trim() || "New Student";
      const payload = {
        name: studentName,
        email: email || undefined,
        guardian_email: guardianEmail || undefined,
        class_id: classId,
        roll_no: rollNo || undefined,
        guardian_name: guardianName || undefined,
        guardian_phone: guardianPhone || undefined,
        guardian_relation: guardianRelation !== "Select" ? guardianRelation : undefined,
        photo_url: photoPreview || undefined,
        gender: gender !== "Select" ? gender.toLowerCase() : undefined,
        dob: dob || undefined,
        admission_no: admissionNo || undefined,
        admission_date: admissionDate || undefined,
        address: address || undefined,
        phone: primaryPhone || undefined,
        guardian_photo: guardianPhoto || undefined,
        religion: religion !== "Select" ? religion : undefined,
        category: category !== "Select" ? category : undefined,
        father_name: fatherName || undefined,
        father_phone: fatherPhone || undefined,
        father_email: fatherEmail || undefined,
        father_occupation: fatherOccupation || undefined,
        guardian_type: guardianType || undefined,
        guardian_occupation: guardianOccupation || undefined,
        guardian_address: guardianAddress || undefined,
        academic_year: academicYear || undefined,
        aadhaar_no: aadhaarNo || undefined,
      };

      let result;
      if (editId) {
        result = await updateStudent(editId, payload as any);
        if (result?.success !== false) {
          router.push("/students");
        } else {
          setFormError(result.message || "Failed to save student");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        result = await createStudent(payload as any);
        if (result?.success !== false) {
          const loginId = result?.credentials?.loginId || "";
          const password = result?.credentials?.password || "";
          setCreatedCredentials({ loginId, password });
          setShowCredentials(true);
        } else {
          setFormError(result.message || "Failed to save student");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const anyUploading = uploadingStudentPhoto || uploadingGuardianPhoto;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{editId ? "Edit Student" : "Add Student"}</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <Link href="/students" className="hover:text-primary">Students</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">{editId ? "Edit Student" : "Add Student"}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Validation Error Banner */}
        {formError && (
          <div className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg px-4 py-3 text-left animate-in fade-in">
            <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[13px] text-rose-600 dark:text-rose-400 font-semibold leading-snug">{formError}</p>
          </div>
        )}

        {/* ── 1. Personal Information ── */}
        <SectionCard icon={<User className="w-4 h-4" />} title="Personal Information">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Student Photo */}
              <PhotoUploader
                label="JPEG, JPG, PNG, GIF — Max 5MB"
                preview={photoPreview}
                onChange={handlePhotoUpload}
                onRemove={() => setPhotoPreview("")}
                uploading={uploadingStudentPhoto}
              />
              {/* Form Grid */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-5 text-left">
                <InputGroup label="Academic Year" type="select" value={academicYear} onChange={e => setAcademicYear(e.target.value)} options={["June 2024 - 2025", "June 2025 - 2026", "June 2026 - 2027"]} required error={valErrors.academicYear} id="academicYear" />
                <InputGroup label="Admission Number" placeholder="Enter Admission Number" value={admissionNo} onChange={e => setAdmissionNo(e.target.value)} required error={valErrors.admissionNo} id="admissionNo" />
                <InputGroup label="Admission Date" type="date" value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} required error={valErrors.admissionDate} id="admissionDate" />
                <InputGroup label="Class" type="select" value={classId} onChange={e => setClassId(e.target.value)} options={[{ label: "Select", value: "" }, ...classOptions]} required error={valErrors.classId} id="classId" />

                {/* Section display (read-only) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                    Section
                  </label>
                  <input
                    type="text"
                    value={section}
                    readOnly
                    disabled
                    className="w-full px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/50 border border-border rounded-lg outline-none cursor-not-allowed font-medium opacity-80"
                  />
                </div>

                <InputGroup label="Roll Number" value={rollNo} onChange={e => setRollNo(e.target.value)} />
                <InputGroup label="Student Name" value={name} onChange={e => setName(e.target.value)} required error={valErrors.name} id="name" />

                <InputGroup label="Gender" type="select" value={gender} onChange={e => setGender(e.target.value)} options={["Select", "Male", "Female", "Other"]} required error={valErrors.gender} id="gender" />
                <InputGroup label="Date of Birth" type="date" value={dob} onChange={e => setDob(e.target.value)} />
                <InputGroup label="Mobile Number" value={primaryPhone} onChange={e => setPrimaryPhone(e.target.value)} error={valErrors.primaryPhone} id="primaryPhone" />
                <InputGroup label="Email Address (Optional)" type="email" value={email} onChange={e => setEmail(e.target.value)} />

                <InputGroup label="Aadhaar Number (Optional)" value={aadhaarNo} onChange={e => setAadhaarNo(e.target.value)} />
                <InputGroup label="Religion" type="select" value={religion} onChange={e => setReligion(e.target.value)} options={["Select", "Christian", "Muslim", "Hindu", "Sikh", "Buddhist", "Jain", "Other"]} />
                <InputGroup label="Category" type="select" value={category} onChange={e => setCategory(e.target.value)} options={["Select", "General", "OBC", "SC", "ST"]} />

                <div className="col-span-1 md:col-span-2 xl:col-span-4">
                  <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                    Address
                  </label>
                  <textarea
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary/50 transition-all resize-none h-20"
                    placeholder="Enter full address"
                  />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── 2. Parents & Guardian ── */}
        <SectionCard icon={<Users className="w-4 h-4" />} title="Parents & Guardian Information">
          <div className="p-6 space-y-8">
            {/* Father Details */}
            <div>
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-border pb-2 text-left">Father Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 text-left">
                <InputGroup label="Father Name" value={fatherName} onChange={e => setFatherName(e.target.value)} />
                <InputGroup label="Phone Number" value={fatherPhone} onChange={e => setFatherPhone(e.target.value)} error={valErrors.fatherPhone} id="fatherPhone" />
                <InputGroup label="Email Address" type="email" value={fatherEmail} onChange={e => setFatherEmail(e.target.value)} />
                <InputGroup label="Occupation" value={fatherOccupation} onChange={e => setFatherOccupation(e.target.value)} />
              </div>
            </div>

            {/* Guardian Details */}
            <div>
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-border pb-2 text-left">Guardian Details</h3>
              <div className="flex items-center gap-6 mb-5 text-left text-[13px] text-slate-700 dark:text-slate-200">
                <label className="font-semibold">Is Guardian?</label>
                {["father", "mother", "other"].map(g => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="guardian" className="accent-primary" checked={guardianType === g} onChange={() => setGuardianType(g)} />
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </label>
                ))}
              </div>
              <div className="flex flex-col lg:flex-row gap-8">
                <PhotoUploader
                  label="Guardian Photo"
                  preview={guardianPhoto}
                  onChange={handleGuardianPhoto}
                  onRemove={() => setGuardianPhoto("")}
                  uploading={uploadingGuardianPhoto}
                />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 text-left">
                  <InputGroup label="Guardian Name" value={guardianName} onChange={e => setGuardianName(e.target.value)} required error={valErrors.guardianName} id="guardianName" />
                  <InputGroup label="Guardian Relation" value={guardianRelation} onChange={e => setGuardianRelation(e.target.value)} required error={valErrors.guardianRelation} id="guardianRelation" />
                  <InputGroup label="Phone Number" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} required error={valErrors.guardianPhone} id="guardianPhone" />
                  <InputGroup label="Email" type="email" value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} />
                  <InputGroup label="Occupation" value={guardianOccupation} onChange={e => setGuardianOccupation(e.target.value)} />
                  <div className="col-span-1 md:col-span-2 xl:col-span-3">
                    <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Address</label>
                    <textarea value={guardianAddress} onChange={e => setGuardianAddress(e.target.value)} className="w-full h-10 px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary/50 transition-all resize-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="button"
            onClick={() => router.push("/students")}
            className="px-6 py-2.5 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || anyUploading}
            className="px-6 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {(isSubmitting || anyUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
            {anyUploading ? "Uploading…" : isSubmitting ? "Saving…" : editId ? "Update Student" : "Add Student"}
          </button>
        </div>

      </form>

      {/* ── Login Credentials Popup ── */}
      {showCredentials && createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-border animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center gap-3 p-5 border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">Student Created Successfully! 🎉</h2>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Save these login credentials before closing</p>
              </div>
            </div>

            {/* Credentials */}
            <div className="p-5 space-y-4">
              {/* Login ID */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Login ID (Username)</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white font-mono break-all">{createdCredentials.loginId}</span>
                  <button
                    onClick={() => handleCopyCredential(createdCredentials.loginId, "loginId")}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                    title="Copy Login ID"
                  >
                    {copiedField === "loginId" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <KeyRound className="w-3 h-3" /> Default Password
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white font-mono tracking-widest">{createdCredentials.password}</span>
                  <button
                    onClick={() => handleCopyCredential(createdCredentials.password, "password")}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                    title="Copy Password"
                  >
                    {copiedField === "password" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Copy All button */}
              <button
                onClick={() => handleCopyCredential(
                  `Login ID: ${createdCredentials.loginId}\nPassword: ${createdCredentials.password}`,
                  "all"
                )}
                className="w-full py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {copiedField === "all" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedField === "all" ? "Copied!" : "Copy All to Clipboard"}
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Password format: <strong>DDMMYY</strong> (Date of Birth). Student must change password on first login.
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex justify-end">
              <button
                onClick={() => { setShowCredentials(false); router.push("/students"); }}
                className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[13px] font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                Done — Go to Students
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddStudentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500 flex items-center gap-2 dark:text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>}>
      <AddStudentContent />
    </Suspense>
  );
}
