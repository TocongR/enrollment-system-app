// src/components/AdminDashboard.jsx
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import {
  doc, getDoc, collection, query, where,
  getDocs, updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import ManageClassAssignments from "./ManageClassAssignments";
import ManageStudents from "./ManageStudents";
import EnrollmentPeriod from "./EnrollmentPeriod";

const NAVY = "#1a3a6b";
const GOLD = "#f0c040";

const AdminDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [dropRequests, setDropRequests] = useState([]);
  const [pendingEnrollments, setPendingEnrollments] = useState([]);
  const [approvedEnrollments, setApprovedEnrollments] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("1st Sem 2024-2025");
  const [selectedProgram, setSelectedProgram] = useState("all");
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [allPrograms, setAllPrograms] = useState([]);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) setUserData(userDoc.data());

      const progSnap = await getDocs(collection(db, "programs"));
      setAllPrograms(progSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const assignSnap = await getDocs(collection(db, "classAssignments"));
      const sems = new Set();
      assignSnap.docs.forEach(d => sems.add(d.data().semester));
      setAvailableSemesters(Array.from(sems).sort().reverse());

      const [pendingSnap, approvedSnap, dropSnap, studentsSnap, coursesSnap] = await Promise.all([
        getDocs(query(collection(db, "enrollments"), where("status", "==", "pending"), where("semester", "==", selectedSemester))),
        getDocs(query(collection(db, "enrollments"), where("status", "==", "enrolled"), where("semester", "==", selectedSemester))),
        getDocs(query(collection(db, "enrollments"), where("status", "==", "drop-requested"), where("semester", "==", selectedSemester))),
        getDocs(query(collection(db, "users"), where("role", "==", "student"))),
        getDocs(query(collection(db, "classAssignments"), where("semester", "==", selectedSemester))),
      ]);

      setPendingEnrollments(pendingSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setApprovedEnrollments(approvedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDropRequests(dropSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAllStudents(studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAllCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [currentUser, selectedSemester]);

  useEffect(() => { if (currentUser && selectedSemester) fetchData(); }, [fetchData, selectedSemester, currentUser]);

  const handleLogout = async () => { await logout(); navigate("/"); };

  const approveEnrollment = async (id) => {
    try {
      await updateDoc(doc(db, "enrollments", id), { status: "enrolled", approvedBy: userData.studentId, approvedAt: new Date() });
      fetchData();
    } catch (e) { alert("Error approving enrollment"); }
  };

  const rejectEnrollment = async (id) => {
    if (!window.confirm("Reject this enrollment?")) return;
    try {
      await updateDoc(doc(db, "enrollments", id), { status: "rejected", rejectedBy: userData.studentId, rejectedAt: new Date() });
      fetchData();
    } catch (e) { alert("Error rejecting enrollment"); }
  };

  const dropEnrollment = async (id) => {
    if (!window.confirm("Drop this enrollment?")) return;
    try {
      await updateDoc(doc(db, "enrollments", id), { status: "dropped", droppedBy: userData.studentId, droppedAt: new Date() });
      fetchData();
    } catch (e) { alert("Error dropping enrollment"); }
  };

  const approveDropRequest = async (id) => {
    if (!window.confirm("Approve this drop request?")) return;
    try {
      await updateDoc(doc(db, "enrollments", id), { status: "dropped", droppedBy: userData.studentId, droppedAt: new Date() });
      fetchData();
    } catch (e) { alert("Error approving drop"); }
  };

  const rejectDropRequest = async (id) => {
    if (!window.confirm("Reject drop request? Student will remain enrolled.")) return;
    try {
      await updateDoc(doc(db, "enrollments", id), { status: "enrolled", dropReason: null, dropRequestedAt: null });
      fetchData();
    } catch (e) { alert("Error rejecting drop"); }
  };

  const filterByProgram = (list) =>
    selectedProgram === "all" ? list : list.filter(e => e.programId === selectedProgram);

  const filteredPending = filterByProgram(pendingEnrollments);
  const filteredApproved = filterByProgram(approvedEnrollments);
  const filteredDrops = filterByProgram(dropRequests);

  const getEnrollmentsByCourse = () => {
    const map = {};
    approvedEnrollments.forEach(e => {
      if (!map[e.courseCode]) map[e.courseCode] = { courseCode: e.courseCode, courseTitle: e.courseTitle, count: 0 };
      map[e.courseCode].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  };

  const tabs = [
    { key: "pending",      label: `Pending (${filteredPending.length})` },
    { key: "drop-requests",label: `Drop Requests (${filteredDrops.length})` },
    { key: "approved",     label: `Approved (${filteredApproved.length})` },
    { key: "overview",     label: "Course Overview" },
    { key: "assignments",  label: "Manage Classes" },
    { key: "students",     label: "Manage Students" },
    { key: "period",       label: "Enrollment Period" },
  ];

  const stats = [
    { label: "Total Students",    value: allStudents.length },
    { label: "Active Courses",    value: allCourses.length },
    { label: "Pending",           value: filteredPending.length, warn: true },
    { label: "Enrolled",          value: filteredApproved.length, success: true },
    { label: "Drop Requests",     value: filteredDrops.length, danger: true },
  ];

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: "#f5f7fa" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: `${NAVY} transparent ${NAVY} ${NAVY}` }} />
        <p className="text-sm text-gray-500">Loading admin portal…</p>
      </div>
    </div>
  );

  // Table shared styles
  const thClass = "px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide";
  const tdClass = "px-4 py-3 text-sm text-gray-700";

  return (
    <div className="min-h-screen" style={{ background: "#f5f7fa", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-3 shadow-sm sticky top-0 z-40" style={{ background: NAVY }}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm px-2.5 py-1 rounded-md" style={{ background: GOLD, color: NAVY, fontFamily: "'Sora', sans-serif" }}>ENROLL</span>
          <span className="text-white/60 text-sm hidden sm:block">Admin Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white text-sm font-medium hidden sm:block">{userData?.fullName}</span>
          <button onClick={handleLogout}
            className="text-sm font-semibold px-4 py-1.5 rounded-full border transition hover:bg-white/10"
            style={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}>
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Profile + semester */}
        <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: NAVY }}>
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shrink-0"
              style={{ background: GOLD, color: NAVY }}>
              {userData?.fullName?.charAt(0) ?? "A"}
            </div>
            <div className="text-white flex-1">
              <h1 className="text-xl font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>
                Welcome, {userData?.fullName}!
              </h1>
              <p className="text-white/60 text-sm mt-0.5">Admin ID: {userData?.studentId}</p>
            </div>
            <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}
              className="text-sm rounded-lg px-3 py-2 border-0 outline-none cursor-pointer font-medium"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
              {availableSemesters.map(s => <option key={s} value={s} style={{ color: NAVY }}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 text-center">
              <p className="text-3xl font-bold" style={{
                fontFamily: "'Sora', sans-serif",
                color: s.warn ? "#d97706" : s.success ? "#16a34a" : s.danger ? "#dc2626" : NAVY
              }}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Program</label>
            <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" style={{ color: "#374151" }}>
              <option value="all">All Programs</option>
              {allPrograms.map(p => <option key={p.id} value={p.code}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          {selectedProgram !== "all" && (
            <button onClick={() => setSelectedProgram("all")}
              className="text-sm font-semibold px-4 py-2 rounded-lg border transition hover:bg-gray-50"
              style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>
              Clear
            </button>
          )}
        </div>

        {/* Tabs — scrollable on mobile */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1 flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="shrink-0 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
              style={activeTab === t.key
                ? { background: NAVY, color: "#fff" }
                : { background: "transparent", color: "#6b7280" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PENDING TAB ── */}
        {activeTab === "pending" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-500">Pending Enrollment Requests</p>
            </div>
            {filteredPending.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">No pending enrollment requests.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-100 bg-gray-50/60">
                    <tr>
                      {["Student ID", "Name", "Course", "Program", "Professor", "Requested", "Actions"].map(h => (
                        <th key={h} className={thClass}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredPending.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className={tdClass}>{e.studentId}</td>
                        <td className={tdClass + " font-medium"}>{e.studentName}</td>
                        <td className={tdClass}>
                          <span className="font-semibold text-gray-900">{e.courseCode}</span>
                          <br /><span className="text-xs text-gray-400">{e.courseTitle}</span>
                        </td>
                        <td className={tdClass}>{e.programId}-{e.yearLevel}{e.section}</td>
                        <td className={tdClass}>{e.professorName}</td>
                        <td className={tdClass + " text-xs text-gray-400"}>
                          {new Date(e.requestedAt.seconds * 1000).toLocaleDateString()}
                        </td>
                        <td className={tdClass}>
                          <div className="flex gap-2">
                            <button onClick={() => approveEnrollment(e.id)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-full transition"
                              style={{ background: "#dcfce7", color: "#16a34a" }}>
                              Approve
                            </button>
                            <button onClick={() => rejectEnrollment(e.id)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-full transition"
                              style={{ background: "#fee2e2", color: "#dc2626" }}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── DROP REQUESTS TAB ── */}
        {activeTab === "drop-requests" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-500">Drop Requests</p>
            </div>
            {filteredDrops.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">No drop requests at this time.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-100 bg-gray-50/60">
                    <tr>
                      {["Student ID", "Name", "Course", "Program", "Reason", "Requested", "Actions"].map(h => (
                        <th key={h} className={thClass}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredDrops.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className={tdClass}>{r.studentId}</td>
                        <td className={tdClass + " font-medium"}>{r.studentName}</td>
                        <td className={tdClass}>
                          <span className="font-semibold text-gray-900">{r.courseCode}</span>
                          <br /><span className="text-xs text-gray-400">{r.courseTitle}</span>
                        </td>
                        <td className={tdClass}>{r.programId}-{r.yearLevel}{r.section}</td>
                        <td className={tdClass}>
                          <p className="text-xs text-gray-500 max-w-[200px] line-clamp-2">{r.dropReason}</p>
                        </td>
                        <td className={tdClass + " text-xs text-gray-400"}>
                          {new Date(r.dropRequestedAt.seconds * 1000).toLocaleDateString()}
                        </td>
                        <td className={tdClass}>
                          <div className="flex gap-2">
                            <button onClick={() => approveDropRequest(r.id)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-full transition"
                              style={{ background: "#dcfce7", color: "#16a34a" }}>
                              Approve
                            </button>
                            <button onClick={() => rejectDropRequest(r.id)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-full transition"
                              style={{ background: "#fee2e2", color: "#dc2626" }}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── APPROVED TAB ── */}
        {activeTab === "approved" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-500">Approved Enrollments</p>
            </div>
            {filteredApproved.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">No approved enrollments yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-100 bg-gray-50/60">
                    <tr>
                      {["Student ID", "Name", "Course", "Program", "Professor", "Status", "Actions"].map(h => (
                        <th key={h} className={thClass}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredApproved.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className={tdClass}>{e.studentId}</td>
                        <td className={tdClass + " font-medium"}>{e.studentName}</td>
                        <td className={tdClass}>
                          <span className="font-semibold text-gray-900">{e.courseCode}</span>
                          <br /><span className="text-xs text-gray-400">{e.courseTitle}</span>
                        </td>
                        <td className={tdClass}>{e.programId}-{e.yearLevel}{e.section}</td>
                        <td className={tdClass}>{e.professorName}</td>
                        <td className={tdClass}>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">Enrolled</span>
                        </td>
                        <td className={tdClass}>
                          <button onClick={() => dropEnrollment(e.id)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full border transition hover:bg-red-50"
                            style={{ borderColor: "#fca5a5", color: "#dc2626" }}>
                            Drop
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── COURSE OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          getEnrollmentsByCourse().length === 0 ? (
            <div className="bg-white rounded-2xl px-6 py-10 text-center text-gray-400 shadow-sm border border-gray-100 text-sm">
              No enrollments yet.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getEnrollmentsByCourse().map((course, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50" style={{ background: `${NAVY}08` }}>
                    <span className="font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>{course.courseCode}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{course.courseTitle}</p>
                  </div>
                  <div className="px-5 py-4 flex items-center gap-3">
                    <span className="text-4xl font-bold" style={{ color: NAVY, fontFamily: "'Sora', sans-serif" }}>{course.count}</span>
                    <span className="text-sm text-gray-400">students enrolled</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── DELEGATED TABS ── */}
        {activeTab === "assignments" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <ManageClassAssignments />
          </div>
        )}
        {activeTab === "students" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <ManageStudents />
          </div>
        )}
        {activeTab === "period" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <EnrollmentPeriod />
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;