// src/components/ProfessorDashboard.jsx
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const NAVY = "#1a3a6b";
const GOLD = "#f0c040";

const ProfessorDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [myClasses, setMyClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [availablePrograms, setAvailablePrograms] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);

  // No external deps — safe with empty array
  const fetchFilters = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'classAssignments'));
      const sems = new Set();
      snap.docs.forEach(d => sems.add(d.data().semester));
      const semsArr = Array.from(sems).sort().reverse();
      setAvailableSemesters(semsArr);
      setSelectedSemester(prev => prev || (semsArr.length > 0 ? semsArr[0] : ''));

      const progSnap = await getDocs(collection(db, 'programs'));
      setAvailablePrograms(progSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  }, []);

  // Depends on currentUser and selectedSemester — must be listed
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);

        const snap = await getDocs(query(
          collection(db, 'classAssignments'),
          where('professorId', '==', data.studentId),
          where('semester', '==', selectedSemester)
        ));
        const classes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMyClasses(classes);

        const uniqueCourses = [...new Map(classes.map(c =>
          [c.courseCode, { code: c.courseCode, title: c.courseTitle }]
        )).values()];
        setAvailableCourses(uniqueCourses);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [currentUser, selectedSemester]);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);
  useEffect(() => { if (currentUser && selectedSemester) fetchData(); }, [currentUser, selectedSemester, fetchData]);

  const handleLogout = async () => { await logout(); navigate('/'); };

  const viewStudents = async (classData) => {
    setSelectedClass(classData);
    const snap = await getDocs(query(
      collection(db, 'enrollments'),
      where('classAssignmentId', '==', classData.id),
      where('status', '==', 'enrolled')
    ));
    console.log(classData)
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => a.studentId.localeCompare(b.studentId));
    setStudents(list);
  };

  const closeStudentList = () => { setSelectedClass(null); setStudents([]); setSearchTerm(''); };

  const getFilteredClasses = () => myClasses.filter(c => {
    const matchProg = selectedProgram === 'all' || c.programId === selectedProgram;
    const matchCourse = selectedCourse === 'all' || c.courseCode === selectedCourse;
    return matchProg && matchCourse;
  });

  const getTotalUnits = () => getFilteredClasses().reduce((t, c) => t + c.units, 0);

  const getClassesByCourse = () => {
    const grouped = {};
    getFilteredClasses().forEach(c => {
      if (!grouped[c.courseCode]) grouped[c.courseCode] = { courseCode: c.courseCode, courseTitle: c.courseTitle, units: c.units, sections: [] };
      grouped[c.courseCode].sections.push(c);
    });
    return Object.values(grouped);
  };

  const getFilteredStudents = () => !searchTerm ? students : students.filter(s =>
    s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    if (!students.length) return;
    const headers = ['Student ID', 'Student Name', 'Program', 'Year-Section'];
    const rows = students.map(s => [s.studentId, s.studentName, s.programId, `${s.yearLevel}${s.section}`]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `${selectedClass.courseCode}-${selectedClass.programId}${selectedClass.yearLevel}${selectedClass.section}-students.csv`
    });
    a.click();
  };

  const printStudentList = () => {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Class List</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#1a3a6b;border-bottom:2px solid #1a3a6b;padding-bottom:10px}
      table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:12px;text-align:left}
      th{background:#1a3a6b;color:#fff}tr:nth-child(even){background:#f5f7fa}@media print{button{display:none}}</style>
      </head><body>
      <h1>${selectedClass.courseCode} — ${selectedClass.courseTitle}</h1>
      <p><strong>Section:</strong> ${selectedClass.programId}-${selectedClass.yearLevel}${selectedClass.section}</p>
      <p><strong>Professor:</strong> ${userData.fullName}</p>
      <p><strong>Semester:</strong> ${selectedSemester}</p>
      <p><strong>Total Students:</strong> ${students.length}</p>
      <table><thead><tr><th>#</th><th>Student ID</th><th>Name</th><th>Program</th><th>Year-Sec</th></tr></thead>
      <tbody>${students.map((s, i) => `<tr><td>${i + 1}</td><td>${s.studentId}</td><td>${s.studentName}</td><td>${s.programId}</td><td>${s.yearLevel}${s.section}</td></tr>`).join('')}</tbody>
      </table><button onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#1a3a6b;color:#fff;border:none;border-radius:5px;cursor:pointer">Print</button>
      </body></html>`);
    w.document.close();
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: "#f5f7fa" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${NAVY} transparent ${NAVY} ${NAVY}` }} />
        <p className="text-sm text-gray-500">Loading your portal…</p>
      </div>
    </div>
  );

  const filtered = getFilteredClasses();
  const byCourse = getClassesByCourse();
  const hasActiveFilters = selectedProgram !== 'all' || selectedCourse !== 'all';

  return (
    <div className="min-h-screen" style={{ background: "#f5f7fa", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-3 shadow-sm" style={{ background: NAVY }}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm px-2.5 py-1 rounded-md" style={{ background: GOLD, color: NAVY, fontFamily: "'Sora', sans-serif" }}>ENROLL</span>
          <span className="text-white/60 text-sm hidden sm:block">Professor Portal</span>
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
              {userData?.fullName?.charAt(0) ?? "P"}
            </div>
            <div className="text-white flex-1">
              <h1 className="text-xl font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>Welcome, {userData?.fullName}!</h1>
              <p className="text-white/60 text-sm mt-0.5">Professor ID: {userData?.studentId}</p>
            </div>
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

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Classes", value: filtered.length },
            { label: "Total Units", value: getTotalUnits() },
            { label: "Unique Courses", value: byCourse.length },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 text-center">
              <p className="text-3xl font-bold" style={{ color: NAVY, fontFamily: "'Sora', sans-serif" }}>{s.value}</p>
              <p className="text-sm text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <div className="flex flex-wrap gap-3 items-end">
            {[
              {
                label: "Program", value: selectedProgram, onChange: e => setSelectedProgram(e.target.value),
                options: [{ value: "all", label: "All Programs" }, ...availablePrograms.map(p => ({ value: p.code, label: p.code }))]
              },
              {
                label: "Course", value: selectedCourse, onChange: e => setSelectedCourse(e.target.value),
                options: [{ value: "all", label: "All Courses" }, ...availableCourses.map(c => ({ value: c.code, label: `${c.code} — ${c.title}` }))]
              },
            ].map(f => (
              <div key={f.label} className="flex flex-col gap-1 min-w-[160px]">
                <label className="text-xs text-gray-400 font-medium">{f.label}</label>
                <select
                  value={f.value}
                  onChange={f.onChange}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ color: "#374151" }}
                >
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
            {hasActiveFilters && (
              <button
                onClick={() => { setSelectedProgram('all'); setSelectedCourse('all'); }}
                className="text-sm font-semibold px-4 py-2 rounded-lg border transition hover:bg-gray-50"
                style={{ borderColor: "#e5e7eb", color: "#6b7280" }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {[
            { key: "overview", label: `My Classes (${filtered.length})` },
            { key: "schedule", label: `By Course (${byCourse.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all"
              style={activeTab === t.key ? { background: NAVY, color: "#fff" } : { background: "transparent", color: "#6b7280" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          filtered.length === 0 ? (
            <div className="bg-white rounded-2xl px-6 py-10 text-center text-gray-400 shadow-sm border border-gray-100">
              No classes found with the selected filters.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map(c => (
                <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>{c.courseCode}</span>
                      <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${GOLD}33`, color: NAVY }}>
                        {c.programId}-{c.yearLevel}{c.section}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{c.units} units</span>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-sm text-gray-600 mb-1">{c.courseTitle}</p>
                    <p className="text-xs text-gray-400">{c.programName}</p>
                  </div>
                  <div className="px-5 pb-4">
                    <button
                      onClick={() => viewStudents(c)}
                      className="w-full py-2 rounded-full text-sm font-semibold transition"
                      style={{ background: NAVY, color: "#fff" }}
                    >
                      View Students
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* By Course tab */}
        {activeTab === 'schedule' && (
          byCourse.length === 0 ? (
            <div className="bg-white rounded-2xl px-6 py-10 text-center text-gray-400 shadow-sm border border-gray-100">
              No courses found with the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              {byCourse.map((course, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between" style={{ background: `${NAVY}08` }}>
                    <div>
                      <span className="font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>{course.courseCode}</span>
                      <span className="ml-2 text-sm text-gray-500">— {course.courseTitle}</span>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${GOLD}33`, color: NAVY }}>
                      {course.units} units
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {course.sections.map(sec => (
                      <div key={sec.id} className="px-5 py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{sec.programId}-{sec.yearLevel}{sec.section}</p>
                          <p className="text-xs text-gray-400">{sec.programName}</p>
                        </div>
                        <button
                          onClick={() => viewStudents(sec)}
                          className="text-sm font-semibold px-4 py-1.5 rounded-full border-2 transition hover:bg-blue-50 shrink-0"
                          style={{ borderColor: NAVY, color: NAVY }}
                        >
                          View Students
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Student list modal */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

            {/* Modal header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>
                  {selectedClass.courseCode} — {selectedClass.courseTitle}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {selectedClass.programId}-{selectedClass.yearLevel}{selectedClass.section} · {students.length} student{students.length !== 1 ? 's' : ''} enrolled
                </p>
              </div>
              <button onClick={closeStudentList} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">×</button>
            </div>

            {/* Controls */}
            <div className="px-6 py-4 border-b border-gray-50 flex flex-wrap gap-3 items-center shrink-0">
              <input
                type="text"
                placeholder="Search by ID or name…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={exportToCSV}
                  className="text-sm font-semibold px-4 py-2 rounded-lg border transition hover:bg-gray-50"
                  style={{ borderColor: "#e5e7eb", color: "#374151" }}
                >
                  Export CSV
                </button>
                <button
                  onClick={printStudentList}
                  className="text-sm font-semibold px-4 py-2 rounded-lg transition"
                  style={{ background: NAVY, color: "#fff" }}
                >
                  Print List
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1">
              {students.length === 0 ? (
                <div className="px-6 py-10 text-center text-gray-400 text-sm">No students enrolled yet.</div>
              ) : (
                <>
                  <p className="px-6 pt-3 pb-1 text-xs text-gray-400">
                    Showing {getFilteredStudents().length} of {students.length} students
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                        <th className="px-6 py-2 font-medium">#</th>
                        <th className="px-6 py-2 font-medium">Student ID</th>
                        <th className="px-6 py-2 font-medium">Name</th>
                        <th className="px-6 py-2 font-medium">Program</th>
                        <th className="px-6 py-2 font-medium">Year-Sec</th>
                        <th className="px-6 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {getFilteredStudents().map((s, i) => (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                          <td className="px-6 py-3 font-medium text-gray-700">{s.studentId}</td>
                          <td className="px-6 py-3 text-gray-800">{s.studentName}</td>
                          <td className="px-6 py-3 text-gray-500">{s.programId}</td>
                          <td className="px-6 py-3 text-gray-500">{s.yearLevel}{s.section}</td>
                          <td className="px-6 py-3">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
                              Enrolled
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessorDashboard;