// src/components/ManageClassAssignments.jsx
import { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, addDoc, deleteDoc, doc
} from 'firebase/firestore';
import { db } from '../firebase/config';

const NAVY = "#1a3a6b";
const GOLD = "#f0c040";

const ManageClassAssignments = () => {
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [classAssignments, setClassAssignments] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedYear, setSelectedYear] = useState('1');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('1st Sem 2024-2025');
  const [loading, setLoading] = useState(false);
  const [filterSemester, setFilterSemester] = useState('1st Sem 2024-2025');
  const [filterProgram, setFilterProgram] = useState('all');
  const [availableSemesters, setAvailableSemesters] = useState([
    '1st Sem 2024-2025', '2nd Sem 2024-2025',
    '1st Sem 2025-2026', '2nd Sem 2025-2026'
  ]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [progSnap, courseSnap, profSnap, assignSnap] = await Promise.all([
        getDocs(collection(db, 'programs')),
        getDocs(collection(db, 'courses')),
        getDocs(query(collection(db, 'users'), where('role', '==', 'professor'))),
        getDocs(collection(db, 'classAssignments')),
      ]);
      setPrograms(progSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setProfessors(profSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const assignments = assignSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClassAssignments(assignments);
      const uniqueSems = new Set(assignments.map(a => a.semester));
      setAvailableSemesters(prev => [...new Set([...prev, ...Array.from(uniqueSems)])]);
    } catch (e) { console.error(e); }
  };

  const handleAddAssignment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const program = programs.find(p => p.id === selectedProgram);
      const course = courses.find(c => c.id === selectedCourse);
      const professor = professors.find(p => p.id === selectedProfessor);

      if (!program || !course || !professor) {
        alert('Please select all fields'); setLoading(false); return;
      }

      const exists = classAssignments.some(a =>
        a.programId === program.code && a.yearLevel === parseInt(selectedYear) &&
        a.section === selectedSection && a.courseId === course.id &&
        a.semester === selectedSemester
      );
      if (exists) { alert('This assignment already exists!'); setLoading(false); return; }

      await addDoc(collection(db, 'classAssignments'), {
        programId: program.code, programName: program.name,
        yearLevel: parseInt(selectedYear), section: selectedSection,
        semester: selectedSemester, courseId: course.id,
        courseCode: course.code, courseTitle: course.title, units: course.units,
        professorId: professor.studentId, professorName: professor.fullName,
        status: 'active', createdAt: new Date()
      });

      fetchData(); setSelectedCourse(''); setSelectedProfessor('');
    } catch (e) { alert('Error creating assignment'); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assignment? This will affect student enrollments.')) return;
    try {
      await deleteDoc(doc(db, 'classAssignments', id));
      fetchData();
    } catch (e) { alert('Error deleting assignment'); }
  };

  const getFilteredAssignments = () => classAssignments.filter(a =>
    a.semester === filterSemester && (filterProgram === 'all' || a.programId === filterProgram)
  );

  const getAssignmentsBySection = () => {
    const grouped = {};
    getFilteredAssignments().forEach(a => {
      const key = `${a.programId}-${a.yearLevel}${a.section}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(a);
    });
    return grouped;
  };

  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5";
  const selectClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 text-gray-700";

  return (
    <div className="p-6 space-y-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>
          Manage Class Assignments
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">Assign professors to courses per semester</p>
      </div>

      {/* Create form */}
      <div className="rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100" style={{ background: `${NAVY}08` }}>
          <p className="text-sm font-semibold text-gray-600">Create New Assignment</p>
        </div>
        <form onSubmit={handleAddAssignment} className="p-5 space-y-5">

          {/* Semester */}
          <div>
            <label className={labelClass}>Semester *</label>
            <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}
              className={selectClass} required>
              {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Program / Year / Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Program *</label>
              <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}
                className={selectClass} required>
                <option value="">Select Program</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Year Level *</label>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                className={selectClass} required>
                {["1","2","3","4"].map((y, i) => (
                  <option key={y} value={y}>{["1st","2nd","3rd","4th"][i]} Year</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Section *</label>
              <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
                className={selectClass} required>
                {["A","B","C","D"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Course / Professor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Course *</label>
              <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                className={selectClass} required>
                <option value="">Select Course</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.code} — {c.title} ({c.units} units)</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Professor *</label>
              <select value={selectedProfessor} onChange={e => setSelectedProfessor(e.target.value)}
                className={selectClass} required>
                <option value="">Select Professor</option>
                {professors.map(p => (
                  <option key={p.id} value={p.id}>{p.fullName} ({p.studentId})</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="px-6 py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50"
            style={{ background: NAVY, color: "#fff" }}>
            {loading ? 'Creating…' : 'Create Assignment'}
          </button>
        </form>
      </div>

      {/* Filters for existing */}
      <div className="rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100" style={{ background: `${NAVY}08` }}>
          <p className="text-sm font-semibold text-gray-600">
            Existing Assignments — {getFilteredAssignments().length} found
          </p>
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-4 items-end border-b border-gray-50">
          <div>
            <label className={labelClass}>Semester</label>
            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}
              className={selectClass} style={{ width: 'auto', minWidth: '180px' }}>
              {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Program</label>
            <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)}
              className={selectClass} style={{ width: 'auto', minWidth: '160px' }}>
              <option value="all">All Programs</option>
              {programs.map(p => <option key={p.id} value={p.code}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          {filterProgram !== 'all' && (
            <button onClick={() => setFilterProgram('all')}
              className="text-sm font-semibold px-4 py-2 rounded-lg border transition hover:bg-gray-50"
              style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>
              Clear
            </button>
          )}
        </div>

        {/* Grouped assignments */}
        {Object.keys(getAssignmentsBySection()).length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            No assignments found for the selected filters.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {Object.entries(getAssignmentsBySection()).map(([section, assignments]) => (
              <div key={section}>
                {/* Section header */}
                <div className="px-5 py-2.5 flex items-center gap-2" style={{ background: `${GOLD}18` }}>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{ background: GOLD, color: NAVY }}>
                    {section}
                  </span>
                  <span className="text-xs text-gray-400">{assignments.length} course{assignments.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Assignments in section */}
                <div className="divide-y divide-gray-50">
                  {assignments.map(a => (
                    <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900">{a.courseCode}</span>
                          <span className="text-sm text-gray-500 truncate">{a.courseTitle}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {a.units} units
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{a.professorName}</p>
                      </div>
                      <button onClick={() => handleDelete(a.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 transition"
                        style={{ background: "#fee2e2", color: "#dc2626" }}>
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageClassAssignments;