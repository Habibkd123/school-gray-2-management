"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileUploadField } from "@/app/components/ui/FileUploadField";
import {
  ArrowLeft, ArrowRight, Save, ClipboardList, Loader2, AlertCircle, CheckCircle,
  GraduationCap, User, FileText, CheckCircle2, ChevronRight
} from "lucide-react";

interface ClassOption {
  _id: string;
  name: string;
  section?: string;
  stream?: string;
}

export default function PublicApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Stepper state
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState<{ application_no: string; _id: string } | null>(null);

  // Form states
  // Step 1: Student
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [admissionFor, setAdmissionFor] = useState("New Admission");
  const [classId, setClassId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [prevSchool, setPrevSchool] = useState("");
  const [prevClass, setPrevClass] = useState("");

  // Step 2: Parent/Guardian
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("");
  const [guardianOccupation, setGuardianOccupation] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");
  const [pinCode, setPinCode] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [remarks, setRemarks] = useState("");

  // Step 3: Documents
  const [photoUrl, setPhotoUrl] = useState("");
  const [birthCertUrl, setBirthCertUrl] = useState("");
  const [transferCertUrl, setTransferCertUrl] = useState("");
  const [reportCardUrl, setReportCardUrl] = useState("");
  const [aadhaarUrl, setAadhaarUrl] = useState("");
  const [otherDocsUrl, setOtherDocsUrl] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Load active classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch("/api/public/classes");
        const json = await res.json();
        if (json.success) {
          setClasses(json.data);
        }
      } catch (err) {
        console.error("Failed to load classes", err);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  const handleNext = () => {
    // Basic validation
    if (step === 1) {
      if (!classId) { setErrorMessage("Please select the class you are applying for."); return; }
      if (!studentName.trim()) { setErrorMessage("Student Name is required."); return; }
      if (!gender) { setErrorMessage("Gender is required."); return; }
      if (!dob) { setErrorMessage("Date of Birth is required."); return; }
      setErrorMessage("");
      setStep(2);
    } else if (step === 2) {
      if (!phone.trim()) { setErrorMessage("Guardian mobile number is required."); return; }
      if (!address.trim()) { setErrorMessage("Address is required."); return; }
      setErrorMessage("");
      setStep(3);
    }
  };

  const handlePrev = () => {
    setErrorMessage("");
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!acceptTerms) {
      setErrorMessage("You must accept the terms and conditions to proceed.");
      return;
    }

    setStatus("loading");
    try {
      const payload = {
        academic_year: academicYear,
        admission_for: admissionFor,
        class_id: classId,
        student_name: studentName.trim(),
        gender,
        dob,
        blood_group: bloodGroup.trim(),
        prev_school: prevSchool.trim(),
        prev_class: prevClass.trim(),
        father_name: fatherName.trim(),
        mother_name: motherName.trim(),
        guardian_name: guardianName.trim() || undefined,
        guardian_relation: guardianRelation.trim() || undefined,
        guardian_occupation: guardianOccupation.trim() || undefined,
        phone: phone.trim(),
        alt_phone: altPhone.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        pin_code: pinCode.trim(),
        emergency_contact: emergencyContact.trim(),
        remarks: remarks.trim(),
        photo: photoUrl ? { name: "student_photo", url: photoUrl } : undefined,
        birth_certificate: birthCertUrl ? { name: "birth_certificate", url: birthCertUrl } : undefined,
        transfer_certificate: transferCertUrl ? { name: "transfer_certificate", url: transferCertUrl } : undefined,
        report_card: reportCardUrl ? { name: "report_card", url: reportCardUrl } : undefined,
        aadhaar: aadhaarUrl ? { name: "aadhaar_card", url: aadhaarUrl } : undefined,
        other_documents: otherDocsUrl ? { name: "other_documents", url: otherDocsUrl } : undefined,
      };

      const res = await fetch("/api/public/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setStatus("success");
        setSuccessData(json.data);
      } else {
        setStatus("error");
        setErrorMessage(json.message || "Failed to submit application");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  };

  const labelClass = "block text-[12px] font-bold text-slate-300 uppercase tracking-wide mb-1.5";
  const fieldClass = "w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors text-[13.5px]";

  if (status === "success" && successData) {
    return (
      <main className="py-24 px-4 md:px-8 max-w-2xl mx-auto min-h-[70vh] flex items-center justify-center">
        <div className="bg-[var(--sidebar-bg)] border border-slate-800 rounded-2xl p-10 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <h1 className="page-title font-serif">Application Submitted!</h1>
          <p className="text-slate-400 text-[14px] leading-relaxed max-w-md mx-auto">
            Your online admission application has been registered successfully. Please save your application reference number for future communication.
          </p>

          <div className="p-5 bg-white/5 border border-white/10 rounded-xl max-w-sm mx-auto">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Application Reference No</span>
            <span className="section-title font-sans text-primary block mt-1.5 tracking-wider">
              {successData.application_no}
            </span>
          </div>

          <p className="text-[12px] text-slate-500">
            A confirmation has been logged. Our admissions desk will review the documentation and contact you shortly regarding the next steps.
          </p>

          <button
            onClick={() => router.push("/admissions")}
            className="px-8 py-3.5 bg-primary hover:bg-[var(--primary-hover)] text-white font-bold rounded-lg transition-all text-xs tracking-wider uppercase"
          >
            Back to Admissions
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="py-20 px-4 md:px-8 max-w-4xl mx-auto min-h-[80vh]">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="page-title font-serif">Apply for Admission</h1>
          <p className="text-primary font-bold uppercase tracking-widest text-[11px] mt-1">
            Academic Session 2026-2027
          </p>
        </div>
      </div>

      {/* Stepper Header */}
      <div className="grid grid-cols-3 gap-3 mb-10 text-[12px] font-bold uppercase tracking-wider mt-6">
        <div className={`pb-3 border-b-2 text-center transition-all ${step >= 1 ? "border-primary text-primary" : "border-slate-800 text-slate-500"}`}>
          1. Student Details
        </div>
        <div className={`pb-3 border-b-2 text-center transition-all ${step >= 2 ? "border-primary text-primary" : "border-slate-800 text-slate-500"}`}>
          2. Parent/Guardian
        </div>
        <div className={`pb-3 border-b-2 text-center transition-all ${step >= 3 ? "border-primary text-primary" : "border-slate-800 text-slate-500"}`}>
          3. Upload Documents
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-left">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-rose-400 text-[13px] font-semibold">{errorMessage}</p>
        </div>
      )}

      <div className="bg-[var(--sidebar-bg)] p-8 md:p-10 border border-slate-800 rounded-2xl shadow-2xl text-left">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: Student details */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <h2 className="text-lg font-bold text-white border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" /> Student Information
              </h2>

              <div className="grid sm:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>Academic Year *</label>
                  <select value={academicYear} onChange={e => setAcademicYear(e.target.value)} className={`${fieldClass} appearance-none cursor-pointer`}>
                    <option className="bg-[var(--sidebar-bg)]">2026-2027</option>
                    <option className="bg-[var(--sidebar-bg)]">2027-2028</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Admission For *</label>
                  <select value={admissionFor} onChange={e => setAdmissionFor(e.target.value)} className={`${fieldClass} appearance-none cursor-pointer`}>
                    <option className="bg-[var(--sidebar-bg)]">New Admission</option>
                    <option className="bg-[var(--sidebar-bg)]">Transfer Admission</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Class Applying *</label>
                  <select
                    value={classId}
                    onChange={e => setClassId(e.target.value)}
                    className={`${fieldClass} appearance-none cursor-pointer`}
                    disabled={loadingClasses}
                  >
                    <option className="bg-[var(--sidebar-bg)]" value="">
                      {loadingClasses ? "Loading Classes..." : "Select Class"}
                    </option>
                    {classes.map(c => (
                      <option key={c._id} className="bg-[var(--sidebar-bg)]" value={c._id}>
                        {c.name}{c.section ? ` - ${c.section}` : ""}{c.stream ? ` (${c.stream})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Student Name *</label>
                <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="e.g. Jane Doe" className={fieldClass} />
              </div>

              <div className="grid sm:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>Gender *</label>
                  <select value={gender} onChange={e => setGender(e.target.value as any)} className={`${fieldClass} appearance-none cursor-pointer`}>
                    <option className="bg-[var(--sidebar-bg)]" value="">Select Gender</option>
                    <option className="bg-[var(--sidebar-bg)]" value="male">Male</option>
                    <option className="bg-[var(--sidebar-bg)]" value="female">Female</option>
                    <option className="bg-[var(--sidebar-bg)]" value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Date of Birth *</label>
                  <input type="date" value={dob} onChange={e => setDob(e.target.value)} className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Blood Group</label>
                  <input type="text" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} placeholder="e.g. O+ve" className={fieldClass} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>Previous School Name</label>
                  <input type="text" value={prevSchool} onChange={e => setPrevSchool(e.target.value)} placeholder="e.g. St. Mary School" className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Previous Class Attended</label>
                  <input type="text" value={prevClass} onChange={e => setPrevClass(e.target.value)} placeholder="e.g. Class IX" className={fieldClass} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Parents information */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <h2 className="text-lg font-bold text-white border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Parents & Guardian Information
              </h2>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>Father&apos;s Full Name</label>
                  <input type="text" value={fatherName} onChange={e => setFatherName(e.target.value)} placeholder="e.g. Arthur Doe" className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Mother&apos;s Full Name</label>
                  <input type="text" value={motherName} onChange={e => setMotherName(e.target.value)} placeholder="e.g. Maria Doe" className={fieldClass} />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>Guardian Name (if not Father/Mother)</label>
                  <input type="text" value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="e.g. Robert Smith" className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Relation with Guardian</label>
                  <input type="text" value={guardianRelation} onChange={e => setGuardianRelation(e.target.value)} placeholder="e.g. Uncle" className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Guardian Occupation</label>
                  <input type="text" value={guardianOccupation} onChange={e => setGuardianOccupation(e.target.value)} placeholder="e.g. Engineer" className={fieldClass} />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>Mobile Number *</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +91 98765 43210" className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Alternate Contact No</label>
                  <input type="tel" value={altPhone} onChange={e => setAltPhone(e.target.value)} placeholder="e.g. +91 98765 43211" className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. parent@example.com" className={fieldClass} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Residential Address *</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} placeholder="Street, Flat No, Locality..." className={`${fieldClass} resize-none`} />
              </div>

              <div className="grid sm:grid-cols-4 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>City</label>
                  <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. New Delhi" className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>State</label>
                  <input type="text" value={state} onChange={e => setState(e.target.value)} placeholder="e.g. Delhi" className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Country</label>
                  <input type="text" value={country} onChange={e => setCountry(e.target.value)} className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>PIN Code</label>
                  <input type="text" value={pinCode} onChange={e => setPinCode(e.target.value)} placeholder="e.g. 110001" className={fieldClass} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>Emergency Contact Name & No</label>
                  <input type="text" value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} placeholder="e.g. Uncle (+91 98765 43212)" className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Remarks / Notes</label>
                  <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any specific requirements..." className={fieldClass} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Documents upload */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              <h2 className="text-lg font-bold text-white border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Upload Documents
              </h2>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-1">
                  <FileUploadField label="Student Photo *" value={photoUrl} onChange={setPhotoUrl} isPublic={true} accept="image/*" hint="Student passport photo (JPG/PNG)" />
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-1">
                  <FileUploadField label="Birth Certificate *" value={birthCertUrl} onChange={setBirthCertUrl} isPublic={true} accept="image/*,application/pdf" hint="PDF or JPG up to 5MB" />
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-1">
                  <FileUploadField label="Transfer Certificate" value={transferCertUrl} onChange={setTransferCertUrl} isPublic={true} accept="image/*,application/pdf" hint="Original TC from previous school" />
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-1">
                  <FileUploadField label="Previous Report Card" value={reportCardUrl} onChange={setReportCardUrl} isPublic={true} accept="image/*,application/pdf" hint="Last completed academic marksheet" />
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-1">
                  <FileUploadField label="Aadhaar Card (Optional)" value={aadhaarUrl} onChange={setAadhaarUrl} isPublic={true} accept="image/*,application/pdf" hint="Aadhaar proof for student" />
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-1">
                  <FileUploadField label="Other Supporting Documents" value={otherDocsUrl} onChange={setOtherDocsUrl} isPublic={true} accept="image/*,application/pdf" hint="Certificates or Medical details" />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary bg-white/5 border-white/20 mt-1 cursor-pointer"
                />
                <label htmlFor="terms" className="text-[13px] text-slate-400 select-none leading-relaxed cursor-pointer">
                  I hereby declare that the particulars furnished above are true to the best of my knowledge and belief. I agree to abide by the rules and regulations of the institution.
                </label>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-between items-center pt-6 border-t border-white/10">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="px-6 py-3 border border-white/15 hover:bg-white/5 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-primary/20"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={status === "loading" || !photoUrl || !birthCertUrl}
                className="px-8 py-3 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Submit Application
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
