// src/components/ManageClassAssignments.jsx
import { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';

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
  const [selectedSemester, setSelectedSemester] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [filterSemester, setFilterSemester] = useState('');
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterYear, setFilterYear] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [availableSemesters, setAvailableSemesters] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [progSnap, courseSnap, profSnap, assignSnap, periodsSnap] = await Promise.all([
        getDocs(collection(db, 'programs')),
        getDocs(collection(db, 'courses')),
        getDocs(query(collection(db, 'users'), where('role', '==', 'professor'))),
        getDocs(collection(db, 'classAssignments')),
        getDocs(collection(db, 'enrollmentPeriods')),
      ]);
      setPrograms(progSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setProfessors(profSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const assignments = assignSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClassAssignments(assignments);

      const sems = new Set();
      periodsSnap.docs.forEach(d => sems.add(d.data().semester));
      const semsArr = Array.from(sems).sort().reverse();
      setAvailableSemesters(semsArr);
      
      if (semsArr.length > 0) {
        if (!selectedSemester) setSelectedSemester(semsArr[0]);
        if (!filterSemester) setFilterSemester(semsArr[0]);
      }
    } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setSelectedProgram(''); setSelectedYear('1'); setSelectedSection('A');
    setSelectedCourse(''); setSelectedProfessor(''); 
    if (availableSemesters.length > 0) {
      setSelectedSemester(availableSemesters[0]);
    }
    setEditingAssignment(null);
  };

  const handleAddAssignment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const program = programs.find(p => p.id === selectedProgram);
      const course = courses.find(c => c.id === selectedCourse);
      const professor = professors.find(p => p.id === selectedProfessor);

      if (!program || !course || !professor) {
        setToast({ message: 'Please select all fields', type: 'error' }); setLoading(false); return;
      }

      const exists = classAssignments.some(a =>
        a.programId === program.code && a.yearLevel === parseInt(selectedYear) &&
        a.section === selectedSection && a.courseId === course.id &&
        a.semester === selectedSemester
      );
      if (exists) { setToast({ message: 'This assignment already exists!', type: 'error' }); setLoading(false); return; }

      await addDoc(collection(db, 'classAssignments'), {
        programId: program.code, programName: program.name,
        yearLevel: parseInt(selectedYear), section: selectedSection,
        semester: selectedSemester, courseId: course.id,
        courseCode: course.code, courseTitle: course.title, units: course.units,
        professorId: professor.studentId, professorName: professor.fullName,
        status: 'active', createdAt: new Date()
      });

      setToast({ message: `Class assignment created: ${course.code} for ${program.code}-${selectedYear}${selectedSection}`, type: 'success' });
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (e) { setToast({ message: 'Error creating assignment', type: 'error' }); }
    setLoading(false);
  };

  const handleEditAssignment = (a) => {
    setEditingAssignment(a);
    setSelectedProgram(programs.find(p => p.code === a.programId)?.id || '');
    setSelectedYear(String(a.yearLevel));
    setSelectedSection(a.section);
    setSelectedCourse(courses.find(c => c.id === a.courseId)?.id || '');
    setSelectedProfessor(professors.find(p => p.studentId === a.professorId)?.id || '');
    setSelectedSemester(a.semester);
  };

  const handleUpdateAssignment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const program = programs.find(p => p.id === selectedProgram);
      const course = courses.find(c => c.id === selectedCourse);
      const professor = professors.find(p => p.id === selectedProfessor);

      if (!program || !course || !professor) {
        setToast({ message: 'Please select all fields', type: 'error' }); setLoading(false); return;
      }

      await updateDoc(doc(db, 'classAssignments', editingAssignment.id), {
        programId: program.code, programName: program.name,
        yearLevel: parseInt(selectedYear), section: selectedSection,
        semester: selectedSemester, courseId: course.id,
        courseCode: course.code, courseTitle: course.title, units: course.units,
        professorId: professor.studentId, professorName: professor.fullName,
        updatedAt: new Date()
      });

      setToast({ message: 'Assignment updated successfully!', type: 'success' });
      setEditingAssignment(null);
      resetForm();
      fetchData();
    } catch (e) { setToast({ message: 'Error updating assignment', type: 'error' }); }
    setLoading(false);
  };

  const handleDelete = (a) => {
    setConfirmDialog({
      isOpen: true, title: 'Delete Assignment', danger: true,
      message: `Delete ${a.courseCode} for ${a.programId}-${a.yearLevel}${a.section}? This will affect student enrollments.`,
      onConfirm: async () => {
        setConfirmDialog(d => ({ ...d, isOpen: false }));
        try {
          await deleteDoc(doc(db, 'classAssignments', a.id));
          setToast({ message: 'Assignment deleted', type: 'success' });
          fetchData();
        } catch (e) { setToast({ message: 'Error deleting assignment', type: 'error' }); }
      }
    });
  };

  const getFilteredAssignments = () => classAssignments.filter(a => {
    if (a.semester !== filterSemester) return false;
    if (filterProgram !== 'all' && a.programId !== filterProgram) return false;
    if (filterYear && a.yearLevel !== parseInt(filterYear)) return false;
    if (filterSection && a.section !== filterSection) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!a.professorName?.toLowerCase().includes(term) &&
          !a.courseCode?.toLowerCase().includes(term) &&
          !a.courseTitle?.toLowerCase().includes(term)) return false;
    }
    return true;
  });

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

  const renderModal = (isEdit) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-dialogIn" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>
            {isEdit ? 'Edit Class Assignment' : 'Create New Assignment'}
          </h2>
          <button onClick={() => { isEdit ? setEditingAssignment(null) : setShowCreateModal(false); resetForm(); }}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={isEdit ? handleUpdateAssignment : handleAddAssignment} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelClass}>Semester *</label>
            <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)} className={selectClass} required disabled={availableSemesters.length === 0}>
              {availableSemesters.length === 0 ? (
                <option value="">No Enrollment Period yet</option>
              ) : (
                availableSemesters.map(s => <option key={s} value={s}>{s}</option>)
              )}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Program *</label>
              <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} className={selectClass} required>
                <option value="">Select</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Year *</label>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className={selectClass} required>
                {["1","2","3","4"].map((y, i) => <option key={y} value={y}>{["1st","2nd","3rd","4th"][i]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Section *</label>
              <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} className={selectClass} required>
                {["A","B","C","D"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Course *</label>
            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className={selectClass} required>
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title} ({c.units} units)</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Professor *</label>
            <select value={selectedProfessor} onChange={e => setSelectedProfessor(e.target.value)} className={selectClass} required>
              <option value="">Select Professor</option>
              {professors.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.studentId})</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { isEdit ? setEditingAssignment(null) : setShowCreateModal(false); resetForm(); }}
              className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ background: NAVY }}>{loading ? 'Saving…' : isEdit ? 'Update Assignment' : 'Create Assignment'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>Manage Class Assignments</h2>
          <p className="text-sm text-gray-400 mt-0.5">Assign professors to courses per semester</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="text-sm font-semibold px-5 py-2.5 rounded-full transition"
          style={{ background: NAVY, color: "#fff" }}>
          + Add Class Assignment
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100" style={{ background: `${NAVY}08` }}>
          <p className="text-sm font-semibold text-gray-600">
            Existing Assignments — {getFilteredAssignments().length} found
          </p>
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-4 items-end border-b border-gray-50">
          <div>
            <label className={labelClass}>Search</label>
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Professor name or course code..."
              className={selectClass} style={{ width: 'auto', minWidth: '220px' }} />
          </div>
          <div>
            <label className={labelClass}>Semester</label>
            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}
              className={selectClass} style={{ width: 'auto', minWidth: '180px' }} disabled={availableSemesters.length === 0}>
              {availableSemesters.length === 0 ? (
                <option value="">No Enrollment Period yet</option>
              ) : (
                availableSemesters.map(s => <option key={s} value={s}>{s}</option>)
              )}
            </select>
          </div>
          <div>
            <label className={labelClass}>Program</label>
            <select value={filterProgram} onChange={e => { setFilterProgram(e.target.value); if (e.target.value === 'all') { setFilterYear(''); setFilterSection(''); } }}
              className={selectClass} style={{ width: 'auto', minWidth: '160px' }}>
              <option value="all">All Programs</option>
              {programs.map(p => <option key={p.id} value={p.code}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          {filterProgram !== 'all' && (
            <>
              <div className="flex items-end gap-1">
                <div>
                  <label className={labelClass}>Year</label>
                  <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                    className={selectClass} style={{ width: 'auto', minWidth: '100px' }}>
                    <option value="">All</option>
                    {["1","2","3","4"].map((y,i) => <option key={y} value={y}>{["1st","2nd","3rd","4th"][i]}</option>)}
                  </select>
                </div>
                {filterYear && <button onClick={() => setFilterYear('')} className="text-gray-400 hover:text-gray-600 text-lg pb-2 ml-0.5">✕</button>}
              </div>
              <div className="flex items-end gap-1">
                <div>
                  <label className={labelClass}>Section</label>
                  <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
                    className={selectClass} style={{ width: 'auto', minWidth: '90px' }}>
                    <option value="">All</option>
                    {["A","B","C","D"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {filterSection && <button onClick={() => setFilterSection('')} className="text-gray-400 hover:text-gray-600 text-lg pb-2 ml-0.5">✕</button>}
              </div>
            </>
          )}
          {(filterProgram !== 'all' || searchTerm) && (
            <button onClick={() => { setFilterProgram('all'); setFilterYear(''); setFilterSection(''); setSearchTerm(''); }}
              className="text-sm font-semibold px-4 py-2 rounded-lg border transition hover:bg-gray-50"
              style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>Clear All</button>
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
                <div className="px-5 py-2.5 flex items-center gap-2" style={{ background: `${GOLD}18` }}>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: GOLD, color: NAVY }}>{section}</span>
                  <span className="text-xs text-gray-400">{assignments.length} course{assignments.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {assignments.map(a => (
                    <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900">{a.courseCode}</span>
                          <span className="text-sm text-gray-500 truncate">{a.courseTitle}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{a.units} units</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{a.professorName}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleEditAssignment(a)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full border transition hover:bg-gray-50"
                          style={{ borderColor: "#e5e7eb", color: "#374151" }}>Edit</button>
                        <button onClick={() => handleDelete(a)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 transition"
                          style={{ background: "#fee2e2", color: "#dc2626" }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && renderModal(false)}
      {editingAssignment && renderModal(true)}

      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message}
        danger={confirmDialog.danger} onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(d => ({ ...d, isOpen: false }))} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ManageClassAssignments;