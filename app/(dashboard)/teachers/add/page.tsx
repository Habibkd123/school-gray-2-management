"use client";

import React, { useState, useEffect, Suspense, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTeachers } from "../../../hooks/useTeachers";
import type { CreateTeacherInput } from "../../../hooks/useTeachers";
import { useClasses } from "../../../hooks/useClasses";
import { useUpload } from "../../../hooks/useUpload";
import {
  User, Briefcase, Calendar, CreditCard, Bus, Building2, Share2, FileText, Lock,
  XCircle, Upload, X, Loader2, ImageIcon
} from "lucide-react";

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
        className="w-32 h-32 bg-[#F1F5F9] dark:bg-slate-800 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3 overflow-hidden relative cursor-pointer hover:border-[#F59E0B]/60 transition-colors"
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B]" />
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

// ─── Doc Uploader (calls /api/upload) ─────────────────────────────
function DocUploader({
  label, doc, onChange, uploading,
}: {
  label: string;
  doc: DocFile | null;
  onChange: (file: File | null) => void;
  uploading?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">{label}</label>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-3">Upload — JPEG, PNG, or PDF (Max 5MB)</p>
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
          className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[11px] font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? "Uploading…" : "Upload Document"}
        </button>
        {doc ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-slate-600 dark:text-slate-300 font-medium truncate max-w-full sm:w-[180px]">{doc.name}</span>
            <button type="button" onClick={() => onChange(null)}>
              <X className="w-4 h-4 text-rose-400 hover:text-rose-500 cursor-pointer" />
            </button>
          </div>
        ) : (
          <span className="text-[12px] text-slate-400">No file chosen</span>
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
      <button type="button" onClick={add} className="text-[11px] px-2 py-0.5 bg-[#F59E0B] text-white rounded font-semibold hover:bg-[#D97706] transition-colors">Add</button>
    </div>
  );
}

// ─── Input group ───────────────────────────────────────────────────
function InputGroup({
  label, type = "text", placeholder, options, value, onChange, required, datalistOptions,
}: {
  label: string;
  type?: "text" | "email" | "date" | "select" | "password" | "number";
  placeholder?: string;
  options?: (string | { label: string; value: string })[];
  datalistOptions?: string[];
  value?: string;
  onChange?: (e: any) => void;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {type === "select" ? (
        <div className="relative">
          <select
            className="w-full px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B]/50 transition-all appearance-none cursor-pointer"
            value={value}
            onChange={onChange}
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
            type={type}
            list={datalistOptions ? `${label.replace(/\s+/g, '-')}-list` : undefined}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            className="w-full px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B]/50 transition-all"
          />
          {datalistOptions && (
            <datalist id={`${label.replace(/\s+/g, '-')}-list`}>
              {datalistOptions.map(opt => <option key={opt} value={opt} />)}
            </datalist>
          )}
        </>
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
function AddTeacherContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { classes: apiClasses } = useClasses();
  const { createTeacher, updateTeacher, getTeacher } = useTeachers();
  const { uploadFile } = useUpload();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingJoinLetter, setUploadingJoinLetter] = useState(false);

  const classOptions = apiClasses.map(c => ({ label: `${c.name} - ${c.section}`, value: c._id }));

  // ── Personal Info ─────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [classId, setClassId] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [gender, setGender] = useState("Select");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bloodGroup, setBloodGroup] = useState("Select");
  const [joinDate, setJoinDate] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [dob, setDob] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("Select");
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [qualification, setQualification] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [prevSchoolName, setPrevSchoolName] = useState("");
  const [prevSchoolAddress, setPrevSchoolAddress] = useState("");
  const [prevSchoolPhone, setPrevSchoolPhone] = useState("");
  const [address, setAddress] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  // ── Payroll ───────────────────────────────────────────────────
  const [epfNo, setEpfNo] = useState("");
  const [basicSalary, setBasicSalary] = useState("");
  const [contractType, setContractType] = useState("Select");
  const [workShift, setWorkShift] = useState("Select");
  const [workLocation, setWorkLocation] = useState("");
  const [leavingDate, setLeavingDate] = useState("");

  // ── Leaves ────────────────────────────────────────────────────
  const [medicalLeaves, setMedicalLeaves] = useState("");
  const [casualLeaves, setCasualLeaves] = useState("");
  const [maternityLeaves, setMaternityLeaves] = useState("");
  const [sickLeaves, setSickLeaves] = useState("");

  // ── Bank ──────────────────────────────────────────────────────
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");

  // ── Transport ─────────────────────────────────────────────────
  const [route, setRoute] = useState("Select");
  const [vehicleNumber, setVehicleNumber] = useState("Select");
  const [pickupPoint, setPickupPoint] = useState("Select");

  // ── Hostel ────────────────────────────────────────────────────
  const [hostel, setHostel] = useState("Select");
  const [roomNo, setRoomNo] = useState("Select");

  // ── Social ────────────────────────────────────────────────────
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");

  // ── Password ──────────────────────────────────────────────────
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── Documents ─────────────────────────────────────────────────
  const [resumeFile, setResumeFile] = useState<DocFile | null>(null);
  const [joiningLetterFile, setJoiningLetterFile] = useState<DocFile | null>(null);

  // ── Load edit data ────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      if (editId) {
        const teacher = await getTeacher(editId);
        if (teacher) {
          const [first, ...last] = teacher.name.split(" ");
          setFirstName(first || "");
          setLastName(last.join(" ") || "");
          setEmployeeId(teacher.employee_id || "");
          // class_id may be an object after populate or just a string id
          const cid = teacher.class_id && typeof teacher.class_id === "object" ? (teacher.class_id as any)._id : teacher.class_id;
          setClassId(cid ? String(cid) : "");
          setGender(teacher.gender ? (teacher.gender.charAt(0).toUpperCase() + teacher.gender.slice(1)) : "Select");
          setDob(teacher.dob ? new Date(teacher.dob).toISOString().split("T")[0] : "");
          setPhone(teacher.phone || "");
          setEmail(teacher.email || "");
          setAddress(teacher.address || "");
          setPermanentAddress(teacher.permanent_address || "");
          setPhotoUrl(teacher.photo_url || "");
          setBloodGroup(teacher.blood_group || "Select");
          setQualification(teacher.qualification || "");
          setSubject(teacher.subject_specialization || "Physics");
          setExperienceYears(teacher.experience_years != null ? teacher.experience_years.toString() : "0");
          setJoinDate(teacher.join_date ? new Date(teacher.join_date).toISOString().split("T")[0] : "");
          setLanguages(teacher.languages && teacher.languages.length > 0 ? teacher.languages : ["English"]);
          setStatus(teacher.is_active ? "Active" : "Inactive");
          // Family
          setFatherName(teacher.father_name || "");
          setMotherName(teacher.mother_name || "");
          setMaritalStatus(teacher.marital_status || "Select");
          // Previous school
          setPrevSchoolName(teacher.previous_school_name || "");
          setPrevSchoolAddress(teacher.previous_school_address || "");
          setPrevSchoolPhone(teacher.previous_school_phone || "");
          // IDs / notes
          setPanNumber(teacher.pan_number || "");
          setNotes(teacher.notes || "");
          // Payroll
          setEpfNo(teacher.epf_no || "");
          setBasicSalary(teacher.basic_salary != null ? teacher.basic_salary.toString() : "");
          setContractType(teacher.contract_type || "Select");
          setWorkShift(teacher.work_shift || "Select");
          setWorkLocation(teacher.work_location || "");
          setLeavingDate(teacher.date_of_leaving ? new Date(teacher.date_of_leaving).toISOString().split("T")[0] : "");
          // Leaves
          setMedicalLeaves(teacher.medical_leaves != null ? teacher.medical_leaves.toString() : "");
          setCasualLeaves(teacher.casual_leaves != null ? teacher.casual_leaves.toString() : "");
          setMaternityLeaves(teacher.maternity_leaves != null ? teacher.maternity_leaves.toString() : "");
          setSickLeaves(teacher.sick_leaves != null ? teacher.sick_leaves.toString() : "");
          // Bank
          setAccountName(teacher.account_name || "");
          setAccountNumber(teacher.account_number || "");
          setBankName(teacher.bank_name || "");
          setIfscCode(teacher.ifsc_code || "");
          setBranchName(teacher.branch_name || "");
          // Transport
          setRoute(teacher.transport_route || "Select");
          setVehicleNumber(teacher.transport_vehicle || "Select");
          setPickupPoint(teacher.transport_pickup_point || "Select");
          // Hostel
          setHostel(teacher.hostel_name || "Select");
          setRoomNo(teacher.hostel_room_no || "Select");
          // Social
          setFacebookUrl(teacher.facebook_url || "");
          setInstagramUrl(teacher.instagram_url || "");
          setLinkedinUrl(teacher.linkedin_url || "");
          setYoutubeUrl(teacher.youtube_url || "");
          setTwitterUrl(teacher.twitter_url || "");
          // Documents
          if (teacher.resume_url) setResumeFile({ name: "resume", url: teacher.resume_url });
          if (teacher.joining_letter_url) setJoiningLetterFile({ name: "joining_letter", url: teacher.joining_letter_url });
        }
      }
    }
    loadData();
  }, [editId, getTeacher]);

  // ── Auto-generate Teacher ID based on Join Date ───────────────
  useEffect(() => {
    if (joinDate && !editId) {
      const formattedDate = joinDate.replace(/-/g, "");
      setEmployeeId(`T-${formattedDate}`);
    }
  }, [joinDate, editId]);

  // ── Handle photo upload ───────────────────────────────────────
  const handlePhotoUpload = useCallback(async (file: File) => {
    setUploadingPhoto(true);
    const url = await uploadFile(file);
    setUploadingPhoto(false);
    if (url) setPhotoUrl(url);
  }, [uploadFile]);

  // ── Handle document upload ────────────────────────────────────
  const handleResumeUpload = useCallback(async (file: File | null) => {
    if (!file) { setResumeFile(null); return; }
    setUploadingResume(true);
    const url = await uploadFile(file);
    setUploadingResume(false);
    if (url) setResumeFile({ name: file.name, url });
  }, [uploadFile]);

  const handleJoinLetterUpload = useCallback(async (file: File | null) => {
    if (!file) { setJoiningLetterFile(null); return; }
    setUploadingJoinLetter(true);
    const url = await uploadFile(file);
    setUploadingJoinLetter(false);
    if (url) setJoiningLetterFile({ name: file.name, url });
  }, [uploadFile]);

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload: Record<string, any> = {
      // Personal
      name: `${firstName} ${lastName}`.trim() || "New Teacher",
      employee_id: employeeId || undefined,
      class_id: classId || undefined,
      gender: gender !== "Select" ? gender.toLowerCase() : undefined,
      dob: dob || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      permanent_address: permanentAddress || undefined,
      photo_url: photoUrl || undefined,
      blood_group: bloodGroup !== "Select" ? bloodGroup : undefined,
      qualification: qualification || undefined,
      subject_specialization: subject || "Physics",
      experience_years: experienceYears ? parseInt(experienceYears) : 0,
      join_date: joinDate || undefined,
      languages,
      is_active: status === "Active",
      // Family
      father_name: fatherName || undefined,
      mother_name: motherName || undefined,
      marital_status: maritalStatus !== "Select" ? maritalStatus : undefined,
      // Previous school
      previous_school_name: prevSchoolName || undefined,
      previous_school_address: prevSchoolAddress || undefined,
      previous_school_phone: prevSchoolPhone || undefined,
      // IDs / notes
      pan_number: panNumber || undefined,
      notes: notes || undefined,
      // Payroll
      epf_no: epfNo || undefined,
      basic_salary: basicSalary ? parseFloat(basicSalary) : undefined,
      contract_type: contractType !== "Select" ? contractType : undefined,
      work_shift: workShift !== "Select" ? workShift : undefined,
      work_location: workLocation || undefined,
      date_of_leaving: leavingDate || undefined,
      // Leaves
      medical_leaves: medicalLeaves ? parseInt(medicalLeaves) : undefined,
      casual_leaves: casualLeaves ? parseInt(casualLeaves) : undefined,
      maternity_leaves: maternityLeaves ? parseInt(maternityLeaves) : undefined,
      sick_leaves: sickLeaves ? parseInt(sickLeaves) : undefined,
      // Bank
      account_name: accountName || undefined,
      account_number: accountNumber || undefined,
      bank_name: bankName || undefined,
      ifsc_code: ifscCode || undefined,
      branch_name: branchName || undefined,
      // Transport
      transport_route: route !== "Select" ? route : undefined,
      transport_vehicle: vehicleNumber !== "Select" ? vehicleNumber : undefined,
      transport_pickup_point: pickupPoint !== "Select" ? pickupPoint : undefined,
      // Hostel
      hostel_name: hostel !== "Select" ? hostel : undefined,
      hostel_room_no: roomNo !== "Select" ? roomNo : undefined,
      // Social
      facebook_url: facebookUrl || undefined,
      instagram_url: instagramUrl || undefined,
      linkedin_url: linkedinUrl || undefined,
      youtube_url: youtubeUrl || undefined,
      twitter_url: twitterUrl || undefined,
      // Documents
      resume_url: resumeFile?.url || undefined,
      joining_letter_url: joiningLetterFile?.url || undefined,
    };

    if (editId) {
      const res = await updateTeacher(editId, payload as Partial<CreateTeacherInput & { is_active: boolean }>);
      setIsSubmitting(false);
      if (res.success) router.push("/teachers");
      else alert(res.message || "Failed to update teacher");
    } else {
      // Include password only on create
      if (password) payload.password = password;
      const res = await createTeacher(payload as CreateTeacherInput);
      setIsSubmitting(false);
      if (res.success) router.push("/teachers");
      else alert(res.message || "Failed to create teacher");
    }
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{editId ? "Edit Teacher" : "Add Teacher"}</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/teachers" className="hover:text-[#F59E0B]">Teachers</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">{editId ? "Edit Teacher" : "Add Teacher"}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. Personal Information */}
        <SectionCard icon={<User className="w-4 h-4" />} title="Personal Information">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Photo */}
              <PhotoUploader
                label="JPEG, JPG, PNG, GIF — Max 5MB"
                preview={photoUrl}
                onChange={handlePhotoUpload}
                onRemove={() => setPhotoUrl("")}
                uploading={uploadingPhoto}
              />

              {/* Form Grid */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-5 text-left">
                <InputGroup label="Teacher ID" value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
                <InputGroup label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                <InputGroup label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
                <InputGroup label="Class" type="select" value={classId} onChange={e => setClassId(e.target.value)} options={[{ label: "Select", value: "" }, ...classOptions]} />
                <InputGroup label="Subject" type="select" value={subject} onChange={e => setSubject(e.target.value)} options={["Physics", "Chemistry", "Maths", "English", "Spanish", "Biology", "Computer"]} />
                <InputGroup label="Gender" type="select" value={gender} onChange={e => setGender(e.target.value)} options={["Select", "Male", "Female", "Other"]} />
                <InputGroup label="Primary Contact Number" value={phone} onChange={e => setPhone(e.target.value)} />
                <InputGroup label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                <InputGroup label="Blood Group" type="select" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} options={["Select", "A+", "A-", "O+", "O-", "B+", "B-", "AB+", "AB-"]} />
                <InputGroup label="Date of Joining" type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} />
                <InputGroup label="Father's Name" value={fatherName} onChange={e => setFatherName(e.target.value)} />
                <InputGroup label="Mother's Name" value={motherName} onChange={e => setMotherName(e.target.value)} />
                <InputGroup label="Date of Birth" type="date" value={dob} onChange={e => setDob(e.target.value)} />
                <InputGroup label="Marital Status" type="select" value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} options={["Select", "Single", "Married"]} />
                <div className="col-span-1">
                  <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Language Known</label>
                  <TagInput tags={languages} onChange={setLanguages} placeholder="Add language..." />
                </div>
                <InputGroup 
                  label="Qualification" 
                  value={qualification} 
                  onChange={e => setQualification(e.target.value)} 
                  datalistOptions={["B.Ed", "M.Ed", "B.Sc", "M.Sc", "B.A", "M.A", "Ph.D", "B.Tech", "M.Tech", "Diploma"]}
                />
                <InputGroup label="Work Experience (Years)" type="number" value={experienceYears} onChange={e => setExperienceYears(e.target.value)} />
                <InputGroup label="Previous School Name" value={prevSchoolName} onChange={e => setPrevSchoolName(e.target.value)} />
                <InputGroup label="Previous School Address" value={prevSchoolAddress} onChange={e => setPrevSchoolAddress(e.target.value)} />
                <InputGroup label="Previous School Phone" value={prevSchoolPhone} onChange={e => setPrevSchoolPhone(e.target.value)} />
                <InputGroup label="Address" value={address} onChange={e => setAddress(e.target.value)} />
                <InputGroup label="Permanent Address" value={permanentAddress} onChange={e => setPermanentAddress(e.target.value)} />
                <InputGroup label="PAN / ID Number" value={panNumber} onChange={e => setPanNumber(e.target.value)} />
                <InputGroup label="Status" type="select" value={status} onChange={e => setStatus(e.target.value as "Active" | "Inactive")} options={["Active", "Inactive"]} />
                <div className="col-span-1 md:col-span-2 xl:col-span-4">
                  <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Notes</label>
                  <textarea
                    placeholder="Other information"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full h-24 px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B]/50 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 2. Payroll */}
        <SectionCard icon={<Briefcase className="w-4 h-4" />} title="Payroll">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-left">
            <InputGroup label="EPF No" value={epfNo} onChange={e => setEpfNo(e.target.value)} />
            <InputGroup label="Basic Salary" value={basicSalary} onChange={e => setBasicSalary(e.target.value)} />
            <InputGroup label="Contract Type" type="select" value={contractType} onChange={e => setContractType(e.target.value)} options={["Select", "Permanent", "Contract"]} />
            <InputGroup label="Work Shift" type="select" value={workShift} onChange={e => setWorkShift(e.target.value)} options={["Select", "Morning", "Evening"]} />
            <InputGroup label="Work Location" value={workLocation} onChange={e => setWorkLocation(e.target.value)} />
            <InputGroup label="Date of Leaving" type="date" value={leavingDate} onChange={e => setLeavingDate(e.target.value)} />
          </div>
        </SectionCard>

        {/* 3. Leaves */}
        <SectionCard icon={<Calendar className="w-4 h-4" />} title="Leaves">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 text-left">
            <InputGroup label="Medical Leaves" type="number" value={medicalLeaves} onChange={e => setMedicalLeaves(e.target.value)} />
            <InputGroup label="Casual Leaves" type="number" value={casualLeaves} onChange={e => setCasualLeaves(e.target.value)} />
            <InputGroup label="Maternity Leaves" type="number" value={maternityLeaves} onChange={e => setMaternityLeaves(e.target.value)} />
            <InputGroup label="Sick Leaves" type="number" value={sickLeaves} onChange={e => setSickLeaves(e.target.value)} />
          </div>
        </SectionCard>

        {/* 4. Bank Account */}
        <SectionCard icon={<CreditCard className="w-4 h-4" />} title="Bank Account Detail">
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <InputGroup label="Account Name" value={accountName} onChange={e => setAccountName(e.target.value)} />
            <InputGroup label="Account Number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
            <InputGroup label="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} />
            <InputGroup label="IFSC Code" value={ifscCode} onChange={e => setIfscCode(e.target.value)} />
            <InputGroup label="Branch Name" value={branchName} onChange={e => setBranchName(e.target.value)} />
          </div>
        </SectionCard>

        {/* 5. Transport */}
        <SectionCard icon={<Bus className="w-4 h-4" />} title="Transport Information">
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <InputGroup label="Route" type="select" value={route} onChange={e => setRoute(e.target.value)} options={["Select", "Route 1", "Route 2"]} />
            <InputGroup label="Vehicle Number" type="select" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} options={["Select", "Bus 42", "Bus 50"]} />
            <InputGroup label="Pickup Point" type="select" value={pickupPoint} onChange={e => setPickupPoint(e.target.value)} options={["Select", "Point A", "Point B"]} />
          </div>
        </SectionCard>

        {/* 6. Hostel */}
        <SectionCard icon={<Building2 className="w-4 h-4" />} title="Hostel Information">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <InputGroup label="Hostel" type="select" value={hostel} onChange={e => setHostel(e.target.value)} options={["Select", "HI-Hostel", "Boys Hostel"]} />
            <InputGroup label="Room No" type="select" value={roomNo} onChange={e => setRoomNo(e.target.value)} options={["Select", "Room 25", "Room 30"]} />
          </div>
        </SectionCard>

        {/* 7. Social Media */}
        <SectionCard icon={<Share2 className="w-4 h-4" />} title="Social Media Links">
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 text-left">
            <InputGroup label="Facebook" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} />
            <InputGroup label="Instagram" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} />
            <InputGroup label="LinkedIn" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} />
            <InputGroup label="YouTube" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} />
            <InputGroup label="Twitter" value={twitterUrl} onChange={e => setTwitterUrl(e.target.value)} />
          </div>
        </SectionCard>

        {/* 8. Documents */}
        <SectionCard icon={<FileText className="w-4 h-4" />} title="Documents">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <DocUploader
              label="Upload Resume"
              doc={resumeFile}
              onChange={handleResumeUpload}
              uploading={uploadingResume}
            />
            <DocUploader
              label="Upload Joining Letter"
              doc={joiningLetterFile}
              onChange={handleJoinLetterUpload}
              uploading={uploadingJoinLetter}
            />
          </div>
        </SectionCard>

        {/* 9. Password */}
        <SectionCard icon={<Lock className="w-4 h-4" />} title="Password">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <InputGroup label="New Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <InputGroup label="Confirm Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
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
            disabled={isSubmitting || uploadingPhoto || uploadingResume || uploadingJoinLetter}
            className="px-6 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : editId ? "Update Teacher" : "Add Teacher"}
          </button>
        </div>

      </form>
    </div>
  );
}

export default function AddTeacherPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>}>
      <AddTeacherContent />
    </Suspense>
  );
}
