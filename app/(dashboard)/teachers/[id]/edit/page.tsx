"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useTeachers } from "../../../../hooks/useTeachers";
import { useClasses } from "../../../../hooks/useClasses";
import { useUpload } from "../../../../hooks/useUpload";
import { LoginDetailsModal } from "../../../../components/modals/LoginDetailsModal";
import { ResetPasswordModal } from "../../../../components/modals/ResetPasswordModal";
import {
  User, Briefcase, GraduationCap, Lock, Loader2, Phone, AlertCircle, ImageIcon
} from "lucide-react";

import { validateSequential } from "@/lib/utils/formValidation";

// ─── Photo Uploader ────────────────────────────────────────────────
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
    <div className="flex-shrink-0 w-full lg:w-48 flex flex-col items-center">
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ""; }}
      />
      <div
        onClick={() => !uploading && ref.current?.click()}
        className="w-32 h-32 bg-[#F1F5F9] dark:bg-slate-800 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 overflow-hidden relative cursor-pointer hover:border-primary/60 transition-colors"
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        ) : preview ? (
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-50">
            <User className="w-10 h-10 mb-2 opacity-50" />
            <span className="text-[10px]">Click to upload</span>
          </div>
        )}
      </div>
      {label && <p className="text-[10px] text-slate-400 text-center mb-2 px-1">{label}</p>}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[12px] font-semibold rounded hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
        {preview && !uploading && (
          <button
            type="button"
            onClick={onRemove}
            className="px-3 py-1.5 bg-rose-500 text-white text-[12px] font-semibold rounded hover:bg-rose-600 transition-colors"
          >
            Remove
          </button>
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

// ─── Edit Page Component ───────────────────────────────────────────
export default function EditTeacherPage() {
  const router = useRouter();
  const params = useParams();
  const editId = params.id as string;
  const { updateTeacher, getTeacher } = useTeachers({ skip: true });
  const { classes } = useClasses();
  const { uploadFile } = useUpload();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [valErrors, setValErrors] = useState<Record<string, string>>({});
  const [teacherObj, setTeacherObj] = useState<any>(null);
  const [isLoginDetailsOpen, setIsLoginDetailsOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [resetPassTarget, setResetPassTarget] = useState<{ userId: string | undefined; name: string; email: string } | null>(null);

  // Form States (matching Create form fields exactly)
  const [employeeCode, setEmployeeCode] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("Select");
  const [dob, setDob] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [qualification, setQualification] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [department, setDepartment] = useState("Academic");
  const [designation, setDesignation] = useState("Teacher");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!editId) return;
    getTeacher(editId).then((teacher) => {
      if (teacher) {
        setTeacherObj(teacher);
        setTeacherName(teacher.name || "");
        setEmployeeCode(teacher.employee_id || "");
        setGender(teacher.gender ? teacher.gender.charAt(0).toUpperCase() + teacher.gender.slice(1) : "Select");
        setPhone(teacher.phone || "");
        setEmail(teacher.email || "");
        setAddress(teacher.address || "");
        setPhotoUrl(teacher.photo_url || "");
        setQualification(teacher.qualification || "");
        setExperienceYears(teacher.experience_years ? String(teacher.experience_years) : "");
        setJoinDate(teacher.join_date ? new Date(teacher.join_date).toISOString().split("T")[0] : "");
        setStatus(teacher.is_active ? "Active" : "Inactive");
        setDepartment(teacher.department || "Academic");
        setDesignation(teacher.designation || "Teacher");
        const cid = typeof teacher.class_id === "object" ? teacher.class_id?._id : teacher.class_id;
        setClassId(cid || "");
      }
    });
  }, [editId]);

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    const url = await uploadFile(file);
    setUploadingPhoto(false);
    if (url) setPhotoUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const fieldsToValidate = [
      { id: "teacherName", value: teacherName, label: "Teacher Name" },
      { id: "employeeCode", value: employeeCode, label: "Employee ID" },
      {
        id: "gender",
        value: gender,
        label: "Gender",
        customValidate: (val: any) => (!val || val === "Select" ? "Gender selection is mandatory." : true)
      },
      {
        id: "phone",
        value: phone,
        label: "Mobile Number",
        customValidate: (val: any) => {
          if (!val || !val.trim()) return "Mobile Number is required.";
          const cleaned = val.trim();
          if (!/^\d+$/.test(cleaned)) return "Mobile Number must contain only digits.";
          if (cleaned.length !== 10) return "Mobile Number must be exactly 10 digits.";
          return true;
        }
      },
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

    const payload = {
      name: teacherName.trim(),
      employee_id: employeeCode.trim() || undefined,
      gender: gender !== "Select" ? (gender.toLowerCase() as any) : undefined,
      dob: dob || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      photo_url: photoUrl || undefined,
      qualification: qualification.trim() || undefined,
      experience_years: experienceYears ? parseInt(experienceYears) : 0,
      join_date: joinDate || undefined,
      is_active: status === "Active",
      department: department || "Academic",
      designation: designation || "Teacher",
      class_id: classId || undefined,
      class_ids: classId ? [classId] : []
    };

    const res = await updateTeacher(editId, payload);
    setIsSubmitting(false);
    if (res.success) {
      router.push("/teachers");
    } else {
      alert(res.message || "Failed to update teacher");
    }
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Edit Teacher</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/teachers" className="hover:text-primary">Teachers</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Edit Teacher</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsLoginDetailsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[12px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Login Details</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const tUid = teacherObj?.user_id && typeof teacherObj.user_id === "object" ? teacherObj.user_id._id : teacherObj?.user_id;
              setResetPassTarget({ userId: tUid, name: teacherName, email: email });
              setIsResetPassModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Reset Password</span>
          </button>
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

        {/* Professional Information */}
        <SectionCard icon={<GraduationCap className="w-4 h-4" />} title="Professional Information">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5 text-left">
            <InputGroup
              label="Teacher ID"
              value={editId}
              disabled
              hint="Automatically assigned by the system"
            />
            <InputGroup
              label="Employee Code"
              placeholder="e.g. EMP-001"
              value={employeeCode}
              onChange={e => setEmployeeCode(e.target.value)}
              required
              error={valErrors.employeeCode}
              id="employeeCode"
            />
            <InputGroup
              label="Highest Qualification"
              value={qualification}
              onChange={e => setQualification(e.target.value)}
              datalistOptions={["B.Ed", "M.Ed", "B.Sc", "M.Sc", "B.A", "M.A", "Ph.D", "B.Tech", "M.Tech", "Diploma"]}
              placeholder="e.g. M.Ed"
            />
            <InputGroup
              label="Experience (Years)"
              type="number"
              placeholder="e.g. 5"
              value={experienceYears}
              onChange={e => setExperienceYears(e.target.value)}
            />
            <InputGroup
              label="Department"
              placeholder="e.g. Academic"
              value={department}
              onChange={e => setDepartment(e.target.value)}
            />
            <InputGroup
              label="Designation"
              placeholder="e.g. Teacher"
              value={designation}
              onChange={e => setDesignation(e.target.value)}
            />
            <InputGroup 
              label="Class Teacher" 
              type="select" 
              value={classId} 
              onChange={e => setClassId(e.target.value)} 
              options={[
                { label: "Select Class", value: "" }, 
                ...classes.map(c => ({ label: `${c.name} - ${c.section}`, value: c._id }))
              ]} 
            />
          </div>
        </SectionCard>

        {/* Personal Information */}
        <SectionCard icon={<User className="w-4 h-4" />} title="Personal Information">
          <div className="p-6 space-y-6">
            <div className="flex flex-col lg:flex-row gap-8">
              <PhotoUploader
                label="JPEG, JPG, PNG — Max 5MB"
                preview={photoUrl}
                onChange={handlePhotoUpload}
                onRemove={() => setPhotoUrl("")}
                uploading={uploadingPhoto}
              />
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5 text-left">
                <InputGroup label="Teacher Name" value={teacherName} onChange={e => setTeacherName(e.target.value)} required placeholder="Enter teacher name" error={valErrors.teacherName} id="teacherName" />
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
          </div>
        </SectionCard>

        {/* Contact Information */}
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

        {/* Employment Information */}
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
          </div>
        </SectionCard>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/teachers/${editId}`)}
            className="px-6 py-2.5 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || uploadingPhoto}
            className="px-6 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-75"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : "Update Teacher"}
          </button>
        </div>
      </form>

      {/* Login Details Modal */}
      <LoginDetailsModal
        isOpen={isLoginDetailsOpen}
        onClose={() => setIsLoginDetailsOpen(false)}
        teacher={teacherObj}
        target="teacher"
      />

      <ResetPasswordModal
        isOpen={isResetPassModalOpen}
        onClose={() => setIsResetPassModalOpen(false)}
        userId={resetPassTarget?.userId}
        userName={resetPassTarget?.name || ""}
        userEmail={resetPassTarget?.email || ""}
        onSuccess={() => getTeacher(editId).then(t => { if (t) setTeacherObj(t); })}
      />
    </div>
  );
}
