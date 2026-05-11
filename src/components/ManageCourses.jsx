// src/components/ManageCourses.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';

const NAVY = "#1a3a6b";
const GOLD = "#f0c040";

const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
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
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setFormData({ code: '', title: '', units: 3, description: '', prerequisites: [] });
    setEditingCourse(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const data = {
        code: formData.code.toUpperCase(),
        title: formData.title,
        units: parseInt(formData.units),
        description: formData.description,
        prerequisites: formData.prerequisites,
        updatedAt: new Date()
      };
      if (editingCourse) {
        await setDoc(doc(db, 'courses', editingCourse.id), { ...data, createdAt: editingCourse.createdAt || new Date() });
        setToast({ message: 'Course updated successfully!', type: 'success' });
      } else {
        const id = formData.code.toUpperCase();
        await setDoc(doc(db, 'courses', id), { ...data, createdAt: new Date() });
        setToast({ message: 'Course added successfully!', type: 'success' });
        setShowAddForm(false);
      }
      resetForm();
      fetchCourses();
    } catch (e) {
      setToast({ message: 'Error saving course', type: 'error' });
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      code: course.code, title: course.title, units: course.units,
      description: course.description || '', prerequisites: course.prerequisites || []
    });
    setShowAddForm(true);
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

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>
            Manage Courses
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Total: {courses.length} courses</p>
        </div>
        <button
          onClick={() => { setShowAddForm(v => !v); if (showAddForm) resetForm(); }}
          className="text-sm font-semibold px-5 py-2.5 rounded-full transition"
          style={showAddForm ? { background: "#f3f4f6", color: "#6b7280" } : { background: NAVY, color: "#fff" }}>
          {showAddForm ? '✕ Cancel' : '+ Add New Course'}
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100" style={{ background: `${NAVY}08` }}>
            <p className="text-sm font-semibold text-gray-600">
              {editingCourse ? `Editing: ${editingCourse.code}` : 'Add New Course'}
            </p>
          </div>
          <form onSubmit={handleSave} className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Course Code *</label>
                <input type="text" value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
                  className={inputClass} placeholder="e.g. CS101" required disabled={!!editingCourse} />
              </div>
              <div>
                <label className={labelClass}>Course Title *</label>
                <input type="text" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  className={inputClass} placeholder="e.g. Intro to Programming" required />
              </div>
              <div>
                <label className={labelClass}>Units *</label>
                <input type="number" min="1" max="6" value={formData.units}
                  onChange={e => setFormData(p => ({ ...p, units: e.target.value }))}
                  className={inputClass} required />
              </div>
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                className={inputClass} rows={2} placeholder="Brief course description..." />
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
            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2.5 rounded-full text-sm font-semibold transition"
                style={{ background: NAVY, color: "#fff" }}>
                {editingCourse ? 'Update Course' : 'Add Course'}
              </button>
              {editingCourse && (
                <button type="button" onClick={() => { resetForm(); }}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold border transition hover:bg-gray-50"
                  style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>Cancel</button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Search */}
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
                    {["Code", "Title", "Units", "Prerequisites", "Actions"].map(h => (
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
                        {(c.prerequisites || []).length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {c.prerequisites.map(p => (
                              <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{p}</span>
                            ))}
                          </div>
                        ) : <span className="text-xs text-gray-400">None</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(c)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full border transition hover:bg-gray-50"
                            style={{ borderColor: "#e5e7eb", color: "#374151" }}>Edit</button>
                          <button onClick={() => handleDelete(c)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full transition"
                            style={{ background: "#fee2e2", color: "#dc2626" }}>Delete</button>
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

      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message}
        danger={confirmDialog.danger} onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(d => ({ ...d, isOpen: false }))} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ManageCourses;
