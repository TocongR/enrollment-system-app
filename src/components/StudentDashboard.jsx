// src/components/StudentDashboard.jsx
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  doc, getDoc, collection, query, where,
  getDocs, addDoc, updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

const NAVY = "#1a3a6b";
const GOLD = "#f0c040";

const Badge = ({ status }) => {
  const map = {
    enrolled:       "bg-green-100 text-green-800",
    pending:        "bg-yellow-100 text-yellow-800",
    "drop-requested": "bg-orange-100 text-orange-800",
    dropped:        "bg-red-100 text-red-800",
    rejected:       "bg-red-100 text-red-800",
  };
  const label = {
    enrolled: "Enrolled",
    pending: "Pending",
    "drop-requested": "Drop Requested",
    dropped: "Dropped",
    rejected: "Rejected",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {label[status] ?? status}
    </span>
  );
};

const StudentDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [dropReason, setDropReason] = useState("");
  const [showDropModal, setShowDropModal] = useState(false);
  const [selectedDropCourse, setSelectedDropCourse] = useState(null);
  const [enrollmentPeriodOpen, setEnrollmentPeriodOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState("1st Sem 2024-2025");
  const [activeTab, setActiveTab] = useState("enroll");
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [allAvailableCourses, setAllAvailableCourses] = useState([]);
  const [selectedAddCourse, setSelectedAddCourse] = useState("");
  const [addCourseReason, setAddCourseReason] = useState("");

  useEffect(() => { fetchAvailableSemesters(); }, []);
  useEffect(() => { if (currentUser && selectedSemester) fetchData(); }, [currentUser, selectedSemester]);

  const fetchAvailableSemesters = async () => {
    try {
      const snap = await getDocs(collection(db, "classAssignments"));
      const sems = new Set();
      snap.docs.forEach(d => sems.add(d.data().semester));
      setAvailableSemesters(Array.from(sems).sort().reverse());
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);

        const classSnap = await getDocs(query(
          collection(db, "classAssignments"),
          where("programId", "==", data.programId),
          where("yearLevel", "==", data.yearLevel),
          where("section", "==", data.section),
          where("semester", "==", selectedSemester)
        ));
        setAvailableCourses(classSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const enrollSnap = await getDocs(query(
          collection(db, "enrollments"),
          where("studentId", "==", data.studentId),
          where("semester", "==", selectedSemester)
        ));
        setEnrolledCourses(enrollSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      await checkEnrollmentPeriod();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const checkEnrollmentPeriod = async () => {
    try {
      const snap = await getDocs(collection(db, "enrollmentPeriods"));
      const now = new Date();
      const open = snap.docs.some(d => {
        const p = d.data();
        if (p.deleted || !p.isActive || p.semester !== selectedSemester) return false;
        return now >= new Date(p.startDate) && now <= new Date(p.endDate);
      });
      setEnrollmentPeriodOpen(open);
    } catch (e) { setEnrollmentPeriodOpen(false); }
  };

  const handleLogout = async () => { await logout(); navigate("/"); };

  const handleCheckboxChange = (id) => {
    setSelectedCourses(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleEnroll = async () => {
    if (!selectedCourses.length) return alert("Select at least one course.");
    setEnrolling(true);
    try {
      for (const id of selectedCourses) {
        const c = availableCourses.find(x => x.id === id);
        await addDoc(collection(db, "enrollments"), {
          studentId: userData.studentId, studentName: userData.fullName,
          classAssignmentId: id, courseId: c.courseId, courseCode: c.courseCode,
          courseTitle: c.courseTitle, units: c.units, professorId: c.professorId,
          professorName: c.professorName, programId: c.programId,
          yearLevel: c.yearLevel, section: c.section, semester: selectedSemester,
          status: "pending", requestedAt: new Date(),
        });
      }
      alert("Enrollment request submitted! Waiting for admin approval.");
      fetchData(); setSelectedCourses([]);
    } catch (e) { alert("Error submitting enrollment."); }
    setEnrolling(false);
  };

  const submitDropRequest = async () => {
    if (!dropReason.trim()) return alert("Please provide a reason.");
    try {
      await updateDoc(doc(db, "enrollments", selectedDropCourse.id), {
        status: "drop-requested", dropReason, dropRequestedAt: new Date(),
      });
      alert("Drop request submitted!");
      fetchData(); setShowDropModal(false); setDropReason(""); setSelectedDropCourse(null);
    } catch (e) { alert("Error submitting drop request."); }
  };

  const fetchAllCoursesForSemester = async () => {
    try {
      const snap = await getDocs(query(
        collection(db, "classAssignments"),
        where("programId", "==", userData.programId),
        where("section", "==", userData.section),
        where("semester", "==", selectedSemester)
      ));
      const courses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllAvailableCourses(courses.filter(c =>
        !availableCourses.some(a => a.id === c.id) &&
        !enrolledCourses.some(e => e.classAssignmentId === c.id)
      ));
    } catch (e) { console.error(e); }
  };

  const handleRequestAddCourse = async () => {
    if (!selectedAddCourse) return alert("Please select a course.");
    if (!addCourseReason.trim()) return alert("Please provide a reason.");
    try {
      const c = allAvailableCourses.find(x => x.id === selectedAddCourse);
      await addDoc(collection(db, "courseAddRequests"), {
        studentId: userData.studentId, studentName: userData.fullName,
        classAssignmentId: c.id, courseId: c.courseId, courseCode: c.courseCode,
        courseTitle: c.courseTitle, units: c.units, professorId: c.professorId,
        professorName: c.professorName, programId: c.programId,
        yearLevel: c.yearLevel, section: c.section, studentYearLevel: userData.yearLevel,
        semester: selectedSemester, reason: addCourseReason, status: "pending",
        requestedAt: new Date(),
      });
      alert("Course add request submitted!");
      setShowAddCourseModal(false); setSelectedAddCourse(""); setAddCourseReason("");
    } catch (e) { alert("Error submitting request."); }
  };

  const getEnrollmentStatus = (id) => enrolledCourses.find(e => e.classAssignmentId === id)?.status ?? null;
  const isAlreadyEnrolled = (id) => enrolledCourses.some(e => e.classAssignmentId === id);
  const getTotalUnits = () => selectedCourses.reduce((t, id) => t + (availableCourses.find(c => c.id === id)?.units ?? 0), 0);
  const getEnrolledTotalUnits = () => enrolledCourses.filter(e => e.status === "enrolled").reduce((t, e) => t + e.units, 0);
  const getFilteredEnrolledCourses = () => {
    if (activeTab === "enrolled") return enrolledCourses.filter(e => e.status === "enrolled" || e.status === "drop-requested");
    if (activeTab === "history") return enrolledCourses.filter(e => e.status === "dropped" || e.status === "rejected");
    return [];
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: "#f5f7fa" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${NAVY} transparent ${NAVY} ${NAVY}` }} />
        <p className="text-sm text-gray-500">Loading your portal…</p>
      </div>
    </div>
  );

  const tabs = [
    { key: "enroll", label: "Enroll Courses" },
    { key: "enrolled", label: `My Courses (${enrolledCourses.filter(e => e.status === "enrolled" || e.status === "drop-requested").length})` },
    { key: "history", label: "History" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#f5f7fa", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-3 shadow-sm" style={{ background: NAVY }}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm px-2.5 py-1 rounded-md" style={{ background: GOLD, color: NAVY, fontFamily: "'Sora', sans-serif" }}>ENROLL</span>
          <span className="text-white/60 text-sm hidden sm:block">Student Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white text-sm font-medium hidden sm:block">{userData?.fullName}</span>
          <button
            onClick={handleLogout}
            className="text-sm font-semibold px-4 py-1.5 rounded-full border transition hover:bg-white/10"
            style={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Profile card */}
        <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: NAVY }}>
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shrink-0" style={{ background: GOLD, color: NAVY }}>
              {userData?.fullName?.charAt(0) ?? "S"}
            </div>
            <div className="text-white flex-1">
              <h1 className="text-xl font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>Welcome, {userData?.fullName}!</h1>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1 text-sm text-white/70">
                <span><span className="text-white/50">ID</span> {userData?.studentId}</span>
                <span><span className="text-white/50">Program</span> {userData?.programName}</span>
                <span><span className="text-white/50">Year & Sec</span> {userData?.yearLevel}{userData?.section}</span>
              </div>
            </div>
            {/* Semester selector */}
            <select
              value={selectedSemester}
              onChange={e => setSelectedSemester(e.target.value)}
              className="text-sm rounded-lg px-3 py-2 border-0 outline-none cursor-pointer font-medium"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
            >
              {availableSemesters.map(s => <option key={s} value={s} style={{ color: NAVY }}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all"
              style={activeTab === t.key
                ? { background: NAVY, color: "#fff" }
                : { background: "transparent", color: "#6b7280" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ENROLL TAB ── */}
        {activeTab === "enroll" && (
          <div className="space-y-4">
            {!enrollmentPeriodOpen ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 flex gap-4 items-start">
                <svg className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                </svg>
                <div>
                  <p className="font-semibold text-amber-800">Enrollment Period is Closed</p>
                  <p className="text-sm text-amber-700 mt-0.5">Please wait for the enrollment period to open. Contact the admin for more information.</p>
                </div>
              </div>
            ) : availableCourses.length === 0 ? (
              <div className="bg-white rounded-2xl px-6 py-10 text-center text-gray-400 shadow-sm border border-gray-100">
                No courses available for this semester.
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-500">Available Courses — {selectedSemester}</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {availableCourses.map(course => {
                      const status = getEnrollmentStatus(course.id);
                      const enrolled = isAlreadyEnrolled(course.id);
                      const checked = selectedCourses.includes(course.id);
                      return (
                        <label
                          key={course.id}
                          className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors ${enrolled ? "opacity-60 cursor-default" : "hover:bg-blue-50/40"}`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 w-4 h-4 rounded cursor-pointer"
                            style={{ accentColor: NAVY }}
                            checked={checked}
                            onChange={() => !enrolled && handleCheckboxChange(course.id)}
                            disabled={enrolled}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-gray-900">{course.courseCode}</span>
                              <span className="text-gray-600 text-sm truncate">{course.courseTitle}</span>
                              {status && <Badge status={status} />}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{course.units} units · {course.professorName}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Enroll summary bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex gap-6 text-sm">
                    <span className="text-gray-500">Selected <span className="font-bold text-gray-900 ml-1">{selectedCourses.length}</span></span>
                    <span className="text-gray-500">Total Units <span className="font-bold text-gray-900 ml-1">{getTotalUnits()}</span></span>
                  </div>
                  <button
                    onClick={handleEnroll}
                    disabled={!selectedCourses.length || enrolling}
                    className="px-6 py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: NAVY, color: "#fff" }}
                  >
                    {enrolling ? "Submitting…" : "Submit Enrollment Request"}
                  </button>
                </div>

                {/* Irregular student */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Irregular student?</p>
                    <p className="text-xs text-gray-400 mt-0.5">Need a course from another year level</p>
                  </div>
                  <button
                    onClick={() => { fetchAllCoursesForSemester(); setShowAddCourseModal(true); }}
                    className="px-5 py-2 rounded-full text-sm font-semibold border-2 transition hover:bg-blue-50"
                    style={{ borderColor: NAVY, color: NAVY }}
                  >
                    Request to Add Course
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── MY COURSES TAB ── */}
        {activeTab === "enrolled" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Enrolled Courses — {selectedSemester}</p>
              <span className="text-sm font-bold" style={{ color: NAVY }}>Total Units: {getEnrolledTotalUnits()}</span>
            </div>
            {getFilteredEnrolledCourses().length === 0 ? (
              <div className="bg-white rounded-2xl px-6 py-10 text-center text-gray-400 shadow-sm border border-gray-100">
                You are not enrolled in any courses for this semester.
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {getFilteredEnrolledCourses().map(enrollment => (
                  <div key={enrollment.id} className="px-5 py-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">{enrollment.courseCode}</span>
                        <span className="text-gray-600 text-sm">{enrollment.courseTitle}</span>
                        <Badge status={enrollment.status} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{enrollment.units} units · {enrollment.professorName}</p>
                      {enrollment.status === "drop-requested" && (
                        <p className="text-xs text-orange-600 mt-1">Reason: {enrollment.dropReason}</p>
                      )}
                    </div>
                    {enrollment.status === "enrolled" && (
                      <button
                        onClick={() => { setSelectedDropCourse(enrollment); setShowDropModal(true); }}
                        className="text-xs font-semibold px-4 py-1.5 rounded-full border transition hover:bg-red-50"
                        style={{ borderColor: "#ef4444", color: "#ef4444" }}
                      >
                        Request Drop
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Enrollment History — {selectedSemester}</p>
            {getFilteredEnrolledCourses().length === 0 ? (
              <div className="bg-white rounded-2xl px-6 py-10 text-center text-gray-400 shadow-sm border border-gray-100">
                No enrollment history for this semester.
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {getFilteredEnrolledCourses().map(enrollment => (
                  <div key={enrollment.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">{enrollment.courseCode}</span>
                      <span className="text-gray-600 text-sm">{enrollment.courseTitle}</span>
                      <Badge status={enrollment.status} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{enrollment.units} units · {enrollment.professorName}</p>
                    {enrollment.dropReason && (
                      <p className="text-xs text-gray-500 mt-1">Drop reason: {enrollment.dropReason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DROP MODAL ── */}
      {showDropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>Request to Drop Course</h2>
              <button onClick={() => { setShowDropModal(false); setDropReason(""); setSelectedDropCourse(null); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl p-4" style={{ background: "#f5f7fa" }}>
                <p className="font-semibold text-gray-800">{selectedDropCourse?.courseCode} — {selectedDropCourse?.courseTitle}</p>
                <p className="text-sm text-gray-500 mt-0.5">{selectedDropCourse?.professorName}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5 font-medium">Reason for dropping *</label>
                <textarea
                  value={dropReason}
                  onChange={e => setDropReason(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 resize-none"
                  style={{ "--tw-ring-color": NAVY }}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowDropModal(false); setDropReason(""); setSelectedDropCourse(null); }} className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                <button onClick={submitDropRequest} className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition" style={{ background: "#ef4444" }}>Submit Drop Request</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD COURSE MODAL ── */}
      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>Add Course (Irregular)</h2>
              <button onClick={() => setShowAddCourseModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-500">Select a course from another year level that you need to take:</p>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5 font-medium">Select Course *</label>
                <select
                  value={selectedAddCourse}
                  onChange={e => setSelectedAddCourse(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2"
                >
                  <option value="">— Select a course —</option>
                  {allAvailableCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.courseCode} — {c.courseTitle} (Year {c.yearLevel}, {c.units} units)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5 font-medium">Reason *</label>
                <textarea
                  value={addCourseReason}
                  onChange={e => setAddCourseReason(e.target.value)}
                  rows={4}
                  placeholder="e.g. Failed this course last year, transferee completing requirements…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAddCourseModal(false)} className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                <button onClick={handleRequestAddCourse} className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition" style={{ background: NAVY }}>Submit Request</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;