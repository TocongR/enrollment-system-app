# Enrollment System Feature Enhancement Plan

A comprehensive plan to add prerequisites, rejection history, confirmation dialogs, sidebar navigation, sorting, search filters, course/professor management, and student editing to the enrollment system.

## User Review Required

> [!IMPORTANT]
> **Prerequisite Data Model**: I plan to add a `prerequisites` array field to the `courses` collection in Firestore (e.g., `prerequisites: ["PROG101", "MATH101"]`). The prerequisite indicator will show on the student's Enroll Courses tab per course. Does this approach work, or do you want prerequisites defined differently?

> [!IMPORTANT]
> **Professor Accounts**: For newly created professors (item #11), I'll create Firebase Auth accounts with the pattern `PROF-XXXX@enrollment.system` (same as existing). The admin sets the initial password. Confirm this is acceptable?

> [!WARNING]
> **Rejection History Details**: When a professor/admin rejects an enrollment or drop request, I'll store a `rejectionReason` field (optional text input in the confirmation dialog). The History tab will show both "rejected" enrollments and "drop-rejected" entries (where drop was denied and student remains enrolled). Currently when a drop is rejected, the `dropReason` is nullified — I'll preserve it and add a `dropRejectedAt` timestamp instead so history is maintained.

## Open Questions

> [!IMPORTANT]
> **Q1**: For the admin sidebar/burger menu — should the sidebar be present on ALL screen sizes (with the burger icon toggling it), or only show the burger icon on smaller screens while the sidebar is always visible on desktop?

> [!IMPORTANT]
> **Q2**: For the "Manage Courses" tab (#9), should the admin be able to set prerequisites from this tab (linking courses together), or should prerequisites be managed separately?

> [!IMPORTANT]  
> **Q3**: For item #7 — "the bottom part details of recorded enrollment period fades" — do you mean a CSS fade-out gradient at the bottom of each enrollment period card (like a visual truncation effect), or that the "Last auto-update" text should have a fade-in/fade-out animation?

---

## Proposed Changes

### 1. Shared Confirmation Dialog Component

A reusable `ConfirmDialog` component used across all dashboards for any destructive/important action.

#### [NEW] [ConfirmDialog.jsx](file:///d:/codex/Projects/Tocong%20Student%20Enrollment/src/components/ConfirmDialog.jsx)
- Modal dialog with title, message, confirm/cancel buttons
- Supports optional reason input (for rejections)
- Styled consistently with the existing design system (NAVY/GOLD theme)
- Props: `isOpen`, `title`, `message`, `onConfirm`, `onCancel`, `confirmLabel`, `cancelLabel`, `danger`, `showReasonInput`

---

### 2. Toast/Notification Component

A floating success/error notification for feedback after actions (e.g., "Class assignment created successfully").

#### [NEW] [Toast.jsx](file:///d:/codex/Projects/Tocong%20Student%20Enrollment/src/components/Toast.jsx)
- Auto-dismissing floating notification
- Success/error/info variants
- Slides in from top-right, auto-closes after 3 seconds

---

### 3. Student Dashboard Changes

#### [MODIFY] [StudentDashboard.jsx](file:///d:/codex/Projects/Tocong%20Student%20Enrollment/src/components/StudentDashboard.jsx)

**Prerequisite Indicator (Item S.1)**:
- Fetch `courses` collection to get prerequisite data
- Show prerequisite badges/tags below each course in the Available Courses list
- Visual indicator: small tag like `Prereq: PROG101, MATH101` under each course

**Rejection History in History Tab (Item S.2)**:
- Modify `getFilteredEnrolledCourses` for history to include:
  - `status === "rejected"` (enrollment rejected) — already partially there
  - Enrollments where drop was rejected (`dropRejectedAt` exists, status back to `enrolled`)
- Show rejection reason and timestamp in history cards
- Fetch a separate `rejectionHistory` from enrollment docs that have rejection metadata

**Confirmation Dialogs (Item S.3)**:
- Replace `alert()` calls with `ConfirmDialog`
- Add confirmation before:
  - Submitting enrollment request (`handleEnroll`)
  - Submitting drop request (`submitDropRequest`)
  - Requesting to add course (`handleRequestAddCourse`)

---

### 4. Admin Dashboard — Sidebar & Navigation Overhaul

#### [MODIFY] [AdminDashboard.jsx](file:///d:/codex/Projects/Tocong%20Student%20Enrollment/src/components/AdminDashboard.jsx)

**Burger Menu & Sidebar (Item A.2)**:
- Add a hamburger icon (☰) on the left side of the navbar
- Clicking it toggles a side panel (~280px width) that slides in from the left
- Sidebar contains navigation links: Dashboard (Home), Pending, Drop Requests, Approved, Course Overview, Manage Classes, Manage Students, Enrollment Period, **Manage Courses** (new), **Manage Professors** (new)
- Does NOT cover the whole page — pushes or overlays with partial width
- Remove the horizontal tabs bar (replaced by sidebar navigation)

**Dashboard/Home View (Item A.2.2, A.2.3)**:
- New default view showing stat cards (Total Students, Active Courses, Pending, Enrolled, Drop Requests)
- Course Overview grid moved to be part of the dashboard view

**Confirmation Dialogs (Item A.1)**:
- Replace all `window.confirm()` and `alert()` calls with `ConfirmDialog`
- Add confirmation before:
  - Approving/rejecting enrollments
  - Dropping enrollments
  - Approving/rejecting drop requests
  - Deleting students, class assignments, enrollment periods
  - Toggling enrollment period active/inactive

**Sorting Feature (Item A.3)**:
- Add sortable column headers for Pending, Drop Requests, and Approved tables
- Sort by: Student ID, Name, Course, Program, Date (ascending/descending)
- Visual sort indicator (▲/▼) on active column

---

### 5. Manage Class Assignments Updates

#### [MODIFY] [ManageClassAssignments.jsx](file:///d:/codex/Projects/Tocong%20Student%20Enrollment/src/components/ManageClassAssignments.jsx)

**Collapsible Create Form (Item A.4)**:
- Add "+ Add Class Assignment" toggle button (same style as ManageStudents)
- Create form starts hidden, toggles open/closed

**Enhanced Search Filters (Item A.5)**:
- Add search input that filters by professor name AND subject code/title
- Program filter: when set to a specific program, show Year and Section filters
- Year and Section filters have "✕" clear buttons
- Clear all filters button

**Success Toast (Item A.8)**:
- After successfully adding a class assignment, show a toast notification
- Auto-close the create form after success

**Confirmation Dialogs**:
- Replace `window.confirm()` for delete with `ConfirmDialog`

---

### 6. Enrollment Period Updates

#### [MODIFY] [EnrollmentPeriod.jsx](file:///d:/codex/Projects/Tocong%20Student%20Enrollment/src/components/EnrollmentPeriod.jsx)

**Collapsible Create Form (Item A.6)**:
- Add "+ Add Enrollment Period" toggle button
- Create form starts hidden, toggles open/closed

**Fade Effect on Period Details (Item A.7)**:
- Add a CSS gradient fade-out effect at the bottom of each enrollment period card's detail section
- The "Last auto-update" text and bottom details will have a subtle fade

**Confirmation Dialogs**:
- Replace `window.confirm()` for delete/toggle with `ConfirmDialog`

---

### 7. Manage Students Updates

#### [MODIFY] [ManageStudents.jsx](file:///d:/codex/Projects/Tocong%20Student%20Enrollment/src/components/ManageStudents.jsx)

**Edit Student Information (Item A.10)**:
- Add "Edit" button next to each student row
- Opens an edit modal/inline form pre-filled with current data
- Editable fields: Full Name, Program, Year Level, Section
- Uses `updateDoc` to save changes to Firestore

**Confirmation Dialogs**:
- Replace `window.confirm()` for delete with `ConfirmDialog`

---

### 8. New — Manage Courses Tab

#### [NEW] [ManageCourses.jsx](file:///d:/codex/Projects/Tocong%20Student%20Enrollment/src/components/ManageCourses.jsx)

**Course Management (Item A.9)**:
- View all courses in a table/card layout
- Add new course form (collapsible): Code, Title, Units, Description, Prerequisites (multi-select from existing courses)
- Edit existing course via edit button → opens edit form
- Delete course with confirmation
- Search/filter by course code or title

---

### 9. New — Manage Professors Tab

#### [NEW] [ManageProfessors.jsx](file:///d:/codex/Projects/Tocong%20Student%20Enrollment/src/components/ManageProfessors.jsx)

**Professor Management (Item A.11)**:
- View all professors in a table
- Add new professor form (collapsible): Professor ID, Full Name, Initial Password
- Creates Firebase Auth account (`PROFID@enrollment.system`) + Firestore user doc with `role: "professor"`
- Edit existing professor info (Full Name)
- Delete professor with confirmation
- Search/filter by name or ID

---

### 10. CSS Updates

#### [MODIFY] [index.css](file:///d:/codex/Projects/Tocong%20Student%20Enrollment/src/index.css)
- Add sidebar transition/animation styles
- Add fade gradient styles for enrollment period cards
- Add toast animation keyframes

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify no compilation errors
- Check browser for console errors

### Manual Verification
- **Student Portal**: Verify prerequisite indicators show on courses, history tab shows rejection records, confirmation dialogs appear for enroll/drop/add-course actions
- **Admin Portal**: Verify sidebar navigation works, dashboard shows stats + course overview, sorting works on tables, all actions have confirmation dialogs, new tabs (Courses, Professors) work correctly
- **Cross-role**: Verify that admin rejection adds proper history visible to student, professor rejection does the same
