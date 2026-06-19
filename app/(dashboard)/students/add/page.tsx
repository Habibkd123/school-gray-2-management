"use client";

import React, { useState, useEffect, Suspense, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useClasses } from "../../../hooks/useClasses";
import { useStudents } from "../../../hooks/useStudents";
import { useUpload } from "../../../hooks/useUpload";
import {
  Upload, User, FileText, MapPin, Users, Activity, CreditCard, Home,
  Plus, X, XCircle, Loader2, ImageIcon
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────
interface SiblingRow { id: number; name: string; rollNo: string; admNo: string; cls: string; }
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
        className="w-28 h-28 bg-[#F1F5F9] dark:bg-slate-800 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3 overflow-hidden relative cursor-pointer hover:border-[#F59E0B]/60 transition-colors"
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B]" />
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
            className="px-3 py-1 bg-rose-500 text-white text-[11px] font-semibold rounded hover:bg-rose-600 transition-colors"
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
      <p className="text-[11px] text-slate-400 mb-2">Upload — JPEG, PNG, or PDF (Max 5MB)</p>
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
          className="px-4 py-2 bg-[#F59E0B] text-white text-[12px] font-semibold rounded hover:bg-[#D97706] transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? "Uploading…" : "Choose File"}
        </button>
        {doc ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-slate-600 dark:text-slate-300 font-medium truncate max-w-full sm:w-[180px]">{doc.name}</span>
            <button type="button" onClick={() => onChange(null)}>
              <X className="w-4 h-4 text-rose-400 hover:text-rose-500" />
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
function InputGroup({ label, type = "text", placeholder, options, value, onChange, required }: {
  label: string; type?: "text" | "email" | "date" | "select" | "number";
  placeholder?: string; options?: (string | { label: string; value: string })[];
  value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {type === "select" ? (
        <div className="relative">
          <select className="w-full px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B]/50 transition-all appearance-none cursor-pointer" value={value} onChange={onChange as any}>
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
        <input type={type} placeholder={placeholder} value={value} onChange={onChange as any} required={required}
          className="w-full px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B]/50 transition-all" />
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
  const { createStudent, updateStudent, getStudent } = useStudents();
  const { uploadFile } = useUpload();

  const [isSubmitting, setIsSubmitting] = useState(false);
  // Guard against double-submit (React strict mode runs effects twice, and fast clickers)
  const submittingRef = useRef(false);

  // Upload states
  const [uploadingStudentPhoto, setUploadingStudentPhoto] = useState(false);
  const [uploadingFatherPhoto, setUploadingFatherPhoto] = useState(false);
  const [uploadingMotherPhoto, setUploadingMotherPhoto] = useState(false);
  const [uploadingGuardianPhoto, setUploadingGuardianPhoto] = useState(false);
  const [uploadingMedicalCert, setUploadingMedicalCert] = useState(false);
  const [uploadingMigrationCert, setUploadingMigrationCert] = useState(false);
  const [uploadingTransferCert, setUploadingTransferCert] = useState(false);
  const [uploadingBirthCert, setUploadingBirthCert] = useState(false);

  const classOptions = apiClasses.map(c => ({ label: `${c.name} - ${c.section}`, value: c._id }));

  // ── Personal Info ──────────────────────────────────────────────
  const [photoPreview, setPhotoPreview] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [classId, setClassId] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("Select");
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("Select");
  const [admissionNo, setAdmissionNo] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [religion, setReligion] = useState("Select");
  const [category, setCategory] = useState("Select");
  const [house, setHouse] = useState("Select");
  const [motherTongue, setMotherTongue] = useState("Select");
  const [caste, setCaste] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [section, setSection] = useState("Select");
  const [academicYear, setAcademicYear] = useState("June 2024 - 2025");

  // ── Parents ────────────────────────────────────────────────────
  const [fatherPhoto, setFatherPhoto] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherEmail, setFatherEmail] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [fatherOccupation, setFatherOccupation] = useState("");

  const [motherPhoto, setMotherPhoto] = useState("");
  const [motherName, setMotherName] = useState("");
  const [motherEmail, setMotherEmail] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [motherOccupation, setMotherOccupation] = useState("");

  const [guardianPhoto, setGuardianPhoto] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianOccupation, setGuardianOccupation] = useState("");
  const [guardianAddress, setGuardianAddress] = useState("");
  const [guardianType, setGuardianType] = useState("father");

  // ── Siblings ───────────────────────────────────────────────────
  const [hasSibling, setHasSibling] = useState(false);
  const [siblings, setSiblings] = useState<SiblingRow[]>([]);

  const addSibling = () => {
    setSiblings(prev => [...prev, { id: Date.now(), name: "", rollNo: "", admNo: "", cls: "" }]);
  };
  const removeSibling = (id: number) => setSiblings(prev => prev.filter(s => s.id !== id));
  const updateSibling = (id: number, field: keyof SiblingRow, val: string) =>
    setSiblings(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));

  const handleSetHasSibling = (val: boolean) => {
    setHasSibling(val);
    if (val && siblings.length === 0) {
      setSiblings([{ id: Date.now(), name: "", rollNo: "", admNo: "", cls: "" }]);
    }
  };

  // ── Address ────────────────────────────────────────────────────
  const [currentAddress, setCurrentAddress] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");

  // ── Documents ──────────────────────────────────────────────────
  const [medicalCert, setMedicalCert] = useState<DocFile | null>(null);
  const [migrationCert, setMigrationCert] = useState<DocFile | null>(null);
  const [transferCert, setTransferCert] = useState<DocFile | null>(null);
  const [birthCert, setBirthCert] = useState<DocFile | null>(null);

  // ── Medical ────────────────────────────────────────────────────
  const [hasMedical, setHasMedical] = useState(false);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [medicalNotes, setMedicalNotes] = useState("");

  // ── Previous School ────────────────────────────────────────────
  const [prevSchoolName, setPrevSchoolName] = useState("");
  const [prevSchoolAddress, setPrevSchoolAddress] = useState("");

  // ── Other ──────────────────────────────────────────────────────
  const [bankName, setBankName] = useState("");
  const [branch, setBranch] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [otherInfo, setOtherInfo] = useState("");

  // ── Load edit data ─────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      if (editId) {
        const student = await getStudent(editId);
        if (student) {
          const [first, ...last] = student.name.split(" ");
          setFirstName(first || "");
          setLastName(last.join(" ") || "");
          setClassId(typeof student.class_id === "object" ? student.class_id._id : student.class_id || "");
          setRollNo(student.roll_no || "");
          setEmail(student.email || "");
          if (student.photo_url) setPhotoPreview(student.photo_url);
          if (student.gender) setGender(student.gender.charAt(0).toUpperCase() + student.gender.slice(1));
          if (student.dob) setDob(new Date(student.dob).toISOString().split("T")[0]);
          if (student.blood_group) setBloodGroup(student.blood_group);
          if (student.admission_no) setAdmissionNo(student.admission_no);
          if (student.admission_date) setAdmissionDate(new Date(student.admission_date).toISOString().split("T")[0]);
          if (student.academic_year) setAcademicYear(student.academic_year);
          if (student.religion) setReligion(student.religion);
          if (student.category) setCategory(student.category);
          if (student.caste) setCaste(student.caste);
          if (student.mother_tongue) setMotherTongue(student.mother_tongue);
          if (student.languages) setLanguages(student.languages);
          if (student.house) setHouse(student.house);
          if (student.phone) setPrimaryPhone(student.phone);
          if (student.address) {
            setCurrentAddress(student.address);
          }
          if (student.permanent_address) {
            setPermanentAddress(student.permanent_address);
          } else if (student.address) {
            setPermanentAddress(student.address);
          }
          if (student.other_info) {
            setOtherInfo(student.other_info);
          }
          if (student.prev_school_name) setPrevSchoolName(student.prev_school_name);
          if (student.prev_school_address) setPrevSchoolAddress(student.prev_school_address);
          if (student.bank_name) setBankName(student.bank_name);
          if (student.bank_branch) setBranch(student.bank_branch);
          if (student.bank_ifsc) setIfsc(student.bank_ifsc);
          if (student.allergies) {
            setAllergies(student.allergies);
            if (student.allergies.length > 0) setHasMedical(true);
          }
          if (student.medications) {
            setMedications(student.medications);
            if (student.medications.length > 0) setHasMedical(true);
          }
          if (student.medical_notes) {
            setMedicalNotes(student.medical_notes);
            setHasMedical(true);
          }
          if (student.medical_cert) setMedicalCert(student.medical_cert);
          if (student.migration_cert) setMigrationCert(student.migration_cert);
          if (student.transfer_cert) setTransferCert(student.transfer_cert);
          if (student.birth_cert) setBirthCert(student.birth_cert);

          // Parent / guardian details
          if (student.parent_id && typeof student.parent_id === "object") {
            const p = student.parent_id;
            setFatherName(student.father_name || p.name || "");
            setFatherPhone(student.father_phone || p.phone || "");
            setFatherEmail(student.father_email || p.email || "");
            setFatherOccupation(student.father_occupation || p.occupation || "");
            setFatherPhoto(student.father_photo || p.photo_url || "");

            setMotherName(student.mother_name || "");
            setMotherPhone(student.mother_phone || "");
            setMotherEmail(student.mother_email || "");
            setMotherOccupation(student.mother_occupation || "");
            setMotherPhoto(student.mother_photo || "");

            setGuardianName(student.guardian_name || p.name || "");
            setGuardianPhone(student.guardian_phone || p.phone || "");
            setGuardianEmail(student.guardian_email || p.email || "");
            setGuardianRelation(student.guardian_relation || p.relation || "");
            setGuardianPhoto(student.guardian_photo || p.photo_url || "");
            setGuardianOccupation(student.guardian_occupation || p.occupation || "");
            setGuardianAddress(student.guardian_address || p.address || "");
            setGuardianType(student.guardian_type || (p.relation?.toLowerCase() === "father" ? "father" : p.relation?.toLowerCase() === "mother" ? "mother" : "other"));
          } else {
            setFatherName(student.father_name || student.guardian_name || "");
            setFatherPhone(student.father_phone || student.guardian_phone || "");
            setFatherEmail(student.father_email || student.guardian_email || "");
            setFatherOccupation(student.father_occupation || "");
            setFatherPhoto(student.father_photo || "");

            setMotherName(student.mother_name || "");
            setMotherPhone(student.mother_phone || "");
            setMotherEmail(student.mother_email || "");
            setMotherOccupation(student.mother_occupation || "");
            setMotherPhoto(student.mother_photo || "");

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
      setGuardianPhone(fatherPhone);
      setGuardianEmail(fatherEmail);
      setGuardianRelation("Father");
      setGuardianPhoto(fatherPhoto);
      setGuardianOccupation(fatherOccupation);
    } else if (guardianType === "mother") {
      setGuardianName(motherName);
      setGuardianPhone(motherPhone);
      setGuardianEmail(motherEmail);
      setGuardianRelation("Mother");
      setGuardianPhoto(motherPhoto);
      setGuardianOccupation(motherOccupation);
    }
  }, [guardianType, fatherName, fatherPhone, fatherEmail, fatherPhoto, fatherOccupation, motherName, motherPhone, motherEmail, motherPhoto, motherOccupation]);

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

  const makePhotoHandler = useCallback((
    setUploading: (v: boolean) => void,
    setUrl: (v: string) => void
  ) => async (file: File) => {
    setUploading(true);
    const url = await uploadFile(file);
    setUploading(false);
    if (url) setUrl(url);
  }, [uploadFile]);

  const makeDocHandler = useCallback((
    setUploading: (v: boolean) => void,
    setDoc: (d: DocFile | null) => void
  ) => async (file: File | null) => {
    if (!file) { setDoc(null); return; }
    setUploading(true);
    const url = await uploadFile(file);
    setUploading(false);
    if (url) setDoc({ name: file.name, url });
  }, [uploadFile]);

  const handleFatherPhoto = useCallback(makePhotoHandler(setUploadingFatherPhoto, setFatherPhoto), [makePhotoHandler]);
  const handleMotherPhoto = useCallback(makePhotoHandler(setUploadingMotherPhoto, setMotherPhoto), [makePhotoHandler]);
  const handleGuardianPhoto = useCallback(makePhotoHandler(setUploadingGuardianPhoto, setGuardianPhoto), [makePhotoHandler]);
  const handleMedicalCert = useCallback(makeDocHandler(setUploadingMedicalCert, setMedicalCert), [makeDocHandler]);
  const handleMigrationCert = useCallback(makeDocHandler(setUploadingMigrationCert, setMigrationCert), [makeDocHandler]);
  const handleTransferCert = useCallback(makeDocHandler(setUploadingTransferCert, setTransferCert), [makeDocHandler]);
  const handleBirthCert = useCallback(makeDocHandler(setUploadingBirthCert, setBirthCert), [makeDocHandler]);

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent double-submit from fast clicks or React Strict Mode
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const payload = {
        name: `${firstName} ${lastName}`.trim() || "New Student",
        email: email || undefined,
        guardian_email: guardianEmail || fatherEmail || undefined,
        class_id: classId || classOptions[0]?.value || "",
        roll_no: rollNo || undefined,
        guardian_name: guardianName || fatherName || undefined,
        guardian_phone: guardianPhone || fatherPhone || undefined,
        guardian_relation: guardianRelation !== "Select" ? guardianRelation : undefined,
        photo_url: photoPreview || undefined,
        gender: gender !== "Select" ? gender.toLowerCase() : undefined,
        dob: dob || undefined,
        blood_group: bloodGroup !== "Select" ? bloodGroup : undefined,
        admission_no: admissionNo || undefined,
        admission_date: admissionDate || undefined,
        address: currentAddress || undefined,
        phone: primaryPhone || undefined,
        guardian_photo: guardianPhoto || fatherPhoto || motherPhoto || undefined,
        religion: religion !== "Select" ? religion : undefined,
        category: category !== "Select" ? category : undefined,
        caste: caste || undefined,
        mother_tongue: motherTongue !== "Select" ? motherTongue : undefined,
        languages: languages,
        house: house !== "Select" ? house : undefined,
        prev_school_name: prevSchoolName || undefined,
        prev_school_address: prevSchoolAddress || undefined,
        bank_name: bankName || undefined,
        bank_branch: branch || undefined,
        bank_ifsc: ifsc || undefined,
        allergies: allergies,
        medications: medications,
        medical_notes: medicalNotes || undefined,
        medical_cert: medicalCert,
        migration_cert: migrationCert,
        transfer_cert: transferCert,
        birth_cert: birthCert,
        father_name: fatherName || undefined,
        father_phone: fatherPhone || undefined,
        father_email: fatherEmail || undefined,
        father_occupation: fatherOccupation || undefined,
        father_photo: fatherPhoto || undefined,
        mother_name: motherName || undefined,
        mother_phone: motherPhone || undefined,
        mother_email: motherEmail || undefined,
        mother_occupation: motherOccupation || undefined,
        mother_photo: motherPhoto || undefined,
        guardian_type: guardianType || undefined,
        guardian_occupation: guardianOccupation || undefined,
        guardian_address: guardianAddress || undefined,
        permanent_address: permanentAddress || undefined,
        other_info: otherInfo || undefined,
      };

      let result;
      if (editId) {
        result = await updateStudent(editId, payload as any);
      } else {
        result = await createStudent(payload as any);
      }

      // Only navigate away on success
      if (result?.success !== false) {
        router.push("/students");
      } else {
        alert(result.message || "Failed to save student");
      }
    } finally {
      // Always reset flags so the user can try again on error
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const anyUploading = uploadingStudentPhoto || uploadingFatherPhoto || uploadingMotherPhoto ||
    uploadingGuardianPhoto || uploadingMedicalCert || uploadingMigrationCert ||
    uploadingTransferCert || uploadingBirthCert;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{editId ? "Edit Student" : "Add Student"}</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <Link href="/students" className="hover:text-[#F59E0B]">Students</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">{editId ? "Edit Student" : "Add Student"}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

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
                <InputGroup label="Academic Year" type="select" value={academicYear} onChange={e => setAcademicYear(e.target.value)} options={["June 2023 - 2024", "June 2024 - 2025", "June 2025 - 2026"]} />
                <InputGroup label="Admission Number" placeholder="Auto-generated" value={admissionNo} onChange={e => setAdmissionNo(e.target.value)} />
                <InputGroup label="Admission Date" type="date" value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} />
                <InputGroup label="Roll Number" value={rollNo} onChange={e => setRollNo(e.target.value)} />

                <InputGroup label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                <InputGroup label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
                <InputGroup label="Class" type="select" value={classId} onChange={e => setClassId(e.target.value)} options={[{ label: "Select", value: "" }, ...classOptions]} />
                <InputGroup label="Section" type="select" value={section} onChange={e => setSection(e.target.value)} options={["Select", "A", "B", "C", "D"]} />

                <InputGroup label="Gender" type="select" value={gender} onChange={e => setGender(e.target.value)} options={["Select", "Male", "Female"]} />
                <InputGroup label="Date of Birth" type="date" value={dob} onChange={e => setDob(e.target.value)} />
                <InputGroup label="Blood Group" type="select" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} options={["Select", "A+", "A-", "O+", "O-", "B+", "B-", "AB+", "AB-"]} />
                <InputGroup label="House" type="select" value={house} onChange={e => setHouse(e.target.value)} options={["Select", "Red", "Blue", "Green", "Yellow"]} />

                <InputGroup label="Religion" type="select" value={religion} onChange={e => setReligion(e.target.value)} options={["Select", "Christian", "Muslim", "Hindu", "Other"]} />
                <InputGroup label="Category" type="select" value={category} onChange={e => setCategory(e.target.value)} options={["Select", "General", "OBC", "SC/ST"]} />
                <InputGroup label="Primary Contact Number" value={primaryPhone} onChange={e => setPrimaryPhone(e.target.value)} />
                <InputGroup label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} />

                <InputGroup label="Caste" value={caste} onChange={e => setCaste(e.target.value)} />
                <InputGroup label="Mother Tongue" type="select" value={motherTongue} onChange={e => setMotherTongue(e.target.value)} options={["Select", "English", "Hindi", "Urdu", "French", "Arabic"]} />
                <div className="col-span-1 xl:col-span-2">
                  <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Language Known</label>
                  <TagInput tags={languages} onChange={setLanguages} placeholder="Type a language and press Enter" />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── 2. Parents & Guardian ── */}
        <SectionCard icon={<Users className="w-4 h-4" />} title="Parents & Guardian Information">
          <div className="p-6 space-y-8">
            {/* Father */}
            <div>
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-border pb-2 text-left">Father Info</h3>
              <div className="flex flex-col lg:flex-row gap-8">
                <PhotoUploader
                  label="Father Photo"
                  preview={fatherPhoto}
                  onChange={handleFatherPhoto}
                  onRemove={() => setFatherPhoto("")}
                  uploading={uploadingFatherPhoto}
                />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 text-left">
                  <InputGroup label="Father Name" value={fatherName} onChange={e => setFatherName(e.target.value)} />
                  <InputGroup label="Email" type="email" value={fatherEmail} onChange={e => setFatherEmail(e.target.value)} />
                  <InputGroup label="Phone Number" value={fatherPhone} onChange={e => setFatherPhone(e.target.value)} />
                  <InputGroup label="Father Occupation" value={fatherOccupation} onChange={e => setFatherOccupation(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Mother */}
            <div>
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-border pb-2 text-left">Mother Info</h3>
              <div className="flex flex-col lg:flex-row gap-8">
                <PhotoUploader
                  label="Mother Photo"
                  preview={motherPhoto}
                  onChange={handleMotherPhoto}
                  onRemove={() => setMotherPhoto("")}
                  uploading={uploadingMotherPhoto}
                />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 text-left">
                  <InputGroup label="Mother Name" value={motherName} onChange={e => setMotherName(e.target.value)} />
                  <InputGroup label="Email" type="email" value={motherEmail} onChange={e => setMotherEmail(e.target.value)} />
                  <InputGroup label="Phone Number" value={motherPhone} onChange={e => setMotherPhone(e.target.value)} />
                  <InputGroup label="Mother Occupation" value={motherOccupation} onChange={e => setMotherOccupation(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Guardian */}
            <div>
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-border pb-2 text-left">Guardian Details</h3>
              <div className="flex items-center gap-6 mb-5 text-left text-[13px] text-slate-700 dark:text-slate-200">
                <label className="font-semibold">Is Guardian?</label>
                {["father", "mother", "other"].map(g => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="guardian" className="accent-[#F59E0B]" checked={guardianType === g} onChange={() => setGuardianType(g)} />
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
                  <InputGroup label="Guardian Name" value={guardianName} onChange={e => setGuardianName(e.target.value)} />
                  <InputGroup label="Guardian Relation" value={guardianRelation} onChange={e => setGuardianRelation(e.target.value)} />
                  <InputGroup label="Phone Number" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} />
                  <InputGroup label="Email" type="email" value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} />
                  <InputGroup label="Occupation" value={guardianOccupation} onChange={e => setGuardianOccupation(e.target.value)} />
                  <div className="col-span-1 md:col-span-2 xl:col-span-3">
                    <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Address</label>
                    <textarea value={guardianAddress} onChange={e => setGuardianAddress(e.target.value)} className="w-full h-10 px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B]/50 transition-all resize-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── 3. Siblings ── */}
        <SectionCard icon={<Users className="w-4 h-4" />} title="Siblings">
          <div className="p-6 text-left">
            <div className="flex items-center gap-4 mb-5 text-[13px] text-slate-700 dark:text-slate-200">
              <label className="font-semibold">Sibling studying in same school?</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="sibling" className="accent-[#F59E0B]" checked={hasSibling} onChange={() => handleSetHasSibling(true)} /> Yes
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="sibling" className="accent-[#F59E0B]" checked={!hasSibling} onChange={() => handleSetHasSibling(false)} /> No
              </label>
            </div>

            {hasSibling && (
              <div className="space-y-4">
                {siblings.map((s, idx) => (
                  <div key={s.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-border relative">
                    <p className="absolute -top-2.5 left-3 text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-1">Sibling {idx + 1}</p>
                    <InputGroup label="Name" value={s.name} onChange={e => updateSibling(s.id, "name", e.target.value)} placeholder="Student name" />
                    <InputGroup label="Roll No" value={s.rollNo} onChange={e => updateSibling(s.id, "rollNo", e.target.value)} placeholder="Roll number" />
                    <InputGroup label="Admission No" value={s.admNo} onChange={e => updateSibling(s.id, "admNo", e.target.value)} placeholder="Admission number" />
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <InputGroup label="Class" value={s.cls} onChange={e => updateSibling(s.id, "cls", e.target.value)} placeholder="e.g. Grade 5" />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSibling(s.id)}
                        className="mb-0.5 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSibling}
                  className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white text-[13px] font-semibold rounded-lg hover:bg-[#D97706] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add More Sibling
                </button>
              </div>
            )}

            {!hasSibling && (
              <p className="text-[13px] text-slate-400 dark:text-slate-500 italic">No siblings enrolled in this school.</p>
            )}
          </div>
        </SectionCard>

        {/* ── 4. Address ── */}
        <SectionCard icon={<MapPin className="w-4 h-4" />} title="Address">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Current Address</label>
              <textarea value={currentAddress} onChange={e => setCurrentAddress(e.target.value)} className="w-full h-20 px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B]/50 transition-all resize-none" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Permanent Address</label>
              <textarea value={permanentAddress} onChange={e => setPermanentAddress(e.target.value)} className="w-full h-20 px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B]/50 transition-all resize-none" />
            </div>
          </div>
        </SectionCard>

        {/* ── 5. Documents ── */}
        <SectionCard icon={<FileText className="w-4 h-4" />} title="Documents">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <DocUploader label="Medical Certificate" doc={medicalCert} onChange={handleMedicalCert} uploading={uploadingMedicalCert} />
            <DocUploader label="Migration Certificate" doc={migrationCert} onChange={handleMigrationCert} uploading={uploadingMigrationCert} />
            <DocUploader label="Transfer Certificate" doc={transferCert} onChange={handleTransferCert} uploading={uploadingTransferCert} />
            <DocUploader label="Birth Certificate" doc={birthCert} onChange={handleBirthCert} uploading={uploadingBirthCert} />
          </div>
        </SectionCard>

        {/* ── 6. Medical History ── */}
        <SectionCard icon={<Activity className="w-4 h-4" />} title="Medical History">
          <div className="p-6 space-y-5 text-left">
            <div className="flex items-center gap-4 text-[13px] text-slate-700 dark:text-slate-200">
              <label className="font-semibold">Medical Conditions?</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="medical" className="accent-[#F59E0B]" checked={hasMedical} onChange={() => setHasMedical(true)} /> Yes
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="medical" className="accent-[#F59E0B]" checked={!hasMedical} onChange={() => setHasMedical(false)} /> No
              </label>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Allergies <span className="text-slate-400 font-normal">(type and press Enter)</span>
              </label>
              <TagInput tags={allergies} onChange={setAllergies} placeholder="e.g. Peanuts, Dust..." />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Medications <span className="text-slate-400 font-normal">(type and press Enter)</span>
              </label>
              <TagInput tags={medications} onChange={setMedications} placeholder="e.g. Paracetamol..." />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Additional Notes</label>
              <textarea
                value={medicalNotes}
                onChange={e => setMedicalNotes(e.target.value)}
                rows={3}
                placeholder="Any other medical notes..."
                className="w-full px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B]/50 transition-all resize-none"
              />
            </div>
          </div>
        </SectionCard>

        {/* ── 7. Previous School ── */}
        <SectionCard icon={<Home className="w-4 h-4" />} title="Previous School Details">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <InputGroup label="School Name" value={prevSchoolName} onChange={e => setPrevSchoolName(e.target.value)} />
            <InputGroup label="Address" value={prevSchoolAddress} onChange={e => setPrevSchoolAddress(e.target.value)} />
          </div>
        </SectionCard>

        {/* ── 8. Other Details ── */}
        <SectionCard icon={<CreditCard className="w-4 h-4" />} title="Other Details">
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <InputGroup label="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} />
            <InputGroup label="Branch" value={branch} onChange={e => setBranch(e.target.value)} />
            <InputGroup label="IFSC Number" value={ifsc} onChange={e => setIfsc(e.target.value)} />
            <div className="col-span-1 md:col-span-3">
              <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Other Information</label>
              <textarea value={otherInfo} onChange={e => setOtherInfo(e.target.value)} rows={3}
                className="w-full px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B]/50 transition-all resize-none" />
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
            className="px-6 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {(isSubmitting || anyUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
            {anyUploading ? "Uploading…" : isSubmitting ? "Saving…" : editId ? "Update Student" : "Add Student"}
          </button>
        </div>

      </form>
    </div>
  );
}

export default function AddStudentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>}>
      <AddStudentContent />
    </Suspense>
  );
}
