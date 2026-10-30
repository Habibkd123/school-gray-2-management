# Backend Bug Register & Resolution Log

> **Project:** School Management System Backend API  
> **Audit Period:** Complete Backend API Verification & Hardening  
> **Status:** **ALL CONFIRMED BUGS RESOLVED & REGRESSION VERIFIED (10/10 FIXED)**

---

## 1. Summary of Discovered Bugs

| Bug ID | Endpoint / Component | Severity | Category | Root Cause | Status |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **BUG-001** | `/api/leave-types/[id]` | **High** | Crash / 500 Error | Missing `ObjectId.isValid()` check on PUT/DELETE; missing GET handler | **RESOLVED** |
| **BUG-002** | `/api/leave-types` | **Medium** | Data Integrity | In-memory index race condition causing duplicate leave type names | **RESOLVED** |
| **BUG-003** | `/api/leave/[id]` | **High** | Crash / IDOR | Missing `ObjectId.isValid()` check; missing GET handler with student/parent ownership | **RESOLVED** |
| **BUG-004** | `lib/models/GeneratedDocument.ts` | **High** | Schema Validation | Mongoose Map rejected dot-separated template variable keys (`system.date`) | **RESOLVED** |
| **BUG-005** | `/api/documents/generated/[id]` | **High** | Crash / 500 Error | Missing `ObjectId.isValid()` validation on GET, PATCH, DELETE | **RESOLVED** |
| **BUG-006** | `/api/subject-assignment/[id]` | **High** | Crash / 500 Error | Missing `ObjectId.isValid()` validation on PUT, DELETE | **RESOLVED** |
| **BUG-007** | `/api/subject-master/[id]` | **High** | Crash / 500 Error | Missing `ObjectId.isValid()` validation on GET, PUT, DELETE | **RESOLVED** |
| **BUG-008** | `/api/public/upload` | **Medium** | Security / Storage | Accepted zero-byte empty file uploads without validation | **RESOLVED** |
| **BUG-009** | `/api/upload` | **High** | Security / Storage | Missing zero-byte check & path traversal / dangerous script extension filter | **RESOLVED** |
| **BUG-010** | `/api/reports/class/[id]`, `student/[id]`, `teacher/[id]` | **Critical** | Authorization Bypass | Student and parent roles could view unauthorized report data | **RESOLVED** |

---

## 2. Detailed Bug Reports & Fix Implementations

### BUG-001: Unhandled CastError & Missing GET in `/api/leave-types/[id]`
- **Affected File:** `app/api/leave-types/[id]/route.ts`
- **HTTP Methods:** `PUT`, `DELETE`, missing `GET`
- **Severity:** High
- **Description:** When an invalid or malformed ID string (e.g., `"invalid-id"`) was supplied in the URL parameter, Mongoose threw an unhandled `CastError: Cast to ObjectId failed`, causing an internal 500 error instead of a graceful 400 Bad Request. Additionally, single leave-type lookup via `GET` was not implemented.
- **Root Cause:** Absence of `mongoose.Types.ObjectId.isValid(id)` guard before querying MongoDB.
- **Resolution:**
  1. Added early validation:
     ```typescript
     if (!mongoose.Types.ObjectId.isValid(id)) {
       return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
     }
     ```
  2. Implemented `GET` handler scoped by tenant `school_id`.
- **Verification:** Verified by `tests/api/audit-complete-backend-deep.test.ts` (returns 400 on malformed ID; correctly retrieves record on valid ID).

---

### BUG-002: Race Condition on Duplicate Leave Type Creation in `/api/leave-types`
- **Affected File:** `app/api/leave-types/route.ts`
- **HTTP Methods:** `POST`
- **Severity:** Medium
- **Description:** Rapid consecutive requests could insert duplicate leave types for the same school because unique indexes in MongoDB can have build latency in testing or dev environments.
- **Root Cause:** Relying exclusively on MongoDB index creation without application-level duplicate existence check.
- **Resolution:** Added an explicit application-level case-insensitive check:
  ```typescript
  const existing = await LeaveType.findOne({
    school_id: user.school_id,
    leave_type: { $regex: new RegExp(`^${leave_type.trim()}$`, "i") }
  });
  if (existing) {
    return NextResponse.json({ success: false, message: "Leave type already exists" }, { status: 409 });
  }
  ```
- **Verification:** Verified in `tests/api/audit-complete-backend-deep.test.ts` (rejects duplicate leave type with 409 Conflict).

---

### BUG-003: Unhandled CastError & Missing Ownership GET in `/api/leave/[id]`
- **Affected File:** `app/api/leave/[id]/route.ts`
- **HTTP Methods:** `PATCH`, `DELETE`, missing `GET`
- **Severity:** High
- **Description:** Malformed ID strings triggered unhandled 500 CastErrors. Additionally, clients could not retrieve individual leave application details via GET, and student/parent ownership rules were not verified on single-record retrieval.
- **Root Cause:** Missing `ObjectId.isValid(id)` check and missing GET handler.
- **Resolution:** Added `ObjectId.isValid(id)` guard and implemented `GET` handler with strict ownership checks:
  ```typescript
  if (user.role === 'student' && leave.applicant_id?.toString() !== user.user_id) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  ```
- **Verification:** Verified in `tests/api/audit-complete-backend-deep.test.ts` (400 on invalid ID, 403 on cross-student access, 200 on owner access).

---

### BUG-004: Mongoose Map Rejection of Dotted Variable Keys in `GeneratedDocument`
- **Affected File:** `lib/models/GeneratedDocument.ts`
- **Component:** Mongoose Schema (`variable_snapshot`)
- **Severity:** High
- **Description:** When generating documents from templates, variable resolvers produce namespaced keys such as `system.date`, `student.name`, and `school.contact`. Storing these in a Mongoose field defined as `type: Map, of: Schema.Types.Mixed` triggered a runtime validation crash: `Cast to Map failed for value`.
- **Root Cause:** MongoDB / Mongoose Map keys cannot contain periods (`.`) as they represent path separators in BSON.
- **Resolution:** Changed `variable_snapshot` schema definition from `Map` to plain `Schema.Types.Mixed`:
  ```typescript
  variable_snapshot: {
    type: Schema.Types.Mixed,
    default: {},
  }
  ```
- **Verification:** Verified in `tests/api/audit-complete-backend-deep.test.ts` (successfully persists snapshots with dotted keys like `system.date`).

---

### BUG-005, BUG-006, BUG-007: Unhandled CastError on Dynamic Routes
- **Affected Files:**
  - `app/api/documents/generated/[id]/route.ts` (GET, PATCH, DELETE)
  - `app/api/subject-assignment/[id]/route.ts` (PUT, DELETE)
  - `app/api/subject-master/[id]/route.ts` (GET, PUT, DELETE)
- **Severity:** High
- **Description:** Requesting or updating records with non-hexadecimal or malformed IDs caused uncaught 500 `CastError: Cast to ObjectId failed` exceptions.
- **Root Cause:** Lack of upfront ObjectId validity check before executing Mongoose queries.
- **Resolution:** Added `if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });` across all handlers.
- **Verification:** Verified in `tests/api/audit-complete-backend-deep.test.ts` (all endpoints consistently return 400 Bad Request).

---

### BUG-008 & BUG-009: File Upload Validation & Path Traversal Guards
- **Affected Files:**
  - `app/api/public/upload/route.ts`
  - `app/api/upload/route.ts`
- **Severity:** High
- **Description:**
  1. Upload endpoints accepted 0-byte empty files without returning an error, causing blank media records.
  2. Potential path traversal risks via filenames containing `..` or dangerous executable file extensions (`.exe`, `.sh`, `.bat`, `.php`).
- **Resolution:**
  1. Added zero-byte file rejection (`file.size === 0`).
  2. Added filename sanitization, blocking directory traversal patterns (`..`) and rejecting executable/script MIME-types and extensions.
- **Verification:** Verified in `tests/api/audit-complete-backend-deep.test.ts` and `tests/api/upload-deep.test.ts`.

---

### BUG-010: Student/Parent Role Authorization Bypass in Report Endpoints
- **Affected Files:**
  - `app/api/reports/class/[id]/route.ts`
  - `app/api/reports/student/[id]/route.ts`
  - `app/api/reports/teacher/[id]/route.ts`
- **Severity:** Critical
- **Description:** Student and parent accounts could access bulk class reports or arbitrary student/teacher performance metrics through direct URL access.
- **Resolution:** Added explicit role validation:
  1. Blocked `student` and `parent` roles with `403 Forbidden` on class and teacher reports.
  2. Restricted `teacher` role to viewing only their assigned classes and students.
  3. Added ObjectId validation to prevent CastErrors.
- **Verification:** Verified in `tests/api/reports-deep.test.ts` (returns 403 on unauthorized role access).

---
*End of Bug Register. All 10 bugs are fully resolved.*
