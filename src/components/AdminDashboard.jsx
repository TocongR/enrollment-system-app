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
import ManageCourses from "./ManageCourses";
import ManageProfessors from "./ManageProfessors";
import ConfirmDialog from "./ConfirmDialog";
import Toast from "./Toast";

const NAVY = "#1a3a6b";
const GOLD = "#f0c040";

const AdminDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dropRequests, setDropRequests] = useState([]);
  const [pendingEnrollments, setPendingEnrollments] = useState([]);
  const [approvedEnrollments, setApprovedEnrollments] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("1st Sem 2024-2025");
  const [selectedProgram, setSelectedProgram] = useState("all");
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [allPrograms, setAllPrograms] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [toast, setToast] = useState(null);
  const [approvedFilterYear, setApprovedFilterYear] = useState('');
  const [approvedFilterSection, setApprovedFilterSection] = useState('');
  const [approvedSearch, setApprovedSearch] = useState('');

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

  const approveEnrollment = (id) => {
    setConfirmDialog({ isOpen: true, title: 'Approve Enrollment', message: 'Approve this enrollment request?',
      onConfirm: async () => { setConfirmDialog(d => ({ ...d, isOpen: false }));
        try { await updateDoc(doc(db, "enrollments", id), { status: "enrolled", approvedBy: userData.studentId, approvedAt: new Date() }); setToast({ message: 'Enrollment approved', type: 'success' }); fetchData(); } catch (e) { setToast({ message: 'Error', type: 'error' }); }
    }});
  };

  const rejectEnrollment = (id) => {
    setConfirmDialog({ isOpen: true, title: 'Reject Enrollment', message: 'Reject this enrollment? Please provide a reason.', danger: true, showReasonInput: true, reasonLabel: 'Rejection Reason',
      onConfirm: async (reason) => { setConfirmDialog(d => ({ ...d, isOpen: false }));
        try { await updateDoc(doc(db, "enrollments", id), { status: "rejected", rejectedBy: userData.studentId, rejectedAt: new Date(), rejectionReason: reason || '' }); setToast({ message: 'Enrollment rejected', type: 'success' }); fetchData(); } catch (e) { setToast({ message: 'Error', type: 'error' }); }
    }});
  };

  const dropEnrollment = (id) => {
    setConfirmDialog({ isOpen: true, title: 'Drop Enrollment', message: 'Drop this student from the course?', danger: true,
      onConfirm: async () => { setConfirmDialog(d => ({ ...d, isOpen: false }));
        try { await updateDoc(doc(db, "enrollments", id), { status: "dropped", droppedBy: userData.studentId, droppedAt: new Date() }); setToast({ message: 'Student dropped', type: 'success' }); fetchData(); } catch (e) { setToast({ message: 'Error', type: 'error' }); }
    }});
  };

  const approveDropRequest = (id) => {
    setConfirmDialog({ isOpen: true, title: 'Approve Drop Request', message: 'Approve this drop request?',
      onConfirm: async () => { setConfirmDialog(d => ({ ...d, isOpen: false }));
        try { await updateDoc(doc(db, "enrollments", id), { status: "dropped", droppedBy: userData.studentId, droppedAt: new Date() }); setToast({ message: 'Drop approved', type: 'success' }); fetchData(); } catch (e) { setToast({ message: 'Error', type: 'error' }); }
    }});
  };

  const rejectDropRequest = (id) => {
    setConfirmDialog({ isOpen: true, title: 'Reject Drop Request', message: 'Reject this drop request? Student will remain enrolled.', danger: true, showReasonInput: true, reasonLabel: 'Rejection Reason',
      onConfirm: async (reason) => { setConfirmDialog(d => ({ ...d, isOpen: false }));
        try { await updateDoc(doc(db, "enrollments", id), { status: "enrolled", dropRejectedAt: new Date(), dropRejectionReason: reason || '' }); setToast({ message: 'Drop request rejected', type: 'success' }); fetchData(); } catch (e) { setToast({ message: 'Error', type: 'error' }); }
    }});
  };

  const filterByProgram = (list) =>
    selectedProgram === "all" ? list : list.filter(e => e.programId === selectedProgram);

  const filteredPending = filterByProgram(pendingEnrollments);
  const filteredApproved = filterByProgram(approvedEnrollments);
  const filteredDrops = filterByProgram(dropRequests);




  const sortList = (list) => {
    if (!sortConfig.key) return list;
    return [...list].sort((a, b) => {
      let aVal = a[sortConfig.key] || ''; let bVal = b[sortConfig.key] || '';
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1;
      return 0;
    });
  };
  const handleSort = (key) => setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  const sortIcon = (key) => sortConfig.key === key ? (sortConfig.dir === 'asc' ? ' ▲' : ' ▼') : '';

  const tabs = [
    { key: "dashboard",    label: "Dashboard", icon: "📊" },
    { key: "pending",      label: `Pending Enrollment (${filteredPending.length})`, icon: "📋" },
    { key: "drop-requests",label: `Drop Requests (${filteredDrops.length})`, icon: "📋" },
    { key: "approved",     label: `Approved (${filteredApproved.length})`, icon: "📋" },
    { key: "assignments",  label: "Manage Classes", icon: "📚" },
    { key: "students",     label: "Manage Students", icon: "👤" },
    { key: "courses",      label: "Manage Courses", icon: "📖" },
    { key: "professors",   label: "Manage Professors", icon: "🎓" },
    { key: "period",       label: "Enrollment Period", icon: "📅" },
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
          <button onClick={() => setSidebarOpen(v => !v)} className="text-white text-xl hover:bg-white/10 p-1.5 rounded-lg transition">☰</button>
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

      {/* Sidebar overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ background: NAVY }}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <span className="font-bold text-sm px-2.5 py-1 rounded-md" style={{ background: GOLD, color: NAVY }}>ENROLL</span>
          <button onClick={() => setSidebarOpen(false)} className="text-white/60 hover:text-white text-xl">×</button>
        </div>
        <nav className="py-2">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setSidebarOpen(false); }}
              className="w-full text-left px-5 py-3 text-sm font-medium transition flex items-center gap-3"
              style={activeTab === t.key
                ? { background: 'rgba(255,255,255,0.15)', color: '#ffffff' }
                : { color: '#ffffff' }}>
              <span className="text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

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

        {/* Tabs removed - now using sidebar */}

        {/* ── DASHBOARD TAB ── */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {stats.map(s => (
                <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 text-center cursor-pointer hover:shadow-md transition"
                  onClick={() => { if (s.label === 'Pending') setActiveTab('pending'); else if (s.label === 'Enrolled') setActiveTab('approved'); else if (s.label === 'Drop Requests') setActiveTab('drop-requests'); }}>
                  <p className="text-3xl font-bold" style={{
                    fontFamily: "'Sora', sans-serif",
                    color: s.warn ? "#d97706" : s.success ? "#16a34a" : s.danger ? "#dc2626" : NAVY
                  }}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PENDING TAB ── */}
        {activeTab === "pending" && (
          <div className="space-y-4">
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
              {selectedProgram !== "all" && <button onClick={() => setSelectedProgram("all")} className="text-sm font-semibold px-4 py-2 rounded-lg border transition hover:bg-gray-50" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>Clear</button>}
            </div>
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
                      {[["studentId","Student ID"],["studentName","Name"],["courseCode","Course"],["programId","Program"],["professorName","Professor"],[null,"Requested"],[null,"Actions"]].map(([k,h]) => (
                        <th key={h} className={thClass + (k ? " cursor-pointer hover:text-gray-600" : "")} onClick={() => k && handleSort(k)}>{h}{k ? sortIcon(k) : ''}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortList(filteredPending).map(e => (
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
          </div>
        )}

        {/* ── DROP REQUESTS TAB ── */}
        {activeTab === "drop-requests" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium">Program</label>
                <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" style={{ color: "#374151" }}>
                  <option value="all">All Programs</option>
                  {allPrograms.map(p => <option key={p.id} value={p.code}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              {selectedProgram !== "all" && <button onClick={() => setSelectedProgram("all")} className="text-sm font-semibold px-4 py-2 rounded-lg border transition hover:bg-gray-50" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>Clear</button>}
            </div>
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
                      {[["studentId","Student ID"],["studentName","Name"],["courseCode","Course"],["programId","Program"],[null,"Reason"],[null,"Requested"],[null,"Actions"]].map(([k,h]) => (
                        <th key={h} className={thClass + (k ? " cursor-pointer hover:text-gray-600" : "")} onClick={() => k && handleSort(k)}>{h}{k ? sortIcon(k) : ''}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortList(filteredDrops).map(r => (
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
          </div>
        )}

        {/* ── APPROVED TAB ── */}
        {activeTab === "approved" && (() => {
          let list = filteredApproved;
          if (approvedFilterYear) list = list.filter(e => String(e.yearLevel) === approvedFilterYear);
          if (approvedFilterSection) list = list.filter(e => e.section === approvedFilterSection);
          if (approvedSearch) {
            const t = approvedSearch.toLowerCase();
            list = list.filter(e => e.studentId?.toLowerCase().includes(t) || e.studentName?.toLowerCase().includes(t));
          }
          return (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium">Search</label>
                <input type="text" placeholder="Student ID or name..." value={approvedSearch}
                  onChange={e => setApprovedSearch(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" style={{ minWidth: '180px' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium">Program</label>
                <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" style={{ color: "#374151" }}>
                  <option value="all">All Programs</option>
                  {allPrograms.map(p => <option key={p.id} value={p.code}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              {selectedProgram !== "all" && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-medium">Year</label>
                    <select value={approvedFilterYear} onChange={e => setApprovedFilterYear(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" style={{ color: "#374151" }}>
                      <option value="">All Years</option>
                      {["1","2","3","4"].map((y, i) => <option key={y} value={y}>{["1st","2nd","3rd","4th"][i]} Year</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-medium">Section</label>
                    <select value={approvedFilterSection} onChange={e => setApprovedFilterSection(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" style={{ color: "#374151" }}>
                      <option value="">All Sections</option>
                      {["A","B","C","D"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </>
              )}
              {(selectedProgram !== "all" || approvedSearch || approvedFilterYear || approvedFilterSection) && (
                <button onClick={() => { setSelectedProgram("all"); setApprovedFilterYear(''); setApprovedFilterSection(''); setApprovedSearch(''); }}
                  className="text-sm font-semibold px-4 py-2 rounded-lg border transition hover:bg-gray-50"
                  style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>Clear All</button>
              )}
            </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-500">Approved Enrollments</p>
              <p className="text-xs text-gray-400">{list.length} results</p>
            </div>
            {list.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">No approved enrollments found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-100 bg-gray-50/60">
                    <tr>
                      {[["studentId","Student ID"],["studentName","Name"],["courseCode","Course"],["programId","Program"],["professorName","Professor"],[null,"Status"],[null,"Actions"]].map(([k,h]) => (
                        <th key={h} className={thClass + (k ? " cursor-pointer hover:text-gray-600" : "")} onClick={() => k && handleSort(k)}>{h}{k ? sortIcon(k) : ''}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortList(list).map(e => (
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
                            style={{ borderColor: "#fca5a5", color: "#dc2626" }}>Drop</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
          );
        })()}

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
        {activeTab === "courses" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <ManageCourses />
          </div>
        )}
        {activeTab === "professors" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <ManageProfessors />
          </div>
        )}
        {activeTab === "period" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <EnrollmentPeriod />
          </div>
        )}

      </div>

      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message}
        danger={confirmDialog.danger} showReasonInput={confirmDialog.showReasonInput} reasonLabel={confirmDialog.reasonLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(d => ({ ...d, isOpen: false }))} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AdminDashboard;