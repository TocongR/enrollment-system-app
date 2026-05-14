// src/components/ManageCourses.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';

const NAVY = "#1a3a6b";
const GOLD = "#f0c040";

const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [formData, setFormData] = useState({
    code: '', title: '', units: 3, description: '', prerequisites: []
  });

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    try {
      const snap = await getDocs(collection(db, 'courses'));
      const coursesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCourses(coursesData);

      // Fetch enrollment counts per course
      const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('status', '==', 'enrolled')));
      const counts = {};
      enrollSnap.docs.forEach(d => {
        const code = d.data().courseCode;
        counts[code] = (counts[code] || 0) + 1;
      });
      setEnrollmentCounts(counts);
    } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setFormData({ code: '', title: '', units: 3, description: '', prerequisites: [] });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const data = {
        code: formData.code.toUpperCase(), title: formData.title,
        units: parseInt(formData.units), description: formData.description,
        prerequisites: formData.prerequisites, updatedAt: new Date()
      };
      await setDoc(doc(db, 'courses', formData.code.toUpperCase()), { ...data, createdAt: new Date() });
      setToast({ message: 'Course added successfully!', type: 'success' });
      setShowAddModal(false);
      resetForm();
      fetchCourses();
    } catch (e) { setToast({ message: 'Error saving course', type: 'error' }); }
  };


  const handleDelete = (course) => {
    setConfirmDialog({
      isOpen: true, title: 'Delete Course', danger: true,
      message: `Delete ${course.code} — ${course.title}? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(d => ({ ...d, isOpen: false }));
        try {
          await deleteDoc(doc(db, 'courses', course.id));
          setToast({ message: 'Course deleted', type: 'success' });
          fetchCourses();
        } catch (e) { setToast({ message: 'Error deleting course', type: 'error' }); }
      }
    });
  };

  const togglePrereq = (code) => {
    setFormData(prev => ({
      ...prev,
      prerequisites: prev.prerequisites.includes(code)
        ? prev.prerequisites.filter(p => p !== code)
        : [...prev.prerequisites, code]
    }));
  };

  const filtered = courses.filter(c =>
    c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const otherCourses = courses.filter(c => c.code !== formData.code);

  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5";
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 text-gray-700";

  const renderModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-dialogIn" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>
            Add New Course
          </h2>
          <button onClick={() => { setShowAddModal(false); resetForm(); }}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Course Code *</label>
              <input type="text" value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
                className={inputClass} placeholder="e.g. CS101" required />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Course Title *</label>
              <input type="text" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                className={inputClass} placeholder="e.g. Intro to Programming" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Units *</label>
              <input type="number" min="1" max="6" value={formData.units}
                onChange={e => setFormData(p => ({ ...p, units: e.target.value }))} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <input type="text" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                className={inputClass} placeholder="Brief description..." />
            </div>
          </div>
          <div>
            <label className={labelClass}>Prerequisites (click to select)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {otherCourses.length === 0 ? (
                <p className="text-xs text-gray-400">No other courses available</p>
              ) : otherCourses.map(c => (
                <button key={c.code} type="button" onClick={() => togglePrereq(c.code)}
                  className="text-xs px-3 py-1.5 rounded-full border transition font-medium"
                  style={formData.prerequisites.includes(c.code)
                    ? { background: `${GOLD}33`, borderColor: GOLD, color: NAVY }
                    : { borderColor: '#e5e7eb', color: '#6b7280' }}>
                  {c.code} {formData.prerequisites.includes(c.code) ? '✓' : ''}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }}
              className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition"
              style={{ background: NAVY }}>Add Course</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>Manage Courses</h2>
          <p className="text-sm text-gray-400 mt-0.5">Total: {courses.length} courses</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="text-sm font-semibold px-5 py-2.5 rounded-full transition"
          style={{ background: NAVY, color: "#fff" }}>
          + Add New Course
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 flex flex-wrap gap-3 items-center">
          <input type="text" placeholder="Search by code or title..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2" />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}
              className="text-sm font-semibold px-4 py-2 rounded-lg border transition hover:bg-gray-50"
              style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>Clear</button>
          )}
        </div>
        <div className="border-t border-gray-100">
          <p className="px-5 py-2 text-xs text-gray-400 border-b border-gray-50">
            Showing {filtered.length} of {courses.length} courses
          </p>
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">No courses found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100 bg-gray-50/60">
                  <tr>
                    {["Code", "Title", "Units", "Students", "Prerequisites", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{c.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{c.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c.units} units</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${NAVY}15`, color: NAVY }}>
                          {enrollmentCounts[c.code] || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(c.prerequisites || []).length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {c.prerequisites.map(p => (
                              <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{p}</span>
                            ))}
                          </div>
                        ) : <span className="text-xs text-gray-400">None</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button onClick={() => handleDelete(c)}
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

      {showAddModal && renderModal()}

      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message}
        danger={confirmDialog.danger} onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(d => ({ ...d, isOpen: false }))} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ManageCourses;
