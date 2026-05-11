// src/components/ManageStudents.jsx
import { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, doc, deleteDoc, setDoc, updateDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';

const NAVY = "#1a3a6b";
const GOLD = "#f0c040";

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [formData, setFormData] = useState({
    studentId: '', fullName: '', password: '',
    programId: '', yearLevel: '1', section: 'A'
  });
  const [editData, setEditData] = useState({ fullName: '', programId: '', yearLevel: '1', section: 'A' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [studSnap, progSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        getDocs(collection(db, 'programs')),
      ]);
      setStudents(studSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPrograms(progSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const program = programs.find(p => p.id === formData.programId);
      if (!program) { alert('Please select a program'); setLoading(false); return; }

      const email = `${formData.studentId}@enrollment.system`;
      const cred = await createUserWithEmailAndPassword(auth, email, formData.password);

      await setDoc(doc(db, 'users', cred.user.uid), {
        studentId: formData.studentId, fullName: formData.fullName,
        role: 'student', programId: program.code, programName: program.name,
        yearLevel: parseInt(formData.yearLevel), section: formData.section,
        createdAt: new Date()
      });

      setShowAddForm(false);
      setFormData({ studentId: '', fullName: '', password: '', programId: '', yearLevel: '1', section: 'A' });
      setToast({ message: 'Student added successfully!', type: 'success' });
      fetchData();
    } catch (e) { setToast({ message: `Error: ${e.message}`, type: 'error' }); }
    setLoading(false);
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setEditData({
      fullName: student.fullName,
      programId: programs.find(p => p.code === student.programId)?.id || '',
      yearLevel: String(student.yearLevel),
      section: student.section
    });
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      const program = programs.find(p => p.id === editData.programId);
      await updateDoc(doc(db, 'users', editingStudent.id), {
        fullName: editData.fullName,
        programId: program ? program.code : editingStudent.programId,
        programName: program ? program.name : editingStudent.programName,
        yearLevel: parseInt(editData.yearLevel),
        section: editData.section
      });
      setToast({ message: 'Student updated successfully!', type: 'success' });
      setEditingStudent(null);
      fetchData();
    } catch (e) { setToast({ message: 'Error updating student', type: 'error' }); }
  };

  const handleDeleteStudent = (studentId, uid) => {
    setConfirmDialog({
      isOpen: true, title: 'Delete Student', danger: true,
      message: `Delete student ${studentId}? This will also delete all their enrollments.`,
      onConfirm: async () => {
        setConfirmDialog(d => ({ ...d, isOpen: false }));
        try {
          await deleteDoc(doc(db, 'users', uid));
          const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', studentId)));
          await Promise.all(enrollSnap.docs.map(d => deleteDoc(doc(db, 'enrollments', d.id))));
          setToast({ message: 'Student deleted', type: 'success' });
          fetchData();
        } catch (e) { setToast({ message: 'Error deleting student', type: 'error' }); }
      }
    });
  };

  const getFilteredStudents = () => students.filter(s => {
    const matchSearch = s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchProg = !filterProgram || s.programId === filterProgram;
    const matchYear = !filterYear || s.yearLevel === parseInt(filterYear);
    return matchSearch && matchProg && matchYear;
  });

  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5";
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 text-gray-700";
  const thClass = "px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide";
  const tdClass = "px-4 py-3 text-sm text-gray-700";

  const filtered = getFilteredStudents();
  const hasFilters = searchTerm || filterProgram || filterYear;

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>
            Manage Students
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Total: {students.length} students</p>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="text-sm font-semibold px-5 py-2.5 rounded-full transition"
          style={showAddForm
            ? { background: "#f3f4f6", color: "#6b7280" }
            : { background: NAVY, color: "#fff" }}>
          {showAddForm ? '✕ Cancel' : '+ Add New Student'}
        </button>
      </div>

      {/* Add Student Form */}
      {showAddForm && (
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100" style={{ background: `${NAVY}08` }}>
            <p className="text-sm font-semibold text-gray-600">Add New Student</p>
          </div>
          <form onSubmit={handleAddStudent} className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Student ID *</label>
                <input type="text" name="studentId" value={formData.studentId}
                  onChange={handleInputChange} className={inputClass}
                  placeholder="e.g. 2024-1234-A" required />
              </div>
              <div>
                <label className={labelClass}>Full Name *</label>
                <input type="text" name="fullName" value={formData.fullName}
                  onChange={handleInputChange} className={inputClass}
                  placeholder="e.g. Juan Dela Cruz" required />
              </div>
              <div>
                <label className={labelClass}>Initial Password *</label>
                <input type="password" name="password" value={formData.password}
                  onChange={handleInputChange} className={inputClass}
                  placeholder="Set initial password" required />
              </div>
              <div>
                <label className={labelClass}>Program *</label>
                <select name="programId" value={formData.programId}
                  onChange={handleInputChange} className={inputClass} required>
                  <option value="">Select Program</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Year Level *</label>
                <select name="yearLevel" value={formData.yearLevel}
                  onChange={handleInputChange} className={inputClass} required>
                  {["1","2","3","4"].map((y, i) => (
                    <option key={y} value={y}>{["1st","2nd","3rd","4th"][i]} Year</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Section *</label>
                <select name="section" value={formData.section}
                  onChange={handleInputChange} className={inputClass} required>
                  {["A","B","C","D"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="px-6 py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50"
              style={{ background: NAVY, color: "#fff" }}>
              {loading ? 'Adding student…' : 'Add Student'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search by ID or name…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
          />
          <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none text-gray-600">
            <option value="">All Programs</option>
            {programs.map(p => <option key={p.id} value={p.code}>{p.code}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none text-gray-600">
            <option value="">All Years</option>
            {["1","2","3","4"].map((y, i) => (
              <option key={y} value={y}>{["1st","2nd","3rd","4th"][i]} Year</option>
            ))}
          </select>
          {hasFilters && (
            <button onClick={() => { setSearchTerm(''); setFilterProgram(''); setFilterYear(''); }}
              className="text-sm font-semibold px-4 py-2 rounded-lg border transition hover:bg-gray-50"
              style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="border-t border-gray-100">
          <p className="px-5 py-2 text-xs text-gray-400 border-b border-gray-50">
            Showing {filtered.length} of {students.length} students
          </p>

          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">No students found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100 bg-gray-50/60">
                  <tr>
                    {["Student ID", "Full Name", "Program", "Year & Section", "Actions"].map(h => (
                      <th key={h} className={thClass}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className={tdClass + " font-medium"}>{s.studentId}</td>
                      <td className={tdClass}>{s.fullName}</td>
                      <td className={tdClass}>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: `${GOLD}33`, color: NAVY }}>
                          {s.programId}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">{s.programName}</span>
                      </td>
                      <td className={tdClass}>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                          {s.yearLevel}{s.section}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditStudent(s)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full border transition hover:bg-gray-50"
                            style={{ borderColor: "#e5e7eb", color: "#374151" }}>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(s.studentId, s.id)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full transition"
                            style={{ background: "#fee2e2", color: "#dc2626" }}>
                            Delete
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

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-dialogIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>Edit Student</h2>
              <button onClick={() => setEditingStudent(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleUpdateStudent} className="px-6 py-5 space-y-4">
              <div>
                <label className={labelClass}>Student ID</label>
                <input type="text" value={editingStudent.studentId} disabled className={inputClass + " bg-gray-50"} />
              </div>
              <div>
                <label className={labelClass}>Full Name *</label>
                <input type="text" value={editData.fullName} onChange={e => setEditData(p => ({ ...p, fullName: e.target.value }))} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Program *</label>
                <select value={editData.programId} onChange={e => setEditData(p => ({ ...p, programId: e.target.value }))} className={inputClass} required>
                  <option value="">Select Program</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Year Level *</label>
                  <select value={editData.yearLevel} onChange={e => setEditData(p => ({ ...p, yearLevel: e.target.value }))} className={inputClass} required>
                    {["1","2","3","4"].map((y, i) => <option key={y} value={y}>{["1st","2nd","3rd","4th"][i]} Year</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Section *</label>
                  <select value={editData.section} onChange={e => setEditData(p => ({ ...p, section: e.target.value }))} className={inputClass} required>
                    {["A","B","C","D"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition" style={{ background: NAVY }}>Update Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message}
        danger={confirmDialog.danger} onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(d => ({ ...d, isOpen: false }))} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ManageStudents;