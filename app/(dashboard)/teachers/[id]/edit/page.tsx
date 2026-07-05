"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useTeachers } from "../../../../hooks/useTeachers";
import { useClasses } from "../../../../hooks/useClasses";
import { useUpload } from "../../../../hooks/useUpload";
import { useSubjectMaster } from "../../../../hooks/useSubjectMaster";
import { LoginDetailsModal } from "../../../../components/modals/LoginDetailsModal";
import { ResetPasswordModal } from "../../../../components/modals/ResetPasswordModal";
import {
  User, Briefcase, Calendar, CreditCard, Bus, Building2, Share2, FileText, Lock, XCircle, Upload, Loader2, X, AlertCircle
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

// ─── Doc Uploader ─────────────────────────────────────────────────
function DocUploader({
  label, docUrl, onChange, uploading,
}: {
  label: string;
  docUrl: string | null;
  onChange: (file: File | null) => void;
  uploading?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const fileName = docUrl ? docUrl.split("/").pop() : "";

  return (
    <div>
      <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">{label}</label>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-3">Upload document - PDF, image (Max 5MB)</p>
      <input
        ref={ref}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ""; }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-primary text-white text-[11px] font-semibold rounded-lg hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? "Uploading…" : "Upload Document"}
        </button>
        {docUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-slate-600 dark:text-slate-300 font-medium truncate max-w-full sm:w-[180px]">{fileName}</span>
            <button type="button" onClick={() => onChange(null)}>
              <X className="w-4 h-4 text-rose-400 hover:text-rose-500" />
            </button>
          </div>
        ) : (
          <span className="text-[12px] text-slate-400">No file uploaded</span>
        )}
      </div>
    </div>
  );
}

// ─── Tag Input ─────────────────────────────────────────────────────
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
        placeholder={placeholder || "Type language and press Enter"}
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
    <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2 xl:col-span-4">
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

// ─── Edit Page Component ───────────────────────────────────────────
export default function EditTeacherPage() {
  const router = useRouter();
  const params = useParams();
  const editId = params.id as string;
  const { createTeacher, updateTeacher, getTeacher } = useTeachers({ skip: true });
  const { classes } = useClasses();
  const { uploadFile } = useUpload();
  const { subjects: apiSubjects } = useSubjectMaster();

  const subjectOptions = React.useMemo(() => {
    const names = new Set<string>();
    apiSubjects.forEach(s => {
      if (s.name && s.status === "Active") names.add(s.name.trim());
    });
    return Array.from(names).sort();
  }, [apiSubjects]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [valErrors, setValErrors] = useState<Record<string, string>>({});
  const [teacherObj, setTeacherObj] = useState<any>(null);
  const [isLoginDetailsOpen, setIsLoginDetailsOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [resetPassTarget, setResetPassTarget] = useState<{ userId: string | undefined; name: string; email: string } | null>(null);

  // States matching Schema
  const [employeeId, setEmployeeId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [classId, setClassId] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [gender, setGender] = useState("Select");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bloodGroup, setBloodGroup] = useState("Select");
  const [joinDate, setJoinDate] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [dob, setDob] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("Select");
  const [languages, setLanguages] = useState<string[]>([]);
  const [qualification, setQualification] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [previousSchoolName, setPreviousSchoolName] = useState("");
  const [previousSchoolAddress, setPreviousSchoolAddress] = useState("");
  const [previousSchoolPhone, setPreviousSchoolPhone] = useState("");
  const [address, setAddress] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [notes, setNotes] = useState("");

  // Payroll Info
  const [epfNo, setEpfNo] = useState("");
  const [basicSalary, setBasicSalary] = useState("");
  const [contractType, setContractType] = useState("Select");
  const [workShift, setWorkShift] = useState("Select");
  const [workLocation, setWorkLocation] = useState("");
  const [dateOfLeaving, setDateOfLeaving] = useState("");

  // Leaves Info
  const [medicalLeaves, setMedicalLeaves] = useState("10");
  const [casualLeaves, setCasualLeaves] = useState("12");
  const [maternityLeaves, setMaternityLeaves] = useState("10");
  const [sickLeaves, setSickLeaves] = useState("10");

  // Bank Info
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");

  // Transport Info
  const [transportRoute, setTransportRoute] = useState("Select");
  const [transportVehicle, setTransportVehicle] = useState("Select");
  const [transportPickupPoint, setTransportPickupPoint] = useState("Select");

  // Hostel Info
  const [hostelName, setHostelName] = useState("Select");
  const [hostelRoomNo, setHostelRoomNo] = useState("Select");

  // Social URLs
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");

  // Files & Photos
  const [photoUrl, setPhotoUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [joiningLetterUrl, setJoiningLetterUrl] = useState("");

  // Uploading state tracking
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingLetter, setUploadingLetter] = useState(false);

  // New Password Fields (for creation / reset)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!editId) return;
    getTeacher(editId).then((teacher) => {
      if (teacher) {
        setTeacherObj(teacher);
        const name = typeof teacher.name === "string" ? teacher.name : "";
        const [first, ...last] = name.split(" ");
        setFirstName(first || "");
        setLastName(last.join(" ") || "");
        setEmail(teacher.email || "");
        const specs = teacher.subject_specialization
          ? teacher.subject_specialization.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
        setSpecializations(specs);
        const cid = typeof teacher.class_id === "object" ? teacher.class_id?._id : teacher.class_id;
        setClassId(cid || "");
        setStatus(teacher.is_active ? "Active" : "Inactive");
        
        // Populate all fields dynamically
        setEmployeeId(teacher.employee_id || "");
        setGender(teacher.gender ? teacher.gender.charAt(0).toUpperCase() + teacher.gender.slice(1) : "Select");
        setPhone(teacher.phone || "");
        setBloodGroup(teacher.blood_group || "Select");
        if (teacher.join_date) setJoinDate(new Date(teacher.join_date).toISOString().split("T")[0]);
        setFatherName(teacher.father_name || "");
        setMotherName(teacher.mother_name || "");
        if (teacher.dob) setDob(new Date(teacher.dob).toISOString().split("T")[0]);
        setMaritalStatus(teacher.marital_status || "Select");
        setLanguages(teacher.languages || []);
        setQualification(teacher.qualification || "");
        setExperienceYears(teacher.experience_years ? String(teacher.experience_years) : "");
        setPreviousSchoolName(teacher.previous_school_name || "");
        setPreviousSchoolAddress(teacher.previous_school_address || "");
        setPreviousSchoolPhone(teacher.previous_school_phone || "");
        setAddress(teacher.address || "");
        setPermanentAddress(teacher.permanent_address || "");
        setPanNumber(teacher.pan_number || "");
        setNotes(teacher.notes || "");

        // Payroll
        setEpfNo(teacher.epf_no || "");
        setBasicSalary(teacher.basic_salary ? String(teacher.basic_salary) : "");
        setContractType(teacher.contract_type || "Select");
        setWorkShift(teacher.work_shift || "Select");
        setWorkLocation(teacher.work_location || "");
        if (teacher.date_of_leaving) setDateOfLeaving(new Date(teacher.date_of_leaving).toISOString().split("T")[0]);

        // Leaves
        setMedicalLeaves(teacher.medical_leaves ? String(teacher.medical_leaves) : "10");
        setCasualLeaves(teacher.casual_leaves ? String(teacher.casual_leaves) : "12");
        setMaternityLeaves(teacher.maternity_leaves ? String(teacher.maternity_leaves) : "10");
        setSickLeaves(teacher.sick_leaves ? String(teacher.sick_leaves) : "10");

        // Bank
        setAccountName(teacher.account_name || "");
        setAccountNumber(teacher.account_number || "");
        setBankName(teacher.bank_name || "");
        setIfscCode(teacher.ifsc_code || "");
        setBranchName(teacher.branch_name || "");

        // Transport
        setTransportRoute(teacher.transport_route || "Select");
        setTransportVehicle(teacher.transport_vehicle || "Select");
        setTransportPickupPoint(teacher.transport_pickup_point || "Select");

        // Hostel
        setHostelName(teacher.hostel_name || "Select");
        setHostelRoomNo(teacher.hostel_room_no || "Select");

        // Social Links
        setFacebookUrl(teacher.facebook_url || "");
        setInstagramUrl(teacher.instagram_url || "");
        setLinkedinUrl(teacher.linkedin_url || "");
        setYoutubeUrl(teacher.youtube_url || "");
        setTwitterUrl(teacher.twitter_url || "");

        // Files
        setPhotoUrl(teacher.photo_url || "");
        setResumeUrl(teacher.resume_url || "");
        setJoiningLetterUrl(teacher.joining_letter_url || "");
      }
    });
  }, [editId]);

  // Upload handlers
  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    const url = await uploadFile(file);
    setUploadingPhoto(false);
    if (url) setPhotoUrl(url);
  };

  const handleResumeUpload = async (file: File | null) => {
    if (!file) {
      setResumeUrl("");
      return;
    }
    setUploadingResume(true);
    const url = await uploadFile(file);
    setUploadingResume(false);
    if (url) setResumeUrl(url);
  };

  const handleLetterUpload = async (file: File | null) => {
    if (!file) {
      setJoiningLetterUrl("");
      return;
    }
    setUploadingLetter(true);
    const url = await uploadFile(file);
    setUploadingLetter(false);
    if (url) setJoiningLetterUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const fieldsToValidate = [
      { id: "employeeId", value: employeeId, label: "Teacher ID" },
      { id: "firstName", value: firstName, label: "First Name" }
    ];

    const valResult = validateSequential(fieldsToValidate);
    if (!valResult.isValid) {
      setValErrors({ [valResult.fieldId!]: valResult.error! });
      setFormError(valResult.error!);
      return;
    }
    setValErrors({});

    if (newPassword && newPassword !== confirmPassword) {
      setFormError("Passwords do not match!");
      setValErrors({ newPassword: "Passwords do not match!" });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: `${firstName} ${lastName}`.trim() || "New Teacher",
      email: email || undefined,
      subject_specialization: specializations.join(", ") || "General",
      class_id: classId || undefined,
      is_active: status === "Active",
      employee_id: employeeId || undefined,
      gender: gender !== "Select" ? (gender.toLowerCase() as any) : undefined,
      phone: phone || undefined,
      blood_group: bloodGroup !== "Select" ? bloodGroup : undefined,
      join_date: joinDate || undefined,
      father_name: fatherName || undefined,
      mother_name: motherName || undefined,
      dob: dob || undefined,
      marital_status: maritalStatus !== "Select" ? maritalStatus : undefined,
      languages: languages.length > 0 ? languages : undefined,
      qualification: qualification || undefined,
      experience_years: experienceYears ? parseInt(experienceYears) : 0,
      previous_school_name: previousSchoolName || undefined,
      previous_school_address: previousSchoolAddress || undefined,
      previous_school_phone: previousSchoolPhone || undefined,
      address: address || undefined,
      permanent_address: permanentAddress || undefined,
      pan_number: panNumber || undefined,
      notes: notes || undefined,
      epf_no: epfNo || undefined,
      basic_salary: basicSalary ? parseFloat(basicSalary) : 0,
      contract_type: contractType !== "Select" ? contractType : undefined,
      work_shift: workShift !== "Select" ? workShift : undefined,
      work_location: workLocation || undefined,
      date_of_leaving: dateOfLeaving || undefined,
      medical_leaves: medicalLeaves ? parseInt(medicalLeaves) : 10,
      casual_leaves: casualLeaves ? parseInt(casualLeaves) : 12,
      maternity_leaves: maternityLeaves ? parseInt(maternityLeaves) : 10,
      sick_leaves: sickLeaves ? parseInt(sickLeaves) : 10,
      account_name: accountName || undefined,
      account_number: accountNumber || undefined,
      bank_name: bankName || undefined,
      ifsc_code: ifscCode || undefined,
      branch_name: branchName || undefined,
      transport_route: transportRoute !== "Select" ? transportRoute : undefined,
      transport_vehicle: transportVehicle !== "Select" ? transportVehicle : undefined,
      transport_pickup_point: transportPickupPoint !== "Select" ? transportPickupPoint : undefined,
      hostel_name: hostelName !== "Select" ? hostelName : undefined,
      hostel_room_no: hostelRoomNo !== "Select" ? hostelRoomNo : undefined,
      facebook_url: facebookUrl || undefined,
      instagram_url: instagramUrl || undefined,
      linkedin_url: linkedinUrl || undefined,
      youtube_url: youtubeUrl || undefined,
      twitter_url: twitterUrl || undefined,
      photo_url: photoUrl || undefined,
      resume_url: resumeUrl || undefined,
      joining_letter_url: joiningLetterUrl || undefined
    };

    if (editId) {
      const res = await updateTeacher(editId, payload);
      setIsSubmitting(false);
      if (res.success) {
        router.push("/teachers");
      } else {
        alert(res.message || "Failed to update teacher");
      }
    } else {
      const res = await createTeacher(payload);
      setIsSubmitting(false);
      if (res.success) {
        router.push("/teachers");
      } else {
        alert(res.message || "Failed to create teacher");
      }
    }
  };

  const isUploading = uploadingPhoto || uploadingResume || uploadingLetter;

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

        {editId && (
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
                setResetPassTarget({ userId: tUid, name: `${firstName} ${lastName}`.trim(), email: email });
                setIsResetPassModalOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Reset Password</span>
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Validation Error Banner */}
        {formError && (
          <div className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg px-4 py-3 text-left animate-in fade-in">
            <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[13px] text-rose-600 dark:text-rose-400 font-semibold leading-snug">{formError}</p>
          </div>
        )}

        {/* 1. Personal Information */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden card-shadow">
          <div className="bg-slate-50/80 dark:bg-slate-800/40 px-6 py-4 border-b border-border flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Personal Information</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Photo Upload Area */}
              <PhotoUploader
                label="JPEG, JPG, PNG, GIF — Max 5MB"
                preview={photoUrl}
                onChange={handlePhotoUpload}
                onRemove={() => setPhotoUrl("")}
                uploading={uploadingPhoto}
              />

              {/* Form Grid */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-5 text-left">
                <InputGroup label="Teacher ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required error={valErrors.employeeId} id="employeeId" />
                <InputGroup label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required error={valErrors.firstName} id="firstName" />
                <InputGroup label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                
                <InputGroup 
                  label="Class" 
                  type="select" 
                  value={classId} 
                  onChange={(e) => setClassId(e.target.value)} 
                  options={[
                    { label: "Select Class", value: "" }, 
                    ...classes.map(c => ({ label: `${c.name} - ${c.section}`, value: c._id }))
                  ]} 
                />
                
                <SubjectSpecializationInput
                  selectedSubjects={specializations}
                  onChange={setSpecializations}
                  subjectOptions={subjectOptions}
                />

                <InputGroup label="Gender" type="select" value={gender} onChange={(e) => setGender(e.target.value)} options={["Select", "Male", "Female", "Other"]} />
                <InputGroup label="Primary Contact Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <InputGroup label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <InputGroup label="Blood Group" type="select" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} options={["Select", "A+", "A-", "O+", "O-", "B+", "B-", "AB+", "AB-"]} />
                <InputGroup label="Date of Joining" type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />

                <InputGroup label="Father's Name" value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
                <InputGroup label="Date of Birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                <InputGroup label="Marital Status" type="select" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} options={["Select", "Single", "Married", "Divorced", "Widowed"]} />
                
                <div className="col-span-1 xl:col-span-2">
                  <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Language Known</label>
                  <TagInput tags={languages} onChange={setLanguages} placeholder="Type language and press Enter" />
                </div>

                <InputGroup label="Qualification" value={qualification} onChange={(e) => setQualification(e.target.value)} />
                <InputGroup label="Work Experience (Years)" type="number" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
                <InputGroup label="Previous School If Any" value={previousSchoolName} onChange={(e) => setPreviousSchoolName(e.target.value)} />
                <InputGroup label="Previous School Address" value={previousSchoolAddress} onChange={(e) => setPreviousSchoolAddress(e.target.value)} />
                <InputGroup label="Previous School Phone No" value={previousSchoolPhone} onChange={(e) => setPreviousSchoolPhone(e.target.value)} />

                <InputGroup label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
                <InputGroup label="Permanent Address" value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} />
                <InputGroup label="Status" type="select" value={status} onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")} options={["Active", "Inactive"]} />
                
                <div className="col-span-1 md:col-span-2 xl:col-span-4">
                  <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Notes</label>
                  <textarea placeholder="Other information" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full h-24 px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary/50 transition-all"></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Payroll */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden card-shadow">
          <div className="bg-slate-50/80 dark:bg-slate-800/40 px-6 py-4 border-b border-border flex items-center gap-2 text-left">
            <Briefcase className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Payroll</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-left">
            <InputGroup label="EPF No" value={epfNo} onChange={(e) => setEpfNo(e.target.value)} />
            <InputGroup label="Contract Type" type="select" value={contractType} onChange={(e) => setContractType(e.target.value)} options={["Select", "Permanent", "Contract", "Temporary"]} />
            <InputGroup label="Work Shift" type="select" value={workShift} onChange={(e) => setWorkShift(e.target.value)} options={["Select", "Morning", "Evening", "Night"]} />
            <InputGroup label="Work Location" value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} />
            <InputGroup label="Date of Leaving" type="date" value={dateOfLeaving} onChange={(e) => setDateOfLeaving(e.target.value)} />
          </div>
        </div>

        {/* 3. Leaves */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden card-shadow">
          <div className="bg-slate-50/80 dark:bg-slate-800/40 px-6 py-4 border-b border-border flex items-center gap-2 text-left">
            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Leaves Entitlement</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 text-left">
            <InputGroup label="Medical Leaves" type="number" value={medicalLeaves} onChange={(e) => setMedicalLeaves(e.target.value)} />
            <InputGroup label="Casual Leaves" type="number" value={casualLeaves} onChange={(e) => setCasualLeaves(e.target.value)} />
            <InputGroup label="Maternity Leaves" type="number" value={maternityLeaves} onChange={(e) => setMaternityLeaves(e.target.value)} />
            <InputGroup label="Sick Leaves" type="number" value={sickLeaves} onChange={(e) => setSickLeaves(e.target.value)} />
          </div>
        </div>

        {/* 4. Bank Account Detail */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden card-shadow">
          <div className="bg-slate-50/80 dark:bg-slate-800/40 px-6 py-4 border-b border-border flex items-center gap-2 text-left">
            <CreditCard className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Bank Account Detail</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <InputGroup label="Account Name" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            <InputGroup label="Account Number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            <InputGroup label="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            <InputGroup label="IFSC Code" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} />
            <InputGroup label="Branch Name" value={branchName} onChange={(e) => setBranchName(e.target.value)} />
          </div>
        </div>

        {/* 8. Documents */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden card-shadow">
          <div className="bg-slate-50/80 dark:bg-slate-800/40 px-6 py-4 border-b border-border flex items-center gap-2 text-left">
            <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Documents</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <DocUploader label="Upload Resume" docUrl={resumeUrl} onChange={handleResumeUpload} uploading={uploadingResume} />
            <DocUploader label="Upload Joining Letter" docUrl={joiningLetterUrl} onChange={handleLetterUpload} uploading={uploadingLetter} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button type="button" onClick={() => router.push(`/teachers/${editId}`)} className="px-6 py-2.5 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer">
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting || isUploading}
            className="px-6 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {(isSubmitting || isUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
            {isUploading ? "Uploading..." : isSubmitting ? "Saving..." : editId ? "Update Teacher" : "Add Teacher"}
          </button>
        </div>

      </form>

      {/* Reusable Login Details Modal */}
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

// Reusable input component for cleaner code
function InputGroup({
  label, type = "text", placeholder, options, value, onChange, required, error, id,
}: {
  label: string;
  type?: "text" | "email" | "date" | "select" | "password" | "number";
  placeholder?: string;
  options?: (string | { label: string; value: string })[];
  value?: string;
  onChange?: (e: any) => void;
  required?: boolean;
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
        <select
          id={id}
          className={`w-full px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 rounded-lg outline-none transition-all appearance-none cursor-pointer ${borderClass}`}
          value={value}
          onChange={onChange}
        >
          {options?.map(opt =>
            typeof opt === "string"
              ? <option key={opt} value={opt}>{opt}</option>
              : <option key={opt.value} value={opt.value}>{opt.label}</option>
          )}
        </select>
      ) : (
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 rounded-lg outline-none transition-all ${borderClass}`}
        />
      )}
      {error && (
        <p className="text-[11px] text-rose-500 font-bold mt-0.5 animate-in slide-in-from-top-1">
          ❌ {error}
        </p>
      )}
    </div>
  );
}
