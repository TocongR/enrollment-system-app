// src/components/ManagePrograms.jsx
import { useState, useEffect } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where
} from 'firebase/firestore';
import { db } from '../firebase/config';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';

const NAVY = "#1a3a6b";

const ManagePrograms = () => {
  const [programs, setPrograms] = useState([]);
  const [enrolledCounts, setEnrolledCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ code: '', name: '', description: '', totalYears: 4 });
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  const emptyForm = { code: '', name: '', description: '', totalYears: 4 };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [progSnap, studSnap] = await Promise.all([
        getDocs(collection(db, 'programs')),
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
      ]);
      setPrograms(progSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Count students per program
      const counts = {};
      studSnap.docs.forEach(d => {
        const pid = d.data().programId;
        if (pid) counts[pid] = (counts[pid] || 0) + 1;
      });
      setEnrolledCounts(counts);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalYears' ? parseInt(value) || '' : name === 'code' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!formData.code.trim() || !formData.name.trim()) {
        setToast({ message: 'Code and Name are required.', type: 'error' });
        setSaving(false); return;
      }

      // Check for duplicate code
      const duplicate = programs.some(p =>
        p.code === formData.code.trim() && (!editingProgram || p.id !== editingProgram.id)
      );
      if (duplicate) {
        setToast({ message: `Program code "${formData.code}" already exists.`, type: 'error' });
        setSaving(false); return;
      }

      const data = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        totalYears: formData.totalYears || 4,
      };

      if (editingProgram) {
        await updateDoc(doc(db, 'programs', editingProgram.id), { ...data, updatedAt: new Date() });
        setToast({ message: `Program "${data.code}" updated!`, type: 'success' });
      } else {
        await addDoc(collection(db, 'programs'), { ...data, createdAt: new Date() });
        setToast({ message: `Program "${data.code}" created!`, type: 'success' });
      }

      setFormData(emptyForm);
      setEditingProgram(null);
      setShowModal(false);
      fetchData();
    } catch (e) {
      console.error(e);
      setToast({ message: 'Error saving program.', type: 'error' });
    }
    setSaving(false);
  };

  const handleEdit = (program) => {
    setEditingProgram(program);
    setFormData({
      code: program.code || '',
      name: program.name || '',
      description: program.description || '',
      totalYears: program.totalYears || 4,
    });
    setShowModal(true);
  };

  const handleDelete = (program) => {
    const studentCount = enrolledCounts[program.code] || 0;
    setConfirmDialog({
      isOpen: true, title: 'Delete Program', danger: true,
      message: `Delete "${program.code} — ${program.name}"?${studentCount > 0 ? ` Warning: ${studentCount} student(s) are currently assigned to this program.` : ''} This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(d => ({ ...d, isOpen: false }));
        try {
          await deleteDoc(doc(db, 'programs', program.id));
          setToast({ message: `Program "${program.code}" deleted.`, type: 'success' });
          fetchData();
        } catch (e) {
          setToast({ message: 'Error deleting program.', type: 'error' });
        }
      }
    });
  };

  const handleCancel = () => {
    setEditingProgram(null);
    setFormData(emptyForm);
    setShowModal(false);
  };

  const filteredPrograms = programs.filter(p => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return p.code?.toLowerCase().includes(t) || p.name?.toLowerCase().includes(t);
  });

  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5";
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 text-gray-700";

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: `${NAVY} transparent ${NAVY} ${NAVY}` }} />
    </div>
  );

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>
            Manage Programs
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Create and manage academic programs (e.g., BSCS, BSCE)</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="text-sm font-semibold px-5 py-2.5 rounded-full transition"
          style={{ background: NAVY, color: "#fff" }}>
          + Add Program
        </button>
      </div>

      {/* Search / Filter */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium">Search</label>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Program code or name..."
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
            style={{ minWidth: '220px' }} />
        </div>
        {searchTerm && (
          <button onClick={() => setSearchTerm('')}
            className="text-sm font-semibold px-4 py-2 rounded-lg border transition hover:bg-gray-50"
            style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between" style={{ background: `${NAVY}08` }}>
          <p className="text-sm font-semibold text-gray-600">
            All Programs ({filteredPrograms.length})
          </p>
        </div>

        {filteredPrograms.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            {programs.length === 0 ? 'No programs created yet. Click "+ Add Program" to get started.' : 'No programs match your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Program Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Years</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Students</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPrograms.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <span className="font-bold text-gray-900">{p.code}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>{p.name}</div>
                      {p.description && <div className="text-xs text-gray-400 mt-0.5">{p.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.totalYears || 4} years</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-semibold" style={{ color: NAVY }}>{enrolledCounts[p.code] || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(p)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full border transition hover:bg-gray-50"
                          style={{ borderColor: "#e5e7eb", color: "#374151" }}>Edit</button>
                        <button onClick={() => handleDelete(p)}
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-dialogIn" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>
                {editingProgram ? `Edit Program: ${editingProgram.code}` : 'Create New Program'}
              </h2>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Program Code *</label>
                  <input type="text" name="code" value={formData.code} onChange={handleInputChange}
                    className={inputClass} required placeholder="e.g. BSCS"
                    maxLength={10} disabled={!!editingProgram} />
                  <p className="text-xs text-gray-300 mt-1">Letters & numbers only, auto-capitalized</p>
                </div>
                <div>
                  <label className={labelClass}>Total Years *</label>
                  <select name="totalYears" value={formData.totalYears} onChange={handleInputChange}
                    className={inputClass} required>
                    <option value={2}>2 years</option>
                    <option value={3}>3 years</option>
                    <option value={4}>4 years</option>
                    <option value={5}>5 years</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Full Program Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange}
                  className={inputClass} required placeholder="e.g. Bachelor of Science in Computer Science" />
              </div>
              <div>
                <label className={labelClass}>Description (optional)</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange}
                  className={inputClass} rows={3} placeholder="Brief description of the program..." />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={handleCancel}
                  className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{ background: NAVY }}>
                  {saving ? 'Saving…' : editingProgram ? 'Update Program' : 'Create Program'}
                </button>
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

export default ManagePrograms;
