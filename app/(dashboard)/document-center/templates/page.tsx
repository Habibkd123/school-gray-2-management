"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Printer, Download, X, Loader2, User, FileText, CreditCard, Award, Edit3, Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Settings2, Save } from "lucide-react";
import { useStudents } from "@/app/hooks/useStudents";
import { useTeachers } from "@/app/hooks/useTeachers";
import { getAuthHeaders } from "@/lib/utils/session";

// ===================== CONFIG & DATA =====================

const THEMES = {
  navy: { name: 'Navy & Gold', pri: '#12305c', acc: '#b8860b' },
  emerald: { name: 'Emerald', pri: '#0f5132', acc: '#b08d57' },
  maroon: { name: 'Maroon Heritage', pri: '#6b1e2b', acc: '#c9a227' },
  slate: { name: 'Slate Blue', pri: '#28324a', acc: '#3f8f78' },
  indigo: { name: 'Royal Indigo', pri: '#2b2560', acc: '#d1a13d' },
  sepia: { name: 'Classic Sepia', pri: '#5c3a21', acc: '#d4a373' },
  crimson: { name: 'Deep Crimson', pri: '#7a1921', acc: '#d4af37' },
  teal: { name: 'Dark Teal', pri: '#004d40', acc: '#26a69a' },
};

interface DocType {
  id: string;
  name: string;
  desc: string;
  category: 'student' | 'teacher' | 'both';
}

const DOC_TYPES: DocType[] = [
  { id: 'bonafide', name: 'Bonafide Certificate', desc: 'Enrollment proof', category: 'student' },
  { id: 'tc', name: 'Transfer Certificate', desc: 'TC / Leaving', category: 'student' },
  { id: 'character', name: 'Character Certificate', desc: 'Conduct proof', category: 'student' },
  { id: 'study', name: 'Study Certificate', desc: 'Currently studying', category: 'student' },
  { id: 'experience', name: 'Experience Certificate', desc: 'For staff/teachers', category: 'teacher' },
  { id: 'salary', name: 'Salary Slip', desc: 'Monthly payslip', category: 'teacher' },
  { id: 'idcard', name: 'ID Card', desc: 'Student / staff', category: 'both' },
  { id: 'marksheet', name: 'Mark Sheet', desc: '4 formats — pick below', category: 'student' },
];

const DOC_TITLES: Record<string, string> = {
  bonafide: 'Bonafide Certificate', tc: 'Transfer Certificate', character: 'Character Certificate',
  study: 'Study Certificate', experience: 'Experience Certificate', salary: 'Salary Slip',
  idcard: 'Identity Card', marksheet: 'Statement of Marks'
};

function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d: string) {
  if (!d) return '__________';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}
function num(v: any) { return Number(v) || 0; }
function money(v: any) { return '₹ ' + num(v).toLocaleString('en-IN'); }

// ===================== DATA DROPDOWNS API FETCHED =====================

// ===================== FIELD DEFS =====================

type FieldDef = [string, string, 'text' | 'date' | 'number' | 'textarea' | 'select', string];

const FIELD_DEFS: Record<string, FieldDef[]> = {
  bonafide: [
    ['certNo', 'Certificate No.', 'text', 'BC/2026/014'],
    ['date', 'Date of Issue', 'date', today()],
    ['studentName', 'Student Name', 'text', ''],
    ['fatherName', "Father's Name", 'text', ''],
    ['motherName', "Mother's Name", 'text', ''],
    ['className', 'Class', 'text', ''],
    ['section', 'Section', 'text', ''],
    ['session', 'Academic Session', 'text', '2025-26'],
    ['dob', 'Date of Birth', 'date', ''],
    ['purpose', 'Purpose', 'textarea', 'for the purpose of obtaining a caste certificate / scholarship'],
  ],
  tc: [
    ['tcNo', 'TC No.', 'text', 'TC/2026/031'],
    ['admissionNo', 'Admission No.', 'text', ''],
    ['studentName', 'Student Name', 'text', ''],
    ['fatherName', "Father's Name", 'text', ''],
    ['motherName', "Mother's Name", 'text', ''],
    ['nationality', 'Nationality', 'text', 'Indian'],
    ['religion', 'Religion', 'text', 'Hindu'],
    ['category', 'Category', 'text', 'OBC'],
    ['dobFigures', 'Date of Birth (figures)', 'date', ''],
    ['dobWords', 'Date of Birth (in words)', 'text', ''],
    ['lastClass', 'Class Last Studied', 'text', ''],
    ['admissionDate', 'Date of Admission', 'date', ''],
    ['leavingDate', 'Date of Leaving', 'date', today()],
    ['reasonForLeaving', 'Reason for Leaving', 'text', 'Parents shifted to another village'],
    ['conduct', 'Conduct', 'text', 'Good'],
    ['workingDays', 'Total Working Days', 'text', '220'],
    ['presentDays', 'Days Present', 'text', '208'],
    ['promoted', 'Promoted to Higher Class', 'select', 'Yes|No|N/A'],
    ['remarks', 'Remarks', 'textarea', 'No dues pending against the school.'],
  ],
  character: [
    ['certNo', 'Certificate No.', 'text', 'CC/2026/019'],
    ['studentName', 'Student Name', 'text', ''],
    ['fatherName', "Father's Name", 'text', ''],
    ['className', 'Class', 'text', ''],
    ['session', 'Session / Duration', 'text', '2019 to 2026'],
    ['conductText', 'Conduct Remarks', 'textarea', 'His moral character and conduct during this period has been found to be excellent. He is disciplined, honest and respectful towards teachers and fellow students.'],
    ['date', 'Date of Issue', 'date', today()],
  ],
  study: [
    ['certNo', 'Certificate No.', 'text', 'SC/2026/022'],
    ['studentName', 'Student Name', 'text', ''],
    ['fatherName', "Father's Name", 'text', ''],
    ['className', 'Class', 'text', ''],
    ['session', 'Academic Session', 'text', '2025-26'],
    ['studyingSince', 'Studying Since', 'text', '1st April 2019'],
    ['date', 'Date of Issue', 'date', today()],
  ],
  experience: [
    ['certNo', 'Certificate No.', 'text', 'EC/2026/007'],
    ['employeeName', 'Employee Name', 'text', ''],
    ['designation', 'Designation', 'text', ''],
    ['subjectTaught', 'Subject(s) Taught', 'text', ''],
    ['joiningDate', 'Date of Joining', 'date', ''],
    ['relievingDate', 'Date of Relieving', 'date', today()],
    ['duration', 'Total Duration', 'text', '7 years, 6 months'],
    ['conductText', 'Remarks', 'textarea', 'During her tenure she has been sincere, hard-working and dedicated towards her duties. Her conduct has always been exemplary.'],
    ['date', 'Date of Issue', 'date', today()],
  ],
  salary: [
    ['month', 'Salary Month', 'text', 'June 2026'],
    ['employeeName', 'Employee Name', 'text', ''],
    ['designation', 'Designation', 'text', ''],
    ['employeeId', 'Employee / PEN No.', 'text', ''],
    ['bankAcNo', 'Bank A/c No.', 'text', ''],
    ['daysPresent', 'Days Present', 'text', '26'],
    ['daysInMonth', 'Days in Month', 'text', '30'],
    ['basic', 'Basic Pay', 'number', ''],
    ['da', 'Dearness Allowance (DA)', 'number', ''],
    ['hra', 'House Rent Allowance (HRA)', 'number', ''],
    ['ta', 'Travel Allowance (TA)', 'number', ''],
    ['otherAllow', 'Other Allowance', 'number', '0'],
    ['pf', 'Provident Fund (PF)', 'number', ''],
    ['profTax', 'Professional Tax', 'number', '200'],
    ['otherDeduct', 'Other Deduction', 'number', '0'],
  ],
  idcard: [
    ['role', 'Role', 'select', 'Student|Teacher|Staff'],
    ['name', 'Full Name', 'text', ''],
    ['classOrDesig', 'Class / Designation', 'text', ''],
    ['idNo', 'Roll No. / Employee ID', 'text', ''],
    ['bloodGroup', 'Blood Group', 'text', 'B+'],
    ['dob', 'Date of Birth', 'date', ''],
    ['address', 'Address', 'textarea', ''],
    ['contact', 'Contact No.', 'text', ''],
    ['validTill', 'Valid Till', 'text', '31 March 2027'],
  ],
  marksheet: [
    ['studentName', 'Student Name', 'text', ''],
    ['fatherName', "Father's Name", 'text', ''],
    ['motherName', "Mother's Name", 'text', ''],
    ['className', 'Class / Course', 'text', ''],
    ['section', 'Section', 'text', ''],
    ['rollNo', 'Roll No.', 'text', ''],
    ['registrationNo', 'Registration No.', 'text', ''],
    ['session', 'Session', 'text', '2025-26'],
    ['examName', 'Examination', 'text', 'Annual Examination'],
    ['dob', 'Date of Birth', 'date', ''],
  ],
};

const MS_FORMATS = [
  { id: 'iti', name: 'ITI / Institute (Theory + Practical)' },
  { id: 'villagePrimary', name: 'Village Primary School (Hindi)' },
  { id: 'boardDivision', name: 'Secondary Board (Division & Result)' },
  { id: 'cceGrade', name: 'CCE Grade Report (Term-wise)' },
];

const VILLAGE_FIELDS: FieldDef[] = [
  ['enrollmentNo', 'नामांक (Enrollment No.)', 'text', '504'],
  ['session', 'सत्र (Session)', 'text', '2025-2026'],
  ['studentName', 'नाम विद्यार्थी (Student Name)', 'text', ''],
  ['fatherName', "पिता का नाम (Father's Name)", 'text', ''],
  ['motherName', "माता का नाम (Mother's Name)", 'text', ''],
  ['classCategory', 'कक्षा (Class)', 'select', 'I|II|III|IV|V'],
  ['dob', 'जन्म तिथि (Date of Birth)', 'date', ''],
  ['supplementarySubject', 'पूरक विषय (Supplementary Subject)', 'text', '—'],
  ['specialAch1', 'विशेष योग्यता 1 (Special Achievement 1)', 'text', 'हिन्दी'],
  ['specialAch2', 'विशेष योग्यता 2 (Special Achievement 2)', 'text', 'पर्यावरण अध्ययन'],
  ['resultStatus', 'परिणाम (Result)', 'select', 'उत्तीर्ण|अनुत्तीर्ण|पूरक'],
  ['division', 'श्रेणी (Division)', 'select', 'प्रथम|द्वितीय|तृतीय'],
];

const BOARD_EXTRA_FIELDS: FieldDef[] = [
  ['division', 'Division', 'select', 'First|Second|Third|Fail'],
  ['resultStatus', 'Result', 'select', 'PASS|FAIL|SUPPLEMENTARY'],
];

function getFieldDefsForFormat(format: string): FieldDef[] {
  if (format === 'villagePrimary') return VILLAGE_FIELDS;
  if (format === 'boardDivision') return [...FIELD_DEFS.marksheet, ...BOARD_EXTRA_FIELDS];
  return FIELD_DEFS.marksheet; // iti, cceGrade
}

function getInitialData() {
  let init: any = {};
  Object.keys(FIELD_DEFS).forEach(dt => {
    init[dt] = {};
    FIELD_DEFS[dt].forEach(([key, label, type, def]) => {
      init[dt][key] = type === 'select' ? def.split('|')[0] : def;
    });
  });
  [...VILLAGE_FIELDS, ...BOARD_EXTRA_FIELDS].forEach(([key, label, type, def]) => {
    if (!(key in init.marksheet)) {
      init.marksheet[key] = type === 'select' ? def.split('|')[0] : def;
    }
  });
  return init;
}

// ===================== REACT COMPONENTS =====================

function SearchableDropdown({ options, placeholder, onSelect }: { options: any[], placeholder: string, onSelect: (r: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => 
    (o.name || "").toLowerCase().includes(search.toLowerCase()) || 
    (o.roll_no && String(o.roll_no).includes(search)) || 
    (o.employee_id && String(o.employee_id).includes(search))
  );

  return (
    <div className="search-dropdown-wrapper" ref={dropdownRef}>
      <div className="search-input-box" onClick={() => setIsOpen(true)}>
        <Search size={14} className="search-icon" />
        <input 
          type="text" 
          placeholder={placeholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
        />
      </div>
      
      {isOpen && (
        <div className="search-options">
          {filtered.length > 0 ? filtered.map(opt => {
            const classObj = typeof opt.class_id === 'object' ? opt.class_id : null;
            const subtitle = classObj ? `Class ${classObj.name}${classObj.section ? ' - ' + classObj.section : ''} • Roll: ${opt.roll_no || ''}` : ((opt.user_id && typeof opt.user_id === "object" && "role" in opt.user_id ? opt.user_id.role : opt.department) || "Teacher");
            return (
              <div key={opt._id || opt.id} className="search-opt-item" onClick={() => {
                onSelect(opt);
                setSearch(opt.name);
                setIsOpen(false);
              }}>
                <div style={{fontWeight:600, color:'#111', fontSize:'13px'}}>{opt.name}</div>
                <div style={{fontSize:'10px', color:'#777'}}>{subtitle}</div>
              </div>
            );
          }) : (
            <div className="search-opt-empty">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}

function isFieldEditable(docType: string, key: string, isRecordSelected: boolean): boolean {
  if (!isRecordSelected) return true; // Show all fields if no record is selected
  
  const editableMap: Record<string, string[]> = {
    bonafide: ['certNo', 'date', 'purpose'],
    tc: ['tcNo', 'leavingDate', 'reasonForLeaving', 'conduct', 'workingDays', 'presentDays', 'promoted', 'remarks'],
    character: ['certNo', 'date', 'conductText'],
    study: ['certNo', 'date', 'studyingSince'],
    experience: ['certNo', 'date', 'duration', 'conductText'],
    salary: ['month', 'daysPresent', 'daysInMonth', 'otherAllow', 'otherDeduct', 'bankAcNo'],
    idcard: ['validTill'],
    marksheet: ['examName', 'registrationNo', 'specialAch1', 'specialAch2', 'supplementarySubject', 'division', 'resultStatus']
  };
  
  return editableMap[docType]?.includes(key) ?? true;
}

export default function DocumentBuilderPage() {
  const [category, setCategory] = useState<'student' | 'teacher'>('student');
  const [docType, setDocType] = useState('bonafide');
  
  const [msFormat, setMsFormat] = useState('iti');
  const [theme, setTheme] = useState('sepia');

  // Zoom level & collapsible & student summary states
  const [zoomLevel, setZoomLevel] = useState<number | 'fit'>(1.0);
  const [isSchoolDetailsOpen, setIsSchoolDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Template Editor State
  const [isEditMode, setIsEditMode] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<Record<string, any>>({});
  const [activeEditField, setActiveEditField] = useState<string>('body');
  
  const [school, setSchool] = useState({
    schoolName: 'My School Life',
    schoolAddress: 'Village Kherli, Tehsil Kota, District Kota, Rajasthan - 324001',
    schoolPhone: '+91 98765 43210',
    udise: '08251234567',
    affNo: 'AFF/2011/00456',
    estd: '1978',
  });
  
  const [data, setData] = useState<Record<string, any>>(getInitialData());
  const [photo, setPhoto] = useState<string | null>(null);

  // Fetch lists with limit=1000 to cover all records
  const { students, fetchStudents } = useStudents({ skip: true });
  const { teachers, fetchTeachers } = useTeachers({ skip: true });

  useEffect(() => {
    fetchStudents({ limit: 1000 });
    fetchTeachers();
  }, [fetchStudents, fetchTeachers]);

  // Auto-fill logic
  const handleSelectRecord = (record: any) => {
    setSelectedRecord(record);
    if (!record) {
      setData(getInitialData());
      setPhoto(null);
      return;
    }
    const recordName = record.name || '';

    // Standard synchronous state update first
    setData(prev => {
      // Student documents
      if (category === 'student') {
        const studentDocs = ['bonafide', 'tc', 'character', 'study', 'idcard', 'marksheet'];
        const updated = { ...prev };
        studentDocs.forEach(dt => {
          const currentDocData = { ...updated[dt] };
          currentDocData.studentName = recordName;
          currentDocData.name = recordName;
          currentDocData.fatherName = record.father_name || '';
          currentDocData.motherName = record.mother_name || '';
          currentDocData.dob = record.dob || '';
          currentDocData.rollNo = record.roll_no || '';
          currentDocData.idNo = record.roll_no || '';
          currentDocData.admissionNo = record.admission_no || '';
          currentDocData.contact = record.phone || '';
          currentDocData.address = record.address || '';
          
          const classObj = typeof record.class_id === 'object' ? record.class_id : null;
          if (classObj) {
            currentDocData.className = classObj.name || '';
            currentDocData.section = classObj.section || '';
            currentDocData.classCategory = classObj.name || '';
            currentDocData.classOrDesig = `Class ${classObj.name} - ${classObj.section}`;
          }

          if (dt === 'tc') {
            currentDocData.dobFigures = record.dob || '';
            currentDocData.admissionDate = record.admission_date || '';
            currentDocData.nationality = 'Indian';
            currentDocData.religion = record.religion || 'Hindu';
            currentDocData.category = record.category || 'OBC';
            currentDocData.lastClass = classObj ? classObj.name : '';
          }
          
          if (dt === 'marksheet') {
            currentDocData.enrollmentNo = record.admission_no || '';
          }
          updated[dt] = currentDocData;
        });
        return updated;
      } else {
        // Teacher documents
        const teacherDocs = ['experience', 'salary', 'idcard'];
        const updated = { ...prev };
        teacherDocs.forEach(dt => {
          const currentDocData = { ...updated[dt] };
          currentDocData.employeeName = recordName;
          currentDocData.name = recordName;
          currentDocData.designation = (record.user_id && typeof record.user_id === "object" && "role" in record.user_id ? record.user_id.role : record.department) || "Teacher";
          currentDocData.role = (record.user_id && typeof record.user_id === "object" && "role" in record.user_id ? record.user_id.role : record.department) || "Teacher";
          currentDocData.classOrDesig = record.department || '';
          currentDocData.subjectTaught = record.subject_specialization || record.subject || '';
          currentDocData.joiningDate = record.join_date || '';
          currentDocData.employeeId = record.employee_id || '';
          currentDocData.idNo = record.employee_id || '';
          currentDocData.bankAcNo = record.account_number || '';
          currentDocData.contact = record.phone || '';
          currentDocData.address = record.address || '';
          currentDocData.dob = record.dob || '';
          currentDocData.bloodGroup = record.blood_group || 'B+';
          
          if (dt === 'salary') {
            currentDocData.basic = record.basic_salary ? String(Math.round(record.basic_salary * 0.60)) : '0';
            currentDocData.pf = '0';
            currentDocData.da = record.basic_salary ? String(Math.round(record.basic_salary * 0.20)) : '0';
            currentDocData.hra = record.basic_salary ? String(Math.round(record.basic_salary * 0.15)) : '0';
            currentDocData.ta = record.basic_salary ? String(Math.round(record.basic_salary * 0.05)) : '0';
            currentDocData.profTax = '0';
            currentDocData.otherDeduct = '0';
          }
          updated[dt] = currentDocData;
        });
        return updated;
      }
    });

    // For teachers, fetch live salary preview info from API
    if (category === 'teacher') {
      const period = new Date().toISOString().split('T')[0].substring(0, 7); // e.g. "2026-07"
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const currentMonthName = monthNames[new Date().getMonth()] + " " + new Date().getFullYear();

      fetch(`/api/salaries/preview?teacher_id=${record._id}&period=${period}`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(res => {
          if (res.success) {
            const preview = res.data;
            setData(prev => {
              const currentDocData = { ...prev.salary };
              currentDocData.month = currentMonthName;
              currentDocData.employeeName = recordName;
              currentDocData.designation = (record.user_id && typeof record.user_id === "object" && "role" in record.user_id ? record.user_id.role : record.department) || "Teacher";
              currentDocData.employeeId = record.employee_id || '';
              currentDocData.bankAcNo = record.account_number || '';
              currentDocData.daysPresent = String(preview.presentDays);
              currentDocData.daysInMonth = String(preview.workingDays);
              currentDocData.basic = String(Math.round(preview.monthlySalary * 0.60));
              currentDocData.da = String(Math.round(preview.monthlySalary * 0.20));
              currentDocData.hra = String(Math.round(preview.monthlySalary * 0.15));
              currentDocData.ta = String(Math.round(preview.monthlySalary * 0.05));
              currentDocData.otherAllow = '0';
              currentDocData.pf = '0';
              currentDocData.profTax = '0';
              currentDocData.otherDeduct = '0';
              currentDocData.suggestedDeduction = String(preview.suggestedDeduction);
              return { ...prev, salary: currentDocData };
            });
          }
        })
        .catch(err => console.error("Error fetching preview for doc fill:", err));
    }

    if (record.photo_url) {
      setPhoto(record.photo_url);
    } else {
      setPhoto(null);
    }
  };

  const [subjects, setSubjects] = useState<Record<string, any[]>>({
    iti: [
      { name: 'Fire Prevention & Protection', thMax: 100, thObt: 78, prMax: 50, prObt: 42 },
      { name: 'Industrial Safety Management', thMax: 100, thObt: 85, prMax: 50, prObt: 45 },
      { name: 'First Aid & Rescue Operations', thMax: 100, thObt: 80, prMax: 50, prObt: 40 },
      { name: 'Hazardous Material Handling', thMax: 100, thObt: 75, prMax: 50, prObt: 38 },
      { name: 'Practical Training & Fire Drill', thMax: 0, thObt: 0, prMax: 100, prObt: 88 },
    ],
    villagePrimary: [
      { name: 'हिन्दी', max: 200, obt: 150 },
      { name: 'अंग्रेजी', max: 100, obt: 74 },
      { name: 'गणित', max: 200, obt: 137 },
      { name: 'पर्यावरण अध्ययन', max: 200, obt: 176 },
    ],
    boardDivision: [
      { name: 'Hindi', max: 100, obt: 78 },
      { name: 'English', max: 100, obt: 82 },
      { name: 'Mathematics', max: 100, obt: 88 },
      { name: 'Science', max: 100, obt: 75 },
      { name: 'Social Science', max: 100, obt: 80 },
      { name: 'Sanskrit', max: 100, obt: 85 },
    ],
    cceGrade: [
      { name: 'Hindi', term1: 'A1', term2: 'A2' },
      { name: 'English', term1: 'B1', term2: 'A2' },
      { name: 'Mathematics', term1: 'A2', term2: 'A1' },
      { name: 'Science', term1: 'B1', term2: 'B1' },
      { name: 'Social Science', term1: 'A2', term2: 'A2' },
    ],
  });
  
  const [coScholastic, setCoScholastic] = useState<Record<string, any[]>>({
    villagePrimary: [
      { name: 'कार्यानुभव (Work Experience)', max: 100, obt: 95, grade: 'अ' },
      { name: 'कला शिक्षा (Art Education)', max: 100, obt: 90, grade: 'अ' },
      { name: 'स्वास्थ्य एवं शारीरिक शिक्षा (Health & Phy. Edu.)', max: 100, obt: 85, grade: 'अ' },
    ],
    cceGrade: [
      { name: 'Work Education', grade: 'A' },
      { name: 'Art Education', grade: 'A' },
      { name: 'Health & Physical Education', grade: 'A' },
    ],
  });

  // Ensure docType is valid when switching tabs
  useEffect(() => {
    const validTypes = DOC_TYPES.filter(d => d.category === category || d.category === 'both');
    if (!validTypes.find(d => d.id === docType)) {
      setDocType(validTypes[0].id);
    }
  }, [category]);

  // SVG Helpers
  const emblemSVG = (pri: string, acc: string) => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="none" stroke="${pri}" stroke-width="3"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="${acc}" stroke-width="1.5"/>
      <path d="M50 20 L58 42 L82 42 L62 56 L70 78 L50 64 L30 78 L38 56 L18 42 L42 42 Z" fill="${pri}" opacity="0.85"/>
      <circle cx="50" cy="50" r="8" fill="${acc}"/>
    </svg>`;
  const watermarkSVG = (pri: string) => `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="90" fill="none" stroke="${pri}" stroke-width="4"/>
      <circle cx="100" cy="100" r="70" fill="none" stroke="${pri}" stroke-width="2"/>
      <path d="M100 40 L116 84 L164 84 L124 112 L140 156 L100 128 L60 156 L76 112 L36 84 L84 84 Z" fill="${pri}"/>
    </svg>`;

  function qrSVG(seedStr: string) {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    function rnd() { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 8) % 100 / 100; }
    const n = 9, cell = 100 / n;
    let rects = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const isFinder = (r < 3 && c < 3) || (r < 3 && c > n - 4) || (r > n - 4 && c < 3);
        const on = isFinder ? (r === 0 || r === 2 || c === 0 || c === 2 || (r === 1 && c === 1)) : rnd() > 0.55;
        if (on) rects += `<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="#222"/>`;
      }
    }
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#fff"/>${rects}</svg>`;
  }

  function gradeFor(pct: number) {
    if (pct >= 90) return 'A1';
    if (pct >= 80) return 'A2';
    if (pct >= 70) return 'B1';
    if (pct >= 60) return 'B2';
    if (pct >= 50) return 'C1';
    if (pct >= 40) return 'C2';
    if (pct >= 33) return 'D';
    return 'E';
  }

  const schoolHeader = (t: any) => `
    <div class="letterhead">
      <div class="emblem">${emblemSVG(t.pri, t.acc)}</div>
      <div class="lh-text">
        <h2 ${isEditMode ? 'contenteditable="true" data-edit-id="schoolName" title="Click to edit school name" class="editable"' : ''}>${customTemplates[docType]?.schoolName ?? school.schoolName}</h2>
        <div class="sub" ${isEditMode ? 'contenteditable="true" data-edit-id="schoolAddress" title="Click to edit address" class="editable"' : ''}>${customTemplates[docType]?.schoolAddress ?? school.schoolAddress}</div>
        <div class="meta" ${isEditMode ? 'contenteditable="true" data-edit-id="schoolMeta" title="Click to edit meta info" class="editable"' : ''}>${customTemplates[docType]?.schoolMeta ?? `UDISE: ${school.udise} &nbsp;|&nbsp; Affiliation No: ${school.affNo} &nbsp;|&nbsp; Estd. ${school.estd} &nbsp;|&nbsp; Ph: ${school.schoolPhone}`}</div>
      </div>
      <div class="emblem" style="opacity:0">${emblemSVG(t.pri, t.acc)}</div>
    </div>`;

  const certWrap = (title: string, certNo: string, date: string, bodyHtml: string, signLeft = 'Class Teacher', signRight = 'Principal', t: any) => `
    <div class="badge-strip"></div>
    <div class="frame">
      <div class="wm">${watermarkSVG(t.pri)}</div>
      ${schoolHeader(t)}
      <div class="cert-title-wrap">
        <div class="cert-title" ${isEditMode ? 'contenteditable="true" data-edit-id="title" title="Click to edit title" class="editable"' : ''}>${customTemplates[docType]?.title ?? title}</div>
        <div class="rule"></div>
      </div>
      <div class="meta-row">
        <span><b>Ref No.:</b> ${certNo}</span>
        <span><b>Date:</b> ${fmtDate(date)}</span>
      </div>
      <div class="body-text" ${isEditMode ? 'contenteditable="true" data-edit-id="body" title="Click to edit body" class="editable"' : ''}>${customTemplates[docType]?.body ?? bodyHtml}</div>
      <div class="sign-row">
        <div class="sign-box"><div class="seal">SCHOOL<br>SEAL</div></div>
        <div class="sign-box"><div class="sign-line" ${isEditMode ? 'contenteditable="true" data-edit-id="signLeft" title="Click to edit signature" class="editable"' : ''}>${customTemplates[docType]?.signLeft ?? signLeft}</div></div>
        <div class="sign-box"><div class="sign-line" ${isEditMode ? 'contenteditable="true" data-edit-id="signRight" title="Click to edit signature" class="editable"' : ''}>${customTemplates[docType]?.signRight ?? signRight}</div></div>
      </div>
    </div>`;

  const renderPreviewHtml = () => {
    const t = THEMES[theme as keyof typeof THEMES];
    const d = data[docType];

    switch (docType) {
      case 'bonafide': {
        const classPart = d.className === '' ? '' : `studying in Class <b>${d.className}</b>${d.section ? ` (Section ${d.section})` : ''}`;
        const body = `This is to certify that <b>${d.studentName}</b>, ${classPart}
          during the academic session <b>${d.session}</b>, is a bonafide student of this school.
          Son/Daughter of <b>${d.fatherName}</b> and Smt. <b>${d.motherName}</b>, born on <b>${fmtDate(d.dob)}</b>, has been studying
          in this institution since his/her admission and his/her conduct and character during this period has been found satisfactory.
          <br><br>This certificate is issued on the request of the student/guardian ${d.purpose}.`;
        return certWrap('Bonafide Certificate', d.certNo, d.date, body, 'Class Teacher', 'Principal', t);
      }
      case 'character': {
        const body = `This is to certify that <b>${d.studentName}</b>, Son/Daughter of <b>${d.fatherName}</b>, was a student of Class
          <b>${d.className}</b> in this school during the period <b>${d.session}</b>.
          <br><br>${d.conductText}
          <br><br>We wish him/her every success in future life.`;
        return certWrap('Character Certificate', d.certNo, d.date, body, 'Class Teacher', 'Principal', t);
      }
      case 'study': {
        const body = `This is to certify that <b>${d.studentName}</b>, Son/Daughter of <b>${d.fatherName}</b>, is currently studying in
          Class <b>${d.className}</b> of this school during the academic session <b>${d.session}</b>.
          He/She has been studying in this school since <b>${d.studyingSince}</b>.
          <br><br>This certificate is issued for official purposes.`;
        return certWrap('Study Certificate', d.certNo, d.date, body, 'Class Teacher', 'Principal', t);
      }
      case 'experience': {
        const body = `This is to certify that <b>${d.employeeName}</b> worked as <b>${d.designation}</b> in this school
          from <b>${fmtDate(d.joiningDate)}</b> to <b>${fmtDate(d.relievingDate)}</b>, a total duration of <b>${d.duration}</b>.
          During this tenure, she/he taught <b>${d.subjectTaught}</b>.
          <br><br>${d.conductText}
          <br><br>We wish her/him success in all future endeavours.`;
        return certWrap('Experience Certificate', d.certNo, d.date, body, 'Principal', 'Chairman/Manager', t);
      }
      case 'tc': {
        const rows = [
          ['1', 'Admission No.', d.admissionNo],
          ['2', "Student's Name", d.studentName],
          ['3', "Father's Name", d.fatherName],
          ['4', "Mother's Name", d.motherName],
          ['5', 'Nationality', d.nationality],
          ['6', 'Religion / Category', `${d.religion} / ${d.category}`],
          ['7', 'Date of Birth (Figures)', fmtDate(d.dobFigures)],
          ['8', 'Date of Birth (Words)', d.dobWords],
          ['9', 'Class in which last studied', d.lastClass],
          ['10', 'Date of Admission', fmtDate(d.admissionDate)],
          ['11', 'Date of Leaving School', fmtDate(d.leavingDate)],
          ['12', 'Reason for Leaving School', d.reasonForLeaving],
          ['13', 'Conduct', d.conduct],
          ['14', 'Total Working Days / Days Present', `${d.workingDays} / ${d.presentDays}`],
          ['15', 'Whether Qualified for Promotion', d.promoted],
          ['16', 'Remarks', d.remarks],
        ];
        return `
          <div class="badge-strip"></div>
          <div class="frame">
            <div class="wm">${watermarkSVG(t.pri)}</div>
            ${schoolHeader(t)}
            <div class="cert-title-wrap">
              <div class="cert-title">Transfer Certificate</div>
              <div class="rule"></div>
            </div>
            <div class="meta-row">
              <span><b>TC No.:</b> ${d.tcNo}</span>
              <span><b>Date:</b> ${fmtDate(d.leavingDate)}</span>
            </div>
            <table class="doc-table tc-fields">
              ${rows.map(r => `<tr><td class="num">${r[0]}</td><td class="label">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}
            </table>
            <div class="sign-row">
              <div class="sign-box"><div class="seal">SCHOOL<br>SEAL</div></div>
              <div class="sign-box"><div class="sign-line">Class Teacher</div></div>
              <div class="sign-box"><div class="sign-line">Principal / Headmaster</div></div>
            </div>
          </div>`;
      }
      case 'marksheet': {
        if (msFormat === 'iti') {
          const subs = subjects.iti;
          const rows = subs.map(s => {
            const tot = num(s.thMax) + num(s.prMax);
            const obt = num(s.thObt) + num(s.prObt);
            return `
              <tr>
                <td class="subj-name">${s.name}</td>
                <td>${s.thMax || '-'}</td><td>${s.thObt || '-'}</td>
                <td>${s.prMax || '-'}</td><td>${s.prObt || '-'}</td>
                <td>${tot}</td><td>${obt}</td>
              </tr>`;
          }).join('');
          const totThMax = subs.reduce((a, s) => a + num(s.thMax), 0);
          const totThObt = subs.reduce((a, s) => a + num(s.thObt), 0);
          const totPrMax = subs.reduce((a, s) => a + num(s.prMax), 0);
          const totPrObt = subs.reduce((a, s) => a + num(s.prObt), 0);
          const grandMax = totThMax + totPrMax;
          const grandObt = totThObt + totPrObt;
          const pct = grandMax ? (grandObt / grandMax * 100) : 0;
          const grade = gradeFor(pct);
          const result = pct >= 33 ? 'PASS' : 'FAIL';
          const qrSeed = `${d.registrationNo}|${d.rollNo}|${d.studentName}`;

          return `
            <div class="badge-strip"></div>
            <div class="frame">
              <div class="wm">${watermarkSVG(t.pri)}</div>
              ${schoolHeader(t)}
              <div class="ms-titleband">Annual Statement of Marks</div>
              <div class="ms-info-grid">
                <div><span>Registration No.</span><b>${d.registrationNo}</b></div>
                <div><span>Roll No.</span><b>${d.rollNo}</b></div>
                <div><span>Student Name</span><b>${d.studentName}</b></div>
                <div><span>Father's Name</span><b>${d.fatherName}</b></div>
                <div><span>Mother's Name</span><b>${d.motherName}</b></div>
                <div><span>Date of Birth</span><b>${fmtDate(d.dob)}</b></div>
                <div><span>Class / Course</span><b>${d.className}${d.section ? ' - ' + d.section : ''}</b></div>
                <div><span>Session</span><b>${d.session}</b></div>
                <div style="grid-column:1/-1"><span>Examination</span><b>${d.examName}</b></div>
              </div>
              <table class="ms-table doc-table">
                <thead>
                  <tr>
                    <th rowspan="2">Subject</th><th colspan="2">Theory</th><th colspan="2">Practical</th><th colspan="2">Total</th>
                  </tr>
                  <tr><th>Max</th><th>Obt.</th><th>Max</th><th>Obt.</th><th>Max</th><th>Obt.</th></tr>
                </thead>
                <tbody>
                  ${rows}
                  <tr class="ms-grandtotal">
                    <td>Grand Total</td>
                    <td>${totThMax}</td><td>${totThObt}</td>
                    <td>${totPrMax}</td><td>${totPrObt}</td>
                    <td>${grandMax}</td><td>${grandObt}</td>
                  </tr>
                </tbody>
              </table>
              <div class="ms-result-strip">
                <div>Percentage<b>${pct.toFixed(2)}%</b></div>
                <div>Grade<b>${grade}</b></div>
                <div>Result<b>${result}</b></div>
              </div>
              <div class="ms-footer">
                <div style="text-align:center;">
                  <div class="qr-box">${qrSVG(qrSeed)}</div>
                  <div class="qr-caption">Scan to verify authenticity</div>
                </div>
                <div class="sign-row" style="margin-top:0;">
                  <div class="sign-box"><div class="seal">SCHOOL<br>SEAL</div></div>
                  <div class="sign-box"><div class="sign-line">Examination Controller</div></div>
                  <div class="sign-box"><div class="sign-line">Principal / Headmaster</div></div>
                </div>
              </div>
            </div>`;
        } 
        else if (msFormat === 'villagePrimary') {
          const subs = subjects.villagePrimary;
          const co = coScholastic.villagePrimary;
          const totalMax = subs.reduce((a, s) => a + num(s.max), 0);
          const totalObt = subs.reduce((a, s) => a + num(s.obt), 0);
          const pct = totalMax ? (totalObt / totalMax * 100) : 0;
          const grade = gradeFor(pct);
          const rows = subs.map(s => `<tr><td class="subj-name">${s.name}</td><td>${s.max}</td><td>${s.obt}</td></tr>`).join('');
          const coRows = co.map(c => `<tr><td class="subj-name">${c.name}</td><td>${c.max}</td><td>${c.obt}</td><td>${c.grade}</td></tr>`).join('');

          return `
            <div class="badge-strip"></div>
            <div class="frame" style="font-family:'Nirmala UI','Mangal','Noto Sans Devanagari',Arial,sans-serif;">
              <div class="wm">${watermarkSVG(t.pri)}</div>
              ${schoolHeader(t)}
              <div class="ms-titleband">परीक्षा परिणाम पत्रक &nbsp;/&nbsp; Exam Result Sheet</div>
              <div class="ms-info-grid">
                <div><span>नामांक (Enrollment No.)</span><b>${d.enrollmentNo}</b></div>
                <div><span>सत्र (Session)</span><b>${d.session}</b></div>
                <div><span>नाम विद्यार्थी (Student Name)</span><b>${d.studentName}</b></div>
                <div><span>पिता का नाम (Father's Name)</span><b>${d.fatherName}</b></div>
                <div><span>माता का नाम (Mother's Name)</span><b>${d.motherName}</b></div>
                <div><span>कक्षा (Class)</span><b>${d.classCategory}</b></div>
                <div style="grid-column:1/-1"><span>जन्म तिथि (Date of Birth)</span><b>${fmtDate(d.dob)}</b></div>
              </div>
              <table class="ms-table doc-table">
                <thead><tr><th>विषय (Subject)</th><th>पूर्णांक (Max)</th><th>प्राप्तांक (Obtained)</th></tr></thead>
                <tbody>
                  ${rows}
                  <tr class="ms-grandtotal"><td>योग (Total)</td><td>${totalMax}</td><td>${totalObt}</td></tr>
                </tbody>
              </table>
              <div class="ms-result-strip">
                <div>प्रतिशत (%)<b>${pct.toFixed(2)}%</b></div>
                <div>ग्रेड (Grade)<b>${grade}</b></div>
              </div>
              <div class="section-title" style="margin:14px 0 8px;">सह-शैक्षिक गतिविधियाँ (Co-Scholastic Activities)</div>
              <table class="ms-table doc-table">
                <thead><tr><th>गतिविधि (Activity)</th><th>पूर्णांक</th><th>प्राप्तांक</th><th>ग्रेड</th></tr></thead>
                <tbody>${coRows}</tbody>
              </table>
              <div class="ms-info-grid" style="margin-top:10px;">
                <div><span>विशेष योग्यता 1</span><b>${d.specialAch1}</b></div>
                <div><span>विशेष योग्यता 2</span><b>${d.specialAch2}</b></div>
                <div><span>पूरक विषय (Suppl. Subject)</span><b>${d.supplementarySubject}</b></div>
                <div><span>श्रेणी (Division)</span><b>${d.division}</b></div>
                <div style="grid-column:1/-1"><span>परिणाम (Result)</span><b>${d.resultStatus}</b></div>
              </div>
              <div class="sign-row">
                <div class="sign-box" style="width:120px;"><div class="seal">विद्यालय<br>मुहर</div></div>
                <div class="sign-box" style="width:120px;"><div class="sign-line">अध्यापक</div></div>
                <div class="sign-box" style="width:120px;"><div class="sign-line">परीक्षा प्रभारी</div></div>
                <div class="sign-box" style="width:120px;"><div class="sign-line">संस्था प्रधान</div></div>
              </div>
            </div>`;
        }
        else if (msFormat === 'boardDivision') {
          const subs = subjects.boardDivision;
          const totalMax = subs.reduce((a, s) => a + num(s.max), 0);
          const totalObt = subs.reduce((a, s) => a + num(s.obt), 0);
          const pct = totalMax ? (totalObt / totalMax * 100) : 0;
          const rows = subs.map(s => `<tr><td class="subj-name">${s.name}</td><td>${s.max}</td><td>${s.obt}</td></tr>`).join('');

          return `
            <div class="badge-strip"></div>
            <div class="frame">
              <div class="wm">${watermarkSVG(t.pri)}</div>
              ${schoolHeader(t)}
              <div class="cert-title-wrap">
                <div class="cert-title">Statement of Marks</div>
                <div class="rule"></div>
              </div>
              <div class="meta-row">
                <span><b>Registration No.:</b> ${d.registrationNo}</span>
                <span><b>Roll No.:</b> ${d.rollNo}</span>
              </div>
              <div class="ms-info-grid">
                <div><span>Student Name</span><b>${d.studentName}</b></div>
                <div><span>Father's Name</span><b>${d.fatherName}</b></div>
                <div><span>Mother's Name</span><b>${d.motherName}</b></div>
                <div><span>Class / Section</span><b>${d.className} - ${d.section}</b></div>
                <div><span>Session</span><b>${d.session}</b></div>
                <div><span>Examination</span><b>${d.examName}</b></div>
                <div style="grid-column:1/-1"><span>Date of Birth</span><b>${fmtDate(d.dob)}</b></div>
              </div>
              <table class="ms-table doc-table">
                <thead><tr><th>Subject</th><th>Maximum Marks</th><th>Marks Obtained</th></tr></thead>
                <tbody>
                  ${rows}
                  <tr class="ms-grandtotal"><td>Grand Total</td><td>${totalMax}</td><td>${totalObt}</td></tr>
                </tbody>
              </table>
              <div class="ms-result-strip">
                <div>Percentage<b>${pct.toFixed(2)}%</b></div>
                <div>Division<b>${d.division}</b></div>
                <div>Result<b>${d.resultStatus}</b></div>
              </div>
              <div class="sign-row">
                <div class="sign-box"><div class="seal">SCHOOL<br>SEAL</div></div>
                <div class="sign-box"><div class="sign-line">Class Teacher</div></div>
                <div class="sign-box"><div class="sign-line">Examination Controller</div></div>
                <div class="sign-box"><div class="sign-line">Principal / Headmaster</div></div>
              </div>
            </div>`;
        }
        else if (msFormat === 'cceGrade') {
          const subs = subjects.cceGrade;
          const co = coScholastic.cceGrade;
          const rows = subs.map(s => `<tr><td class="subj-name">${s.name}</td><td>${s.term1}</td><td>${s.term2}</td></tr>`).join('');
          const coRows = co.map(c => `<tr><td class="subj-name">${c.name}</td><td colspan="2">${c.grade}</td></tr>`).join('');

          return `
            <div class="badge-strip"></div>
            <div class="frame">
              <div class="wm">${watermarkSVG(t.pri)}</div>
              ${schoolHeader(t)}
              <div class="cert-title-wrap">
                <div class="cert-title">Continuous & Comprehensive Evaluation (CCE) Report</div>
                <div class="rule"></div>
              </div>
              <div class="ms-info-grid">
                <div><span>Student Name</span><b>${d.studentName}</b></div>
                <div><span>Father's Name</span><b>${d.fatherName}</b></div>
                <div><span>Class / Section</span><b>${d.className} - ${d.section}</b></div>
                <div><span>Roll No.</span><b>${d.rollNo}</b></div>
                <div style="grid-column:1/-1"><span>Session</span><b>${d.session}</b></div>
              </div>
              <table class="ms-table doc-table">
                <thead><tr><th>Scholastic Area</th><th>Term 1</th><th>Term 2</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
              <div class="section-title" style="margin:14px 0 8px;">Co-Scholastic Areas</div>
              <table class="ms-table doc-table">
                <thead><tr><th>Activity</th><th colspan="2">Grade</th></tr></thead>
                <tbody>${coRows}</tbody>
              </table>
              <p style="font-size:10.5px;color:#666;margin-top:10px;">
                Grading scale: A1 (91-100) &nbsp;A2 (81-90) &nbsp;B1 (71-80) &nbsp;B2 (61-70) &nbsp;C1 (51-60) &nbsp;C2 (41-50) &nbsp;D (33-40) &nbsp;E (below 33)
              </p>
              <div class="sign-row">
                <div class="sign-box"><div class="seal">SCHOOL<br>SEAL</div></div>
                <div class="sign-box"><div class="sign-line">Class Teacher</div></div>
                <div class="sign-box"><div class="sign-line">Principal / Headmaster</div></div>
              </div>
            </div>`;
        }
      }
      case 'salary': {
        const gross = num(d.basic) + num(d.da) + num(d.hra) + num(d.ta) + num(d.otherAllow);
        const totalDeduct = num(d.pf) + num(d.profTax) + num(d.otherDeduct);
        const net = gross - totalDeduct;
        return `
          <div class="badge-strip"></div>
          <div class="frame">
            <div class="wm">${watermarkSVG(t.pri)}</div>
            ${schoolHeader(t)}
            <div class="cert-title-wrap">
              <div class="cert-title">Salary Slip — ${d.month}</div>
              <div class="rule"></div>
            </div>
            <table class="doc-table" style="border:1px solid #bbb;">
              <tr><td><b>Employee Name</b>: ${d.employeeName}</td><td><b>Designation</b>: ${d.designation}</td></tr>
              <tr><td><b>Employee/PEN No.</b>: ${d.employeeId}</td><td><b>Bank A/c No.</b>: ${d.bankAcNo}</td></tr>
              <tr><td><b>Days Present</b>: ${d.daysPresent}</td><td><b>Days in Month</b>: ${d.daysInMonth}</td></tr>
            </table>
            <div class="pay-grid">
              <div class="pay-col">
                <h4>EARNINGS</h4>
                <div class="pay-line"><span>Basic Pay</span><span>${money(d.basic)}</span></div>
                <div class="pay-line"><span>Dearness Allowance</span><span>${money(d.da)}</span></div>
                <div class="pay-line"><span>House Rent Allowance</span><span>${money(d.hra)}</span></div>
                <div class="pay-line"><span>Travel Allowance</span><span>${money(d.ta)}</span></div>
                <div class="pay-line"><span>Other Allowance</span><span>${money(d.otherAllow)}</span></div>
                <div class="pay-total"><span>Gross Earnings</span><span>${money(gross)}</span></div>
              </div>
              <div class="pay-col">
                <h4>DEDUCTIONS</h4>
                <div class="pay-line"><span>Provident Fund</span><span>${money(d.pf)}</span></div>
                <div class="pay-line"><span>Professional Tax</span><span>${money(d.profTax)}</span></div>
                <div class="pay-line"><span>Other Deduction</span><span>${money(d.otherDeduct)}</span></div>
                <div class="pay-total"><span>Total Deductions</span><span>${money(totalDeduct)}</span></div>
              </div>
            </div>
            <div class="netpay">
              <div>NET PAYABLE SALARY</div>
              <div class="amt">${money(net)}</div>
            </div>
            <div class="sign-row">
              <div class="sign-box"><div class="seal">SCHOOL<br>SEAL</div></div>
              <div class="sign-box"><div class="sign-line">Accountant</div></div>
              <div class="sign-box"><div class="sign-line">Principal / Headmaster</div></div>
            </div>
          </div>`;
      }
      case 'idcard': {
        const photoInner = photo ? `<img src="${photo}">` : 'PHOTO';
        return `
          <div class="idcard">
            <div class="idc-head">
              <h3>${school.schoolName}</h3>
              <p>${school.schoolAddress}</p>
              <div class="idc-photo">${photoInner}</div>
            </div>
            <div class="idc-body">
              <div class="idc-name">${d.name}</div>
              <div class="idc-role">${d.role}</div>
              <div class="idc-grid">
                <b>Class/Desig.</b><span>${d.classOrDesig}</span>
                <b>Roll/ID No.</b><span>${d.idNo}</span>
                <b>Blood Group</b><span>${d.bloodGroup}</span>
                <b>DOB</b><span>${fmtDate(d.dob)}</span>
                <b>Contact</b><span>${d.contact}</span>
                <b>Address</b><span>${d.address}</span>
              </div>
            </div>
            <div class="idc-strip"></div>
            <div class="idc-foot">Valid till ${d.validTill} &nbsp;•&nbsp; If found, please return to school office</div>
          </div>`;
      }
    }
    return '';
  };

  const currentTheme = THEMES[theme as keyof typeof THEMES];
  const activeDocs = DOC_TYPES.filter(d => d.category === category || d.category === 'both');

  return (
    <div id="doc-builder-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        #doc-builder-wrapper {
          --app-bg: #f3f4f6;
          --panel-bg: #ffffff;
          --ink: #0f172a;
          --muted: #64748b;
          --line: #e2e8f0;
          --accent: #2f6f4f;
          font-family: 'Outfit', sans-serif;
          background: var(--app-bg);
          color: var(--ink);
          margin: -32px;
        }
        #doc-builder-wrapper * { box-sizing: border-box; }
        
        /* App Main Shell */
        .db-app { display: flex; min-height: 100vh; }
        
        /* Left Sidebar Panel */
        .db-panel {
          width: 380px; min-width: 380px; background: var(--panel-bg);
          border-right: 1px solid var(--line); padding: 24px; overflow-y: auto; height: 100vh;
          position: sticky; top: 0; display: flex; flex-direction: column; gap: 20px;
          box-shadow: 4px 0 24px rgba(0,0,0,0.02); z-index: 20;
        }
        .db-panel::-webkit-scrollbar { width: 6px; }
        .db-panel::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        
        /* Tabs Switcher */
        .db-tabs { display: flex; bg: #f8fafc; border: 1px solid var(--line); border-radius: 4px; padding: 4px; }
        .db-tab { flex: 1; text-align: center; padding: 10px 8px; font-size: 12px; font-weight: 700; color: var(--muted); cursor: pointer; border-radius: 4px; transition: all 0.2s; }
        .db-tab.active { background: #fff; color: var(--ink); box-shadow: 0 4px 12px rgba(0,0,0,0.04); border: 1px solid var(--line); }

        /* Search Dropdown Box styling */
        .search-dropdown-wrapper { position: relative; }
        .search-input-box { display: flex; align-items: center; bg: #fff; border: 1.5px solid var(--line); border-radius: 4px; padding: 12px 14px; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .search-input-box:hover { border-color: var(--accent); }
        .search-input-box input { border: none; outline: none; width: 100%; font-size: 13.5px; font-family: inherit; margin: 0 8px; font-weight: 550; color: var(--ink); }
        .search-icon { color: var(--muted); }
        .search-options { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1px solid var(--line); border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); z-index: 30; max-height: 250px; overflow-y: auto; }
        .search-opt-item { padding: 12px 14px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.15s; text-align: left; }
        .search-opt-item:hover { background: #f8fafc; }
        .search-opt-empty { padding: 14px; text-align: center; color: var(--muted); font-size: 12px; }

        /* Theme selection */
        .db-theme-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
        .db-theme-swatch { width: 34px; height: 34px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; position: relative; flex: 0 0 auto; }
        .db-theme-swatch.active { border-color: var(--ink); }
        .db-theme-swatch::after { content: ""; position: absolute; inset: 4px; border-radius: 50%; background: var(--sw2); }
        
        .db-panel label { display: block; font-size: 11px; color: var(--muted); margin: 12px 0 5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .db-panel input[type=text], .db-panel input[type=date], .db-panel input[type=number], .db-panel textarea, .db-panel select {
          width: 100%; padding: 10px 12px; border: 1.5px solid var(--line); border-radius: 4px; font-size: 13px;
          font-family: inherit; background: #fff; color: var(--ink); outline: none; transition: border-color 0.2s;
        }
        .db-panel input:focus, .db-panel textarea:focus, .db-panel select:focus { border-color: var(--accent); }
        .db-panel textarea { resize: vertical; min-height: 64px; }
        
        .subj-card { border: 1.5px solid var(--line); border-radius: 4px; padding: 12px; margin-bottom: 10px; background: #f8fafc; text-align: left; }
        .subj-card input[type=text] { margin-bottom: 8px; font-weight: 700; }
        .subj-grid4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap: 6px; align-items: end; }
        .subj-grid4 .cell { display: flex; flex-direction: column; }
        .subj-grid4 .cell span { font-size: 9px; color: var(--muted); margin-bottom: 2px; text-transform: uppercase; letter-spacing: .03em; font-weight: 700; }
        .subj-grid4 input, .subj-grid4 select { padding: 6px 8px; font-size: 12px; border-radius: 4px; }
        
        .db-mini-btn { border: 1px solid var(--line); background: #fff; border-radius: 4px; padding: 6px 8px; cursor: pointer; font-size: 12px; height: 32px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .db-mini-btn:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }
        .db-add-row-btn { width: 100%; margin-top: 4px; padding: 10px; border: 1.5px dashed var(--line); background: #fafbfc; border-radius: 4px; cursor: pointer; font-size: 12px; color: var(--accent); font-weight: 700; transition: all 0.15s; }
        .db-add-row-btn:hover { background: #eef7f1; border-color: var(--accent); }
        .db-photo-drop { border: 1.5px dashed var(--line); border-radius: 4px; padding: 12px; text-align: center; font-size: 12px; color: var(--muted); cursor: pointer; display: block; transition: all 0.2s; }
        .db-photo-drop:hover { border-color: var(--accent); background: #f8fafc; }
        
        .db-print-btn { width: 100%; margin-top: 22px; padding: 12px; border: none; border-radius: 9px; background: var(--accent); color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; }
        .db-print-btn:hover { filter: brightness(1.08); }
        .db-hint { font-size: 10.5px; color: var(--muted); margin-top: 8px; line-height: 1.5; text-align: left; }
        
        /* Preview Workspace */
        .db-stage { flex: 1; padding: 0 0 100px 0; display: flex; flex-direction: column; align-items: center; overflow: auto; height: 100vh; background: var(--app-bg); position: relative; }
        
        .db-page { width: 210mm; min-height: 297mm; background: #fff; padding: 14mm; position: relative; color: #1f2430; font-family: 'Outfit', sans-serif; }
        .db-page.card-size { width: 340px; min-height: auto; height: auto; padding: 0; border-radius: 4px; overflow: hidden; }

        .db-page .frame { border: 3px double var(--pri); padding: 16px; height: 100%; position: relative; min-height: calc(297mm - 28mm - 32px); }
        .db-page .wm { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: .06; pointer-events: none; }
        .db-page .wm svg { width: 340px; height: 340px; }
        
        .db-page .letterhead { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid var(--pri); padding-bottom: 10px; margin-bottom: 14px; text-align: left; }
        .db-page .emblem { width: 64px; height: 64px; flex: 0 0 auto; }
        .db-page .lh-text { flex: 1; text-align: center; }
        .db-page .lh-text h2 { margin: 0; color: var(--pri); font-size: 24px; letter-spacing: .02em; font-family: Georgia, 'Times New Roman', serif; font-weight: 800; }
        .db-page .lh-text .sub { font-size: 12px; color: #444; margin-top: 2px; }
        .db-page .lh-text .meta { font-size: 10px; color: #666; margin-top: 2px; }
        
        .db-page .cert-title { text-align: center; font-size: 17px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--pri); margin: 10px 0 4px; position: relative; display: inline-block; font-family: Georgia, serif; }
        .db-page .cert-title-wrap { text-align: center; }
        .db-page .cert-title-wrap .rule { width: 150px; height: 2px; background: var(--acc); margin: 2px auto 16px; }
        
        .db-page .meta-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 14px; color: #333; font-family: inherit; }
        .db-page .body-text { font-size: 14px; line-height: 2.2; text-align: justify; color: #232323; }
        .db-page .body-text b { color: #000; font-family: inherit; }
        
        .db-page .sign-row { display: flex; justify-content: space-between; margin-top: 56px; font-size: 12px; font-family: inherit; font-weight: 600; }
        .db-page .sign-box { text-align: center; width: 150px; }
        .db-page .sign-line { border-top: 1px solid #333; margin-bottom: 4px; padding-top: 4px; }
        .db-page .seal { width: 80px; height: 80px; border: 2px dashed #999; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #999; text-align: center; margin: 0 auto 6px; }

        .db-page table.doc-table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin: 10px 0; font-family: inherit; }
        .db-page table.doc-table th, .db-page table.doc-table td { border: 1px solid #888; padding: 6px 8px; }
        .db-page table.doc-table th { background: var(--pri); color: #fff; font-weight: 700; text-align: center; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; padding: 8px; }
        .db-page table.tc-fields td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; font-family: inherit; }
        .db-page table.tc-fields td.num { width: 26px; color: #666; font-weight: 700; }
        .db-page table.tc-fields td.label { width: 280px; font-weight: 600; color: #333; }
        .db-page .badge-strip { height: 8px; background: linear-gradient(90deg, var(--pri), var(--acc)); margin: -14mm -14mm 14px -14mm; }

        .ms-titleband { background: linear-gradient(90deg, var(--pri), var(--acc)); color: #fff; text-align: center; padding: 7px 10px; font-weight: 800; font-size: 15px; letter-spacing: .08em; text-transform: uppercase; border-radius: 4px; margin: 12px 0 14px; }
        .ms-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; font-size: 12px; margin-bottom: 12px; font-family: inherit; }
        .ms-info-grid div { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding: 4px 0; }
        .ms-info-grid b { color: #333; }
        table.ms-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; font-family: inherit; }
        table.ms-table th, table.ms-table td { border: 1px solid #999; padding: 6px 7px; text-align: center; }
        table.ms-table thead tr:first-child th { background: var(--pri); color: #fff; }
        table.ms-table thead tr:last-child th { background: #eef0f3; color: #333; font-size: 10.5px; }
        table.ms-table td.subj-name { text-align: left; font-weight: 600; }
        tr.ms-grandtotal td { background: var(--acc); color: #fff; font-weight: 800; }
        .ms-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 26px; font-family: inherit; }
        .qr-box { width: 70px; height: 70px; border: 1px solid #999; padding: 3px; margin:0 auto; }
        .qr-box svg { width: 100%; height: 100%; }
        .qr-caption { font-size: 8.5px; color: #777; text-align: center; margin-top: 3px; width: 70px; }
        .ms-result-strip { display: flex; justify-content: space-around; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-bottom: 6px; font-size: 12.5px; font-family: inherit; }
        .ms-result-strip b { display: block; color: var(--pri); font-size: 15px; }

        .db-page .idcard { width: 340px; background: #fff; font-family: inherit; }
        .db-page .idc-head { background: linear-gradient(135deg, var(--pri), var(--acc)); color: #fff; padding: 12px 14px 30px; text-align: center; position: relative; }
        .db-page .idc-head h3 { margin: 0; font-size: 14.5px; font-family: Georgia, serif; }
        .db-page .idc-head p { margin: 2px 0 0; font-size: 9.5px; opacity: .9; }
        .db-page .idc-photo { width: 78px; height: 90px; background: #f1f1f1; border: 3px solid #fff; border-radius: 4px; position: absolute; left: 50%; top: 52px; transform: translateX(-50%); box-shadow: 0 2px 6px rgba(0,0,0,.25); overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #999; }
        .db-page .idc-photo img { width: 100%; height: 100%; object-fit: cover; }
        .db-page .idc-body { padding: 46px 16px 12px; text-align: center; }
        .db-page .idc-name { font-size: 15px; font-weight: 800; color: var(--pri); margin-bottom: 1px; }
        .db-page .idc-role { font-size: 11px; color: var(--acc); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; }
        .db-page .idc-grid { text-align: left; font-size: 11px; display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; margin-top: 8px; }
        .db-page .idc-grid b { color: #444; font-weight: 600; }
        .db-page .idc-foot { background: #f5f5f5; padding: 8px 14px; font-size: 9px; color: #666; text-align: center; border-top: 1px solid #e2e2e2; }
        .db-page .idc-strip { height: 6px; background: repeating-linear-gradient(90deg, var(--pri) 0 6px, #fff 6px 8px); }

        .db-page .pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #bbb; margin-top: 10px; font-family: inherit; }
        .db-page .pay-col { padding: 0; }
        .db-page .pay-col h4 { margin: 0; background: var(--pri); color: #fff; padding: 7px 10px; font-size: 12px; }
        .db-page .pay-line { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 12.5px; border-bottom: 1px solid #eee; }
        .db-page .pay-total { display: flex; justify-content: space-between; padding: 8px 10px; font-size: 13px; font-weight: 800; background: #f7f7f7; border-top: 2px solid #ccc; }
        .db-page .netpay { margin-top: 12px; text-align: center; background: #f4f9f6; border: 1.5px solid var(--pri); border-radius: 8px; padding: 12px; font-family: inherit; }
        .db-page .netpay .amt { font-size: 22px; font-weight: 800; color: var(--pri); }

        @media print {
          /* Hide sidebar panel completely */
          #doc-builder-wrapper .db-panel { display: none !important; }
          /* Reset wrapper heights / overflow so print engine sees only db-page content */
          #doc-builder-wrapper,
          #doc-builder-wrapper .db-app,
          #doc-builder-wrapper .db-stage {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          /* Remove the zoom scale transform — print at 100% */
          #doc-builder-wrapper .db-zoom-wrapper {
            transform: none !important;
            width: 100% !important;
            display: block !important;
          }
          /* Toolbar hidden during print */
          #doc-builder-wrapper .db-stage > div:first-child { display: none !important; }
          /* Spacer divs hidden during print */
          #doc-builder-wrapper .db-stage > div:last-child { display: none !important; }
        }
      `}</style>
      
      <div className="db-app">
        
        {/* ============ LEFT CONTROL PANEL ============ */}
        <div className="db-panel">
          
          {/* Group 1: Choose category */}
          <div className="db-tabs">
            <div className={`db-tab ${category === 'student' ? 'active' : ''}`} onClick={() => setCategory('student')}>
              Student Documents
            </div>
            <div className={`db-tab ${category === 'teacher' ? 'active' : ''}`} onClick={() => setCategory('teacher')}>
              Teacher Documents
            </div>
          </div>

          {/* Group 2: Search */}
          <div className="space-y-1">
            <SearchableDropdown 
              key={category}
              options={category === 'student' ? students : teachers}
              placeholder="Search Student / Teacher"
              onSelect={handleSelectRecord}
            />
            <span className="block text-[10px] text-slate-400 text-left font-medium">Type Name, Admission No, Employee ID...</span>
          </div>

          {/* Profile Card if student/teacher selected */}
          {selectedRecord && (
            <div className="bg-[#f8fafc] border border-border rounded p-4 flex gap-3 text-left animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="w-10 h-10 rounded-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 text-slate-500">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-xs text-slate-800 truncate">{selectedRecord.name}</h4>
                <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                  {category === 'student' 
                    ? `Class ${selectedRecord.class_id?.name || 'N/A'} • Adm: ${selectedRecord.admission_no || 'N/A'}`
                    : `${selectedRecord.department || 'Staff'} • Emp ID: ${selectedRecord.employee_id || 'N/A'}`
                  }
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-2 text-[9.5px] text-slate-650 border-t border-dashed border-slate-200 pt-1.5">
                  <div className="truncate"><b>DOB:</b> {selectedRecord.dob ? new Date(selectedRecord.dob).toLocaleDateString('en-GB', {day:'2-digit', month:'short'}) : '—'}</div>
                  <div className="truncate"><b>Father:</b> {selectedRecord.father_name || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Group 3: Document Type Dropdown */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[11px] font-bold text-slate-550 uppercase tracking-wider">Document Type</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-border rounded text-xs outline-none focus:border-primary font-bold text-slate-800"
            >
              {activeDocs.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {docType === 'marksheet' && (
            <div className="db-format-selector" style={{ marginTop: '5px', padding: '12px', background: '#f8fafc', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <label style={{ margin: '0 0 6px 0', fontSize: '10.5px', display: 'block', textTransform: 'uppercase', fontWeight: 700, color: 'var(--muted)' }}>Marksheet Format</label>
              <select value={msFormat} onChange={e => setMsFormat(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '13px' }}>
                {MS_FORMATS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

          {/* Group 4: Design Theme */}
          <div className="space-y-2">
            <span className="block text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider text-left">Design Theme</span>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'sepia', name: 'Classic Brown', pri: '#5c3a21', acc: '#d4a373' },
                { id: 'navy', name: 'Modern Blue', pri: '#12305c', acc: '#b8860b' },
                { id: 'emerald', name: 'Green', pri: '#0f5132', acc: '#b08d57' },
                { id: 'indigo', name: 'Royal Purple', pri: '#2b2560', acc: '#d1a13d' },
                { id: 'slate', name: 'Minimal Black', pri: '#28324a', acc: '#3f8f78' },
              ].map((th) => {
                const isActive = th.id === theme;
                return (
                  <button
                    key={th.id}
                    onClick={() => setTheme(th.id)}
                    className={`w-full px-3 py-2 rounded border text-left transition-all flex items-center justify-between cursor-pointer
                      ${isActive 
                        ? 'border-primary bg-primary/5 text-primary shadow-sm font-bold' 
                        : 'border-border bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                  >
                    <span className="text-[12px] font-bold text-slate-800">{th.name}</span>
                    <div className="flex gap-1.5 items-center">
                      <span className="w-5 h-5 rounded-full border border-border shadow-sm" style={{ backgroundColor: th.pri }} />
                      <span className="w-5 h-5 rounded-full border border-border shadow-sm" style={{ backgroundColor: th.acc }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group 5: Collapsible School Details */}
          <div className="space-y-1">
            <button
              onClick={() => setIsSchoolDetailsOpen(!isSchoolDetailsOpen)}
              className="w-full flex items-center justify-between py-2 text-left font-bold text-xs uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors border-b border-border cursor-pointer"
            >
              <span>{isSchoolDetailsOpen ? '▲' : '▼'} School Details</span>
              <span className="text-[10px] text-slate-450 normal-case font-medium">Click to configure</span>
            </button>
            
            {isSchoolDetailsOpen && (
              <div className="mt-2 space-y-3.5 border border-border rounded p-4 bg-slate-50/50 animate-in fade-in duration-200">
                {[
                  ['schoolName', 'School Name', 'text'],
                  ['schoolAddress', 'Address', 'textarea'],
                  ['schoolPhone', 'Phone', 'text'],
                  ['udise', 'UDISE Code', 'text'],
                  ['affNo', 'Affiliation / Recognition No.', 'text'],
                  ['estd', 'Established Year', 'text'],
                ].map(([key, label, type]) => (
                  <div key={key} className="space-y-1 text-left">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                    {type === 'textarea' ? (
                      <textarea 
                        value={(school as any)[key]} 
                        onChange={e => setSchool({...school, [key]: e.target.value})} 
                        className="w-full px-3 py-2 bg-white border border-border rounded text-xs outline-none focus:border-primary"
                      />
                    ) : (
                      <input 
                        type="text" 
                        value={(school as any)[key]} 
                        onChange={e => setSchool({...school, [key]: e.target.value})} 
                        className="w-full px-3 py-2 bg-white border border-border rounded text-xs outline-none focus:border-primary"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Group 6: Form fields details OR Template Editor */}
          {!isEditMode ? (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="block text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider text-left">{DOC_TITLES[docType]} Details</span>
                <button 
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Template
                </button>
              </div>
              
              {docType === 'marksheet' ? (
                <div className="space-y-3.5">
                  {getFieldDefsForFormat(msFormat)
                    .filter(([key]) => isFieldEditable('marksheet', key, !!selectedRecord))
                    .map(([key, label, type, def]) => {
                      const val = data.marksheet?.[key] ?? '';
                      const handleChange = (e: any) => setData(prev => ({...prev, marksheet: {...prev.marksheet, [key]: e.target.value}}));
                      if (type === 'select') {
                        return (
                          <div key={key} className="space-y-1 text-left">
                            <label>{label}</label>
                            <select value={val} onChange={handleChange}>
                              {def.split('|').map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                        );
                      }
                      if (type === 'textarea') {
                        return <div key={key} className="space-y-1 text-left"><label>{label}</label><textarea value={val} onChange={handleChange} className="rounded" /></div>;
                      }
                      return <div key={key} className="space-y-1 text-left"><label>{label}</label><input type={type} value={val} onChange={handleChange} className="rounded" /></div>;
                    })}
                  
                  <div style={{marginTop:'15px', textAlign:'left'}}><label>Subjects &amp; Marks</label></div>
                  {msFormat === 'iti' && (
                    <div>
                      {subjects.iti.map((s, i) => (
                        <div key={i} className="subj-card">
                          <input type="text" value={s.name} onChange={e => { const next={...subjects}; next.iti[i].name=e.target.value; setSubjects(next); }} className="w-full px-3 py-1.5 bg-white border border-border rounded text-xs outline-none focus:border-primary" />
                          <div className="subj-grid4 mt-2">
                            <div className="cell"><span>Th. Max</span><input type="number" value={s.thMax} onChange={e => { const next={...subjects}; next.iti[i].thMax=Number(e.target.value)||0; setSubjects(next); }}/></div>
                            <div className="cell"><span>Th. Obt.</span><input type="number" value={s.thObt} onChange={e => { const next={...subjects}; next.iti[i].thObt=Number(e.target.value)||0; setSubjects(next); }}/></div>
                            <div className="cell"><span>Pr. Max</span><input type="number" value={s.prMax} onChange={e => { const next={...subjects}; next.iti[i].prMax=Number(e.target.value)||0; setSubjects(next); }}/></div>
                            <div className="cell"><span>Pr. Obt.</span><input type="number" value={s.prObt} onChange={e => { const next={...subjects}; next.iti[i].prObt=Number(e.target.value)||0; setSubjects(next); }}/></div>
                            <button className="db-mini-btn" onClick={() => { const next={...subjects}; next.iti.splice(i,1); setSubjects(next); }}>✕</button>
                          </div>
                        </div>
                      ))}
                      <button className="db-add-row-btn" onClick={() => { const next={...subjects}; next.iti.push({name:'New', thMax:100, thObt:0, prMax:50, prObt:0}); setSubjects(next); }}>+ Add Subject</button>
                    </div>
                  )}

                  {(msFormat === 'villagePrimary' || msFormat === 'boardDivision') && (
                    <div>
                      {subjects[msFormat].map((s, i) => (
                        <div key={i} className="subj-card">
                          <input type="text" value={s.name} onChange={e => { const next={...subjects}; next[msFormat][i].name=e.target.value; setSubjects(next); }} className="w-full px-3 py-1.5 bg-white border border-border rounded text-xs outline-none focus:border-primary" />
                          <div className="subj-grid4 mt-2" style={{gridTemplateColumns:'1fr 1fr auto'}}>
                            <div className="cell"><span>Max</span><input type="number" value={s.max} onChange={e => { const next={...subjects}; next[msFormat][i].max=Number(e.target.value)||0; setSubjects(next); }}/></div>
                            <div className="cell"><span>Obt.</span><input type="number" value={s.obt} onChange={e => { const next={...subjects}; next[msFormat][i].obt=Number(e.target.value)||0; setSubjects(next); }}/></div>
                            <button className="db-mini-btn" onClick={() => { const next={...subjects}; next[msFormat].splice(i,1); setSubjects(next); }}>✕</button>
                          </div>
                        </div>
                      ))}
                      <button className="db-add-row-btn" onClick={() => { const next={...subjects}; next[msFormat].push({name:'New', max:100, obt:0}); setSubjects(next); }}>+ Add Subject</button>
                    </div>
                  )}

                  {msFormat === 'cceGrade' && (
                    <div>
                      {subjects.cceGrade.map((s, i) => (
                        <div key={i} className="subj-card">
                          <input type="text" value={s.name} onChange={e => { const next={...subjects}; next.cceGrade[i].name=e.target.value; setSubjects(next); }} className="w-full px-3 py-1.5 bg-white border border-border rounded text-xs outline-none focus:border-primary" />
                          <div className="subj-grid4 mt-2" style={{gridTemplateColumns:'1fr 1fr auto'}}>
                            <div className="cell">
                              <span>Term 1</span>
                              <select value={s.term1} onChange={e => { const next={...subjects}; next.cceGrade[i].term1=e.target.value; setSubjects(next); }}>
                                {['A1','A2','B1','B2','C1','C2','D','E'].map(g=><option key={g} value={g}>{g}</option>)}
                              </select>
                            </div>
                            <div className="cell">
                              <span>Term 2</span>
                              <select value={s.term2} onChange={e => { const next={...subjects}; next.cceGrade[i].term2=e.target.value; setSubjects(next); }}>
                                {['A1','A2','B1','B2','C1','C2','D','E'].map(g=><option key={g} value={g}>{g}</option>)}
                              </select>
                            </div>
                            <button className="db-mini-btn" onClick={() => { const next={...subjects}; next.cceGrade.splice(i,1); setSubjects(next); }}>✕</button>
                          </div>
                        </div>
                      ))}
                      <button className="db-add-row-btn" onClick={() => { const next={...subjects}; next.cceGrade.push({name:'New', term1:'B1', term2:'B1'}); setSubjects(next); }}>+ Add Subject</button>
                    </div>
                  )}

                  {(msFormat === 'villagePrimary' || msFormat === 'cceGrade') && (
                    <div style={{marginTop:'15px', textAlign:'left'}}>
                      <label>Co-Scholastic Activities</label>
                      {msFormat === 'villagePrimary' && coScholastic.villagePrimary.map((c, i) => (
                        <div key={i} className="subj-card">
                          <input type="text" value={c.name} onChange={e => { const next={...coScholastic}; next.villagePrimary[i].name=e.target.value; setCoScholastic(next); }} className="w-full px-3 py-1.5 bg-white border border-border rounded text-xs outline-none focus:border-primary" />
                          <div className="subj-grid4 mt-2" style={{gridTemplateColumns:'1fr 1fr 1fr auto'}}>
                            <div className="cell"><span>Max</span><input type="number" value={c.max} onChange={e => { const next={...coScholastic}; next.villagePrimary[i].max=Number(e.target.value)||0; setCoScholastic(next); }}/></div>
                            <div className="cell"><span>Obt.</span><input type="number" value={c.obt} onChange={e => { const next={...coScholastic}; next.villagePrimary[i].obt=Number(e.target.value)||0; setCoScholastic(next); }}/></div>
                            <div className="cell"><span>Grade</span><input type="text" value={c.grade} onChange={e => { const next={...coScholastic}; next.villagePrimary[i].grade=e.target.value; setCoScholastic(next); }}/></div>
                            <button className="db-mini-btn" onClick={() => { const next={...coScholastic}; next.villagePrimary.splice(i,1); setCoScholastic(next); }}>✕</button>
                          </div>
                        </div>
                      ))}
                      {msFormat === 'cceGrade' && coScholastic.cceGrade.map((c, i) => (
                        <div key={i} className="subj-card">
                          <input type="text" value={c.name} onChange={e => { const next={...coScholastic}; next.cceGrade[i].name=e.target.value; setCoScholastic(next); }} className="w-full px-3 py-1.5 bg-white border border-border rounded text-xs outline-none focus:border-primary" />
                          <div className="subj-grid4 mt-2" style={{gridTemplateColumns:'1fr auto'}}>
                            <div className="cell"><span>Grade</span><input type="text" value={c.grade} onChange={e => { const next={...coScholastic}; next.cceGrade[i].grade=e.target.value; setCoScholastic(next); }}/></div>
                            <button className="db-mini-btn" onClick={() => { const next={...coScholastic}; next.cceGrade.splice(i,1); setCoScholastic(next); }}>✕</button>
                          </div>
                        </div>
                      ))}
                      <button className="db-add-row-btn" onClick={() => {
                        const next={...coScholastic};
                        if (msFormat === 'villagePrimary') next.villagePrimary.push({name:'New', max:100, obt:0, grade:'A'});
                        else next.cceGrade.push({name:'New', grade:'A'});
                        setCoScholastic(next);
                      }}>+ Add Activity</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3.5">
                  {FIELD_DEFS[docType]
                    .filter(([key]) => isFieldEditable(docType, key, !!selectedRecord))
                    .map(([key, label, type, def]) => {
                      const val = data[docType]?.[key] ?? '';
                      const handleChange = (e: any) => setData(prev => ({...prev, [docType]: {...prev[docType], [key]: e.target.value}}));
                      if (type === 'select') {
                        return (
                          <div key={key} className="space-y-1 text-left">
                            <label>{label}</label>
                            <select value={val} onChange={handleChange} className="rounded">
                              {def.split('|').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                        );
                      }
                      if (type === 'textarea') {
                        return <div key={key} className="space-y-1 text-left"><label>{label}</label><textarea value={val} onChange={handleChange} className="rounded" /></div>;
                      }
                      if (docType === 'salary' && key === 'otherDeduct') {
                        const suggestedVal = data.salary?.suggestedDeduction;
                        return (
                          <div key={key} className="space-y-1 text-left">
                            <div className="flex justify-between items-center mb-1">
                              <label className="m-0">{label}</label>
                              {suggestedVal && Number(suggestedVal) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setData(prev => ({...prev, salary: {...prev.salary, otherDeduct: String(suggestedVal)}}))}
                                  className="text-[10px] text-primary hover:underline font-bold"
                                >
                                  Apply suggested: ₹{suggestedVal}
                                </button>
                              )}
                            </div>
                            <input type={type} value={val} onChange={handleChange} className="rounded" />
                          </div>
                        );
                      }
                      return <div key={key} className="space-y-1 text-left"><label>{label}</label><input type={type} value={val} onChange={handleChange} className="rounded" /></div>;
                    })}

                  {docType === 'idcard' && (
                    <div className="text-left space-y-1.5">
                      <label>Photo</label>
                      <label className="db-photo-drop">
                        {photo ? 'Photo selected — click to change' : 'Click to upload photo (optional)'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const reader = new FileReader();
                            reader.onload = () => setPhoto(reader.result as string);
                            reader.readAsDataURL(f);
                          }
                        }} />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-200 bg-emerald-50/40 p-4 rounded-lg border border-emerald-100 shadow-sm relative">
              <button 
                onClick={() => setIsEditMode(false)}
                className="absolute top-4 right-4 p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                title="Close Editor"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 mb-4 border-b border-emerald-100 pb-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Settings2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-[13px] text-emerald-900 leading-tight">Template Editor</h3>
                  <p className="text-[9.5px] text-emerald-600 font-bold uppercase tracking-wider">Customizing: {DOC_TITLES[docType]}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-white border border-emerald-100 rounded shadow-sm">
                  <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                    Click on the text blocks in the <b>Live Preview</b> on the right to edit them directly. 
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Use the tools below to format your selected text.
                  </p>
                </div>

                <div className="space-y-1 text-left mt-4">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Text Formatting</label>
                  
                  {/* Font Family & Size */}
                  <div className="flex items-center gap-2 mb-2">
                    <select 
                      className="flex-1 px-2 py-1.5 bg-white border border-border rounded text-xs outline-none"
                      onChange={(e) => document.execCommand('fontName', false, e.target.value)}
                    >
                      <option value="Inter, sans-serif">Inter</option>
                      <option value="serif">Serif (Times)</option>
                      <option value="monospace">Monospace</option>
                      <option value="'Comic Sans MS', cursive">Comic Sans</option>
                    </select>
                    <select 
                      className="w-20 px-2 py-1.5 bg-white border border-border rounded text-xs outline-none"
                      onChange={(e) => document.execCommand('fontSize', false, e.target.value)}
                    >
                      <option value="1">Small</option>
                      <option value="3">Normal</option>
                      <option value="5">Large</option>
                      <option value="7">Huge</option>
                    </select>
                  </div>

                  {/* Toolbar Row 1 */}
                  <div className="flex items-center gap-1 bg-white border border-border rounded p-1">
                    <button type="button" onClick={(e) => { e.preventDefault(); document.execCommand('bold', false); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer transition-colors" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={(e) => { e.preventDefault(); document.execCommand('italic', false); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer transition-colors" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={(e) => { e.preventDefault(); document.execCommand('underline', false); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer transition-colors" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <button type="button" onClick={(e) => { e.preventDefault(); document.execCommand('justifyLeft', false); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer transition-colors" title="Align Left"><AlignLeft className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={(e) => { e.preventDefault(); document.execCommand('justifyCenter', false); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer transition-colors" title="Align Center"><AlignCenter className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={(e) => { e.preventDefault(); document.execCommand('justifyRight', false); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer transition-colors" title="Align Right"><AlignRight className="w-3.5 h-3.5" /></button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <div className="relative flex items-center justify-center p-1.5 hover:bg-slate-100 rounded cursor-pointer group" title="Text Color">
                      <Type className="w-3.5 h-3.5 text-slate-700" />
                      <input type="color" onChange={(e) => document.execCommand('foreColor', false, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    </div>
                  </div>
                </div>

                {/* Example sidebar controls for global settings */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Global Settings</label>
                  <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-100 rounded text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
                    <span>Show Watermark</span>
                    <input type="checkbox" defaultChecked className="w-3.5 h-3.5 rounded text-emerald-600" />
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-100 rounded text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
                    <span>Show Borders</span>
                    <input type="checkbox" defaultChecked className="w-3.5 h-3.5 rounded text-emerald-600" />
                  </div>
                </div>

                <button className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer mt-4">
                  <Save className="w-3.5 h-3.5" />
                  Save as Custom Template
                </button>
              </div>
            </div>
          )}

          <div className="h-20" /> {/* Spacer */}
        </div>

        {/* ============ RIGHT PREVIEW ============ */}
        <div className="db-stage">
          {/* Zoom & Action Top Toolbar */}
          <div className="w-full bg-white border-b border-border flex items-center justify-between px-6 py-3.5 mb-8 print:hidden sticky top-0 z-30 shadow-sm">
            <div className="font-extrabold text-[15px] text-slate-800">Live Preview</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded border border-border bg-white overflow-hidden">
                <button onClick={() => setZoomLevel(Math.max(0.5, (zoomLevel as number) - 0.25))} className="px-3.5 py-1.5 hover:bg-slate-50 text-slate-600 border-r border-border transition-colors cursor-pointer font-bold">—</button>
                <div className="px-3 py-1.5 text-xs font-bold text-slate-700 min-w-[64px] text-center">{typeof zoomLevel === 'number' ? `${Math.round(zoomLevel * 100)}%` : 'Fit'}</div>
                <button onClick={() => setZoomLevel(Math.min(2.0, (zoomLevel as number) + 0.25))} className="px-3.5 py-1.5 hover:bg-slate-50 text-slate-600 border-l border-border transition-colors cursor-pointer font-bold">+</button>
              </div>
              <button onClick={() => setZoomLevel('fit')} className="px-4 py-1.5 rounded border border-border bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer">
                <Search className="w-3.5 h-3.5" /> Fit Width
              </button>
              <div className="w-px h-5 bg-border mx-1" />
              <button onClick={() => window.print()} className="px-4 py-1.5 rounded border border-border bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer">
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button onClick={() => window.print()} className="px-4 py-1.5 rounded border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>
          </div>

          {/* Interactive Document Page Canvas */}
          <div 
            className="db-zoom-wrapper flex items-start justify-center transition-all duration-200"
            style={{
              transform: zoomLevel === 'fit' ? 'none' : `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              width: zoomLevel === 'fit' ? '100%' : 'auto',
            }}
          >
            <style>{`
              .editable { transition: all 0.2s ease; cursor: text; border-radius: 4px; border: 1px solid transparent; }
              .editable:hover { outline: 1px dashed #10b981; outline-offset: 4px; background: rgba(16, 185, 129, 0.05); }
              .editable:focus { outline: 2px solid #10b981; outline-offset: 4px; background: rgba(16, 185, 129, 0.05); border-color: transparent; }
              .editable:empty:before { content: attr(title); color: #94a3b8; font-style: italic; font-weight: normal; }
            `}</style>
            <div 
              className={`db-page ${docType === 'idcard' ? 'card-size' : ''}`}
              style={{ 
                "--pri": currentTheme.pri, 
                "--acc": currentTheme.acc,
                boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
                border: '1px solid var(--line)',
                borderRadius: docType === 'idcard' ? '4px' : '0px'
              } as any}
              dangerouslySetInnerHTML={{ __html: renderPreviewHtml() }}
              onBlur={(e) => {
                if (!isEditMode) return;
                const target = e.target as HTMLElement;
                if (target.hasAttribute('data-edit-id')) {
                  const editId = target.getAttribute('data-edit-id') as string;
                  const newHtml = target.innerHTML;
                  setCustomTemplates(prev => ({
                    ...prev,
                    [docType]: {
                      ...(prev[docType] || {}),
                      [editId]: newHtml
                    }
                  }));
                }
              }}
            />
          </div>

          <div className="h-28" /> {/* Spacer */}
        </div>

      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-[380px] right-0 bg-white border-t border-border flex justify-center items-center py-4 px-6 gap-4 z-40 print:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <button onClick={() => handleSelectRecord(null)} className="px-10 py-2.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors cursor-pointer w-40">Cancel</button>
        <button onClick={() => alert('Template configurations saved successfully!')} className="px-10 py-2.5 rounded border border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-700 text-sm font-bold transition-colors cursor-pointer w-56">Save as Template</button>
        <button onClick={() => window.print()} className="px-10 py-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 w-56">
          <FileText className="w-4 h-4" /> Generate Document <span className="text-lg leading-none ml-1">→</span>
        </button>
      </div>

    </div>
  );
}
