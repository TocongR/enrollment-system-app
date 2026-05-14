// src/components/ManageStudents.jsx
import { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, doc, deleteDoc, setDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '../firebase/config';
import { secondaryAuth } from '../firebase/secondaryAuth';
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [formData, setFormData] = useState({
    studentId: '', firstName: '', lastName: '',
    programId: '', yearLevel: '1', section: 'A'
  });

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

  // Password = student code, Username = FULLNAME uppercase no spaces
  const generatedPassword = formData.studentId || '';
  const generatedUsername = `${formData.firstName}${formData.lastName}`.replace(/\s+/g, '').toUpperCase();

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!formData.studentId || formData.studentId.length < 6) {
      setToast({ message: 'Please fill in a valid student ID (min 6 characters)', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const program = programs.find(p => p.id === formData.programId);
      if (!program) { setToast({ message: 'Please select a program', type: 'error' }); setLoading(false); return; }

      const fullName = `${formData.firstName} ${formData.lastName}`;
      const email = `${generatedUsername}@enrollment.system`;
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, generatedPassword);

      await setDoc(doc(db, 'users', cred.user.uid), {
        studentId: formData.studentId, fullName,
        firstName: formData.firstName, lastName: formData.lastName,
        role: 'student', programId: program.code, programName: program.name,
        yearLevel: parseInt(formData.yearLevel), section: formData.section,
        createdAt: new Date()
      });

      setShowAddModal(false);
      setFormData({ studentId: '', firstName: '', lastName: '', programId: '', yearLevel: '1', section: 'A' });
      setToast({ message: 'Student added successfully!', type: 'success' });
      fetchData();
    } catch (e) { setToast({ message: `Error: ${e.message}`, type: 'error' }); }
    setLoading(false);
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
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>Manage Students</h2>
          <p className="text-sm text-gray-400 mt-0.5">Total: {students.length} students</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="text-sm font-semibold px-5 py-2.5 rounded-full transition"
          style={{ background: NAVY, color: "#fff" }}>
          + Add New Student
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 flex flex-wrap gap-3 items-center">
          <input type="text" placeholder="Search by ID or name…" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2" />
          <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none text-gray-600">
            <option value="">All Programs</option>
            {programs.map(p => <option key={p.id} value={p.code}>{p.code}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none text-gray-600">
            <option value="">All Years</option>
            {["1","2","3","4"].map((y, i) => <option key={y} value={y}>{["1st","2nd","3rd","4th"][i]} Year</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => { setSearchTerm(''); setFilterProgram(''); setFilterYear(''); }}
              className="text-sm font-semibold px-4 py-2 rounded-lg border transition hover:bg-gray-50"
              style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>Clear</button>
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
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${GOLD}33`, color: NAVY }}>{s.programId}</span>
                        <span className="ml-2 text-xs text-gray-400">{s.programName}</span>
                      </td>
                      <td className={tdClass}>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{s.yearLevel}{s.section}</span>
                      </td>
                      <td className={tdClass}>
                        <button onClick={() => handleDeleteStudent(s.studentId, s.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full transition"
                          style={{ background: "#fee2e2", color: "#dc2626" }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-dialogIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>Add New Student</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleAddStudent} className="px-6 py-5 space-y-4">
              <div>
                <label className={labelClass}>Student ID *</label>
                <input type="text" value={formData.studentId} onChange={e => setFormData(p => ({ ...p, studentId: e.target.value.toUpperCase() }))}
                  className={inputClass} placeholder="e.g. 2024-1234-A" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input type="text" value={formData.firstName} onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
                    className={inputClass} placeholder="Juan" required />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input type="text" value={formData.lastName} onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
                    className={inputClass} placeholder="Dela Cruz" required />
                </div>
              </div>
              <div>
                <label className={labelClass}>Username (auto-generated)</label>
                <input type="text" value={generatedUsername} disabled
                  className={inputClass + " bg-gray-50 text-gray-500 font-mono"} />
                <p className="text-xs text-gray-400 mt-1">Format: Full name in uppercase without spaces</p>
              </div>
              <div>
                <label className={labelClass}>Initial Password (auto-generated)</label>
                <input type="text" value={generatedPassword} disabled
                  className={inputClass + " bg-gray-50 text-gray-500 font-mono"} />
                <p className="text-xs text-gray-400 mt-1">Password is the Student ID</p>
              </div>
              <div>
                <label className={labelClass}>Program *</label>
                <select value={formData.programId} onChange={e => setFormData(p => ({ ...p, programId: e.target.value }))}
                  className={inputClass} required>
                  <option value="">Select Program</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Year Level *</label>
                  <select value={formData.yearLevel} onChange={e => setFormData(p => ({ ...p, yearLevel: e.target.value }))}
                    className={inputClass} required>
                    {["1","2","3","4"].map((y, i) => <option key={y} value={y}>{["1st","2nd","3rd","4th"][i]} Year</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Section *</label>
                  <select value={formData.section} onChange={e => setFormData(p => ({ ...p, section: e.target.value }))}
                    className={inputClass} required>
                    {["A","B","C","D"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{ background: NAVY }}>{loading ? 'Adding…' : 'Add Student'}</button>
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