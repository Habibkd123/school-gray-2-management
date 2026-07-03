"use client";

import React, { useState, useEffect, Suspense, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTeachers } from "../../../hooks/useTeachers";
import type { CreateTeacherInput } from "../../../hooks/useTeachers";
import { useSubjectMaster } from "../../../hooks/useSubjectMaster";
import { useUpload } from "../../../hooks/useUpload";
import {
  User, Briefcase, Phone, GraduationCap,
  XCircle, Loader2, ImageIcon, Copy, Check, KeyRound, Lock, ScanLine, AlertCircle
} from "lucide-react";

import { validateSequential } from "@/lib/utils/formValidation";

// ─── Generic Image Uploader ────────────────────────────────────────
function ImageUploader({
  label, sublabel, preview, onChange, onRemove, uploading, aspect = "landscape",
}: {
  label: string;
  sublabel?: string;
  preview: string;
  onChange: (file: File) => void;
  onRemove: () => void;
  uploading?: boolean;
  aspect?: "square" | "landscape";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const isLandscape = aspect === "landscape";
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{label}</label>
      {sublabel && <p className="text-[11px] text-slate-400 dark:text-slate-500 -mt-1">{sublabel}</p>}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ""; }}
      />
      <div
        onClick={() => !uploading && ref.current?.click()}
        className={`w-full ${isLandscape ? "h-36" : "h-32 w-32"
          } bg-[#F1F5F9] dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 overflow-hidden relative cursor-pointer hover:border-primary/70 hover:bg-primary/5 transition-all group`}
      >
        {uploading ? (
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        ) : preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-50 group-hover:opacity-70 transition-opacity">
            <ImageIcon className="w-8 h-8" />
            <span className="text-[11px] font-medium">Click to upload</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="flex-1 px-3 py-1.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {uploading ? "Uploading…" : preview ? "Change" : "Upload"}
        </button>
        {preview && !uploading && (
          <button
            type="button"
            onClick={onRemove}
            className="px-3 py-1.5 bg-rose-500/10 text-rose-500 text-[11px] font-semibold rounded-lg hover:bg-rose-500 hover:text-white transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Photo Uploader (square, for profile photo) ────────────────────
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
    <div className="flex-shrink-0 w-36 flex flex-col items-center">
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ""; }}
      />
      <div
        onClick={() => !uploading && ref.current?.click()}
        className="w-32 h-32 bg-[#F1F5F9] dark:bg-slate-800 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3 overflow-hidden relative cursor-pointer hover:border-primary/60 transition-colors"
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        ) : preview ? (
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-50">
            <ImageIcon className="w-8 h-8" />
            <span className="text-[10px]">Click to upload</span>
          </div>
        )}
      </div>
      {label && <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mb-2 px-1">{label}</p>}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
        {preview && !uploading && (
          <button
            type="button"
            onClick={onRemove}
            className="px-3 py-1.5 bg-rose-500 text-white text-[11px] font-semibold rounded hover:bg-rose-600 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Tag input ─────────────────────────────────────────────────────
function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  };
  return (
    <div className="flex flex-wrap gap-2 p-2 border border-border rounded-lg bg-white dark:bg-slate-900 min-h-[42px]">
      {tags.map(t => (
        <span key={t} className="px-3 py-1 bg-[#F1F5F9] dark:bg-slate-800 border border-border rounded-md text-[12px] font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          {t}
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))}>
            <XCircle className="w-3.5 h-3.5 text-slate-400 hover:text-rose-500 cursor-pointer" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        placeholder={placeholder || "Type and press Enter"}
        className="flex-1 min-w-full sm:w-[120px] text-[12px] outline-none bg-transparent text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
      />
      <button type="button" onClick={add} className="text-[11px] px-2 py-0.5 bg-primary text-white rounded font-semibold hover:bg-[var(--primary-hover)] transition-colors">Add</button>
    </div>
  );
}

// ─── Subject Specialization Input ──────────────────────────────────
function SubjectSpecializationInput({
  selectedSubjects,
  onChange,
  subjectOptions,
}: {
  selectedSubjects: string[];
  onChange: (subs: string[]) => void;
  subjectOptions: string[];
}) {
  const addSubject = (sub: string) => {
    const trimmed = sub.trim();
    if (trimmed && !selectedSubjects.includes(trimmed)) {
      onChange([...selectedSubjects, trimmed]);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val && val !== "Select Subject") {
      addSubject(val);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2 xl:col-span-1">
      <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
        Subject/Specialization
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Dropdown for existing catalog */}
        <div className="relative flex-1">
          <select
            className="w-full px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
            value="Select Subject"
            onChange={handleSelectChange}
          >
            <option disabled value="Select Subject">Select from Catalog...</option>
            {subjectOptions.filter(opt => !selectedSubjects.includes(opt)).length === 0 ? (
              <option disabled value="">All catalog subjects added</option>
            ) : (
              subjectOptions
                .filter(opt => !selectedSubjects.includes(opt))
                .map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))
            )}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
        </div>
      </div>

      {/* Selected Subjects Tags */}
      <div className="flex flex-wrap gap-2 mt-1">
        {selectedSubjects.length === 0 ? (
          <span className="text-[12px] text-slate-400 dark:text-slate-500 italic">No subjects added yet</span>
        ) : (
          selectedSubjects.map(sub => (
            <span
              key={sub}
              className="px-3 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-md text-[12px] font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1.5"
            >
              {sub}
              <button
                type="button"
                onClick={() => onChange(selectedSubjects.filter(x => x !== sub))}
                className="text-amber-500 hover:text-rose-500 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Input group ───────────────────────────────────────────────────
function InputGroup({
  label, type = "text", placeholder, options, value, onChange, required, datalistOptions, disabled, hint, error, id,
}: {
  label: string;
  type?: "text" | "email" | "date" | "select" | "password" | "number" | "tel";
  placeholder?: string;
  options?: (string | { label: string; value: string })[];
  datalistOptions?: string[];
  value?: string;
  onChange?: (e: any) => void;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  error?: string;
  id?: string;
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
            className={`w-full px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 rounded-lg outline-none transition-all appearance-none cursor-pointer disabled:opacity-60 ${borderClass}`}
            value={value}
            onChange={onChange}
            disabled={disabled}
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
        <>
          <input
            id={id}
            type={type}
            list={datalistOptions ? `${label.replace(/\s+/g, '-')}-list` : undefined}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 rounded-lg outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed ${borderClass}`}
          />
          {datalistOptions && (
            <datalist id={`${label.replace(/\s+/g, '-')}-list`}>
              {datalistOptions.map(opt => <option key={opt} value={opt} />)}
            </datalist>
          )}
        </>
      )}
      {error ? (
        <p className="text-[11px] text-rose-500 font-bold mt-0.5 animate-in slide-in-from-top-1">
          ❌ {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
      ) : null}
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
function AddTeacherContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { subjects: apiSubjects } = useSubjectMaster();
  const { createTeacher, updateTeacher, getTeacher } = useTeachers();
  const { uploadFile } = useUpload();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [valErrors, setValErrors] = useState<Record<string, string>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAadhaarFront, setUploadingAadhaarFront] = useState(false);
  const [uploadingAadhaarBack, setUploadingAadhaarBack] = useState(false);

  const subjectOptions = useMemo(() => {
    const names = new Set<string>();
    apiSubjects.forEach(s => {
      if (s.name && s.status === "Active") names.add(s.name.trim());
    });
    return Array.from(names).sort();
  }, [apiSubjects]);

  // ── Professional Information ──────────────────────────────────
  const [teacherId, setTeacherId] = useState("");          // auto-generated, display only
  const [employeeCode, setEmployeeCode] = useState("");    // manual, unique
  const [qualification, setQualification] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState("");
  const [trainingDetails, setTrainingDetails] = useState<string[]>([]);

  // ── Personal Information ──────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("Select");
  const [dob, setDob] = useState("");
  const [aadhaarFrontUrl, setAadhaarFrontUrl] = useState("");
  const [aadhaarBackUrl, setAadhaarBackUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  // ── Contact Information ───────────────────────────────────────
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  // ── Employment Information ────────────────────────────────────
  const [joinDate, setJoinDate] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  // ── Payroll Information ───────────────────────────────────────
  const [basicSalary, setBasicSalary] = useState("");
  const [contractType, setContractType] = useState("Regular");
  const [epfNo, setEpfNo] = useState("");

  // ── Login Credentials Popup ───────────────────────────────────
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ loginId: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyCredential = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  // ── Load edit data ────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      if (editId) {
        const teacher = await getTeacher(editId);
        if (teacher) {
          const [first, ...last] = teacher.name.split(" ");
          setFirstName(first || "");
          setLastName(last.join(" ") || "");
          setTeacherId(teacher._id || "");
          setEmployeeCode(teacher.employee_id || "");
          setGender(teacher.gender ? (teacher.gender.charAt(0).toUpperCase() + teacher.gender.slice(1)) : "Select");
          setDob(teacher.dob ? new Date(teacher.dob).toISOString().split("T")[0] : "");
          setPhone(teacher.phone || "");
          setEmail(teacher.email || "");
          setAddress(teacher.address || "");
          setPhotoUrl(teacher.photo_url || "");
          setQualification(teacher.qualification || "");
          const specs = teacher.subject_specialization
            ? teacher.subject_specialization.split(",").map((s: string) => s.trim()).filter(Boolean)
            : [];
          setSpecializations(specs);
          setExperienceYears(teacher.experience_years != null ? teacher.experience_years.toString() : "");
          setTrainingDetails(teacher.training_details && Array.isArray(teacher.training_details) ? teacher.training_details : []);
          setJoinDate(teacher.join_date ? new Date(teacher.join_date).toISOString().split("T")[0] : "");
          setStatus(teacher.is_active ? "Active" : "Inactive");
          setAadhaarFrontUrl((teacher as any).aadhaar_front_url || "");
          setAadhaarBackUrl((teacher as any).aadhaar_back_url || "");
          setBasicSalary(teacher.basic_salary != null ? teacher.basic_salary.toString() : "");
          setContractType(teacher.contract_type || "Regular");
          setEpfNo(teacher.epf_no || "");
        }
      }
    }
    loadData();
  }, [editId, getTeacher]);



  // ── Handle photo upload ───────────────────────────────────────
  const handlePhotoUpload = useCallback(async (file: File) => {
    setUploadingPhoto(true);
    const url = await uploadFile(file);
    setUploadingPhoto(false);
    if (url) setPhotoUrl(url);
  }, [uploadFile]);

  // ── Handle Aadhaar uploads ────────────────────────────────────
  const handleAadhaarFrontUpload = useCallback(async (file: File) => {
    setUploadingAadhaarFront(true);
    const url = await uploadFile(file);
    setUploadingAadhaarFront(false);
    if (url) setAadhaarFrontUrl(url);
  }, [uploadFile]);

  const handleAadhaarBackUpload = useCallback(async (file: File) => {
    setUploadingAadhaarBack(true);
    const url = await uploadFile(file);
    setUploadingAadhaarBack(false);
    if (url) setAadhaarBackUrl(url);
  }, [uploadFile]);

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const fieldsToValidate = [
      { id: "qualification", value: qualification, label: "Highest Qualification" },
      { id: "firstName", value: firstName, label: "First Name" },
      {
        id: "gender",
        value: gender,
        label: "Gender",
        customValidate: (val: any) => (!val || val === "Select" ? "Gender selection is mandatory." : true)
      },
      { id: "phone", value: phone, label: "Mobile Number" },
      { id: "joinDate", value: joinDate, label: "Joining Date" }
    ];

    const valResult = validateSequential(fieldsToValidate);
    if (!valResult.isValid) {
      setValErrors({ [valResult.fieldId!]: valResult.error! });
      setFormError(valResult.error!);
      return;
    }
    setValErrors({});

    setIsSubmitting(true);

    const payload: Record<string, any> = {
      name: `${firstName} ${lastName}`.trim() || "New Teacher",
      employee_id: employeeCode || undefined,
      gender: gender !== "Select" ? gender.toLowerCase() : undefined,
      dob: dob || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      photo_url: photoUrl || undefined,
      qualification: qualification || undefined,
      subject_specialization: specializations.join(", ") || undefined,
      experience_years: experienceYears ? parseInt(experienceYears) : 0,
      training_details: trainingDetails.length > 0 ? trainingDetails : undefined,
      join_date: joinDate || undefined,
      is_active: status === "Active",
      aadhaar_front_url: aadhaarFrontUrl || undefined,
      aadhaar_back_url: aadhaarBackUrl || undefined,
      basic_salary: basicSalary ? parseFloat(basicSalary) : undefined,
      contract_type: contractType || undefined,
      epf_no: epfNo || undefined,
    };

    if (editId) {
      const res = await updateTeacher(editId, payload as Partial<CreateTeacherInput & { is_active: boolean }>);
      setIsSubmitting(false);
      if (res.success) router.push("/teachers");
      else alert(res.message || "Failed to update teacher");
    } else {
      const res = await createTeacher(payload as CreateTeacherInput);
      setIsSubmitting(false);
      if (res.success) {
        const loginId = res?.credentials?.loginId || `${(firstName + lastName).toLowerCase().trim().replace(/\s+/g, "")}.myschoollife@gmail.com`;
        const pswd = res?.credentials?.password || "Master#2026";
        setCreatedCredentials({ loginId, password: pswd });
        setShowCredentials(true);
      } else {
        alert(res.message || "Failed to create teacher");
      }
    }
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{editId ? "Edit Teacher" : "Add Teacher"}</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/teachers" className="hover:text-primary">Teachers</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">{editId ? "Edit Teacher" : "Add Teacher"}</span>
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

        {/* 1. Professional Information */}
        <SectionCard icon={<GraduationCap className="w-4 h-4" />} title="Professional Information">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5 text-left">
            <InputGroup
              label="Teacher ID"
              value={editId ? teacherId : "Auto Generated"}
              disabled
              hint="Automatically assigned by the system"
            />
            <InputGroup
              label="Employee Code"
              placeholder="e.g. EMP-001"
              value={employeeCode}
              onChange={e => setEmployeeCode(e.target.value)}
              hint="Must be unique"
            />
            <InputGroup
              label="Highest Qualification"
              value={qualification}
              onChange={e => setQualification(e.target.value)}
              required
              datalistOptions={["B.Ed", "M.Ed", "B.Sc", "M.Sc", "B.A", "M.A", "Ph.D", "B.Tech", "M.Tech", "Diploma"]}
              placeholder="e.g. M.Ed"
              error={valErrors.qualification}
              id="qualification"
            />
            <SubjectSpecializationInput
              selectedSubjects={specializations}
              onChange={setSpecializations}
              subjectOptions={subjectOptions}
            />
            <InputGroup
              label="Experience (Years)"
              type="number"
              placeholder="e.g. 5"
              value={experienceYears}
              onChange={e => setExperienceYears(e.target.value)}
            />
            <div className="col-span-1 md:col-span-2 xl:col-span-3">
              <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Training Details
              </label>
              <TagInput tags={trainingDetails} onChange={setTrainingDetails} placeholder="Add training (press Enter)..." />
            </div>
          </div>
        </SectionCard>

        {/* 2. Personal Information */}
        <SectionCard icon={<User className="w-4 h-4" />} title="Personal Information">
          <div className="p-6 space-y-6">
            {/* Row 1: Photo + Basic Fields */}
            <div className="flex flex-col lg:flex-row gap-8">
              <PhotoUploader
                label="JPEG, JPG, PNG — Max 5MB"
                preview={photoUrl}
                onChange={handlePhotoUpload}
                onRemove={() => setPhotoUrl("")}
                uploading={uploadingPhoto}
              />
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5 text-left">
                <InputGroup label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="Enter first name" error={valErrors.firstName} id="firstName" />
                <InputGroup label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Enter last name" />
                <InputGroup
                  label="Gender"
                  type="select"
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  options={["Select", "Male", "Female", "Other"]}
                  required
                  error={valErrors.gender}
                  id="gender"
                />
                <InputGroup label="Date of Birth" type="date" value={dob} onChange={e => setDob(e.target.value)} />
              </div>
            </div>

            {/* Row 2: Aadhaar Card — full width, front & back side by side */}
            <div className="pt-5 border-t border-border">
              <div className="flex items-center gap-2 mb-4">
                <ScanLine className="w-4 h-4 text-slate-400" />
                <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Aadhaar Card</span>
                <span className="text-[11px] text-slate-400">(Optional)</span>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <ImageUploader
                  label="Front Side"
                  sublabel="Upload front of Aadhaar card"
                  preview={aadhaarFrontUrl}
                  onChange={handleAadhaarFrontUpload}
                  onRemove={() => setAadhaarFrontUrl("")}
                  uploading={uploadingAadhaarFront}
                />
                <ImageUploader
                  label="Back Side"
                  sublabel="Upload back of Aadhaar card"
                  preview={aadhaarBackUrl}
                  onChange={handleAadhaarBackUpload}
                  onRemove={() => setAadhaarBackUrl("")}
                  uploading={uploadingAadhaarBack}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 3. Contact Information */}
        <SectionCard icon={<Phone className="w-4 h-4" />} title="Contact Information">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5 text-left">
            <InputGroup
              label="Mobile Number"
              type="tel"
              placeholder="Enter mobile number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              error={valErrors.phone}
              id="phone"
            />
            <InputGroup
              label="Email"
              type="email"
              placeholder="Optional"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <div className="col-span-1 md:col-span-2 xl:col-span-3">
              <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Address</label>
              <textarea
                placeholder="Enter full address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full h-20 px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary/50 transition-all resize-none"
              />
            </div>
          </div>
        </SectionCard>

        {/* 4. Employment Information */}
        <SectionCard icon={<Briefcase className="w-4 h-4" />} title="Employment Information">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5 text-left">
            <InputGroup
              label="Joining Date"
              type="date"
              value={joinDate}
              onChange={e => setJoinDate(e.target.value)}
              required
              error={valErrors.joinDate}
              id="joinDate"
            />
            <InputGroup
              label="Status"
              type="select"
              value={status}
              onChange={e => setStatus(e.target.value as "Active" | "Inactive")}
              options={["Active", "Inactive"]}
            />
            <InputGroup
              label="Contract Type"
              type="select"
              value={contractType}
              onChange={e => setContractType(e.target.value)}
              options={["Regular", "Contract", "Part Time"]}
            />
            <InputGroup
              label="Basic Salary (₹)"
              type="number"
              placeholder="e.g. 25000"
              value={basicSalary}
              onChange={e => setBasicSalary(e.target.value)}
            />
            <InputGroup
              label="EPF Number"
              placeholder="e.g. EPF/12345/678"
              value={epfNo}
              onChange={e => setEpfNo(e.target.value)}
            />
          </div>
        </SectionCard>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="button"
            onClick={() => router.push("/teachers")}
            className="px-6 py-2.5 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || uploadingPhoto || uploadingAadhaarFront || uploadingAadhaarBack}
            className="px-6 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : editId ? "Update Teacher" : "Add Teacher"}
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
                <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">Teacher Created Successfully! 🎉</h2>
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
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white font-mono">{createdCredentials.password}</span>
                  <button
                    onClick={() => handleCopyCredential(createdCredentials.password, "password")}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                    title="Copy Password"
                  >
                    {copiedField === "password" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-border flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  const combinedText = `Login ID: ${createdCredentials.loginId}\nPassword: ${createdCredentials.password}`;
                  handleCopyCredential(combinedText, "all");
                }}
                className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-[12px] font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {copiedField === "all" ? (
                  <><Check className="w-3.5 h-3.5 text-green-500" /> Copied!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy All</>
                )}
              </button>
              <button
                onClick={() => { setShowCredentials(false); router.push("/teachers"); }}
                className="px-5 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-[12px] font-semibold rounded-lg hover:bg-slate-900 dark:hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Done — Go to Teachers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddTeacherPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500 flex items-center gap-2 dark:text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>}>
      <AddTeacherContent />
    </Suspense>
  );
}
