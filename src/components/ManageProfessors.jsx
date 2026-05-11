// src/components/ManageProfessors.jsx
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';

const NAVY = "#1a3a6b";

const ManageProfessors = () => {
  const [professors, setProfessors] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProf, setEditingProf] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [formData, setFormData] = useState({ professorId: '', fullName: '', password: '' });

  useEffect(() => { fetchProfessors(); }, []);

  const fetchProfessors = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'professor')));
      setProfessors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const email = `${formData.professorId}@enrollment.system`;
      const cred = await createUserWithEmailAndPassword(auth, email, formData.password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        studentId: formData.professorId, fullName: formData.fullName,
        role: 'professor', createdAt: new Date()
      });
      setToast({ message: `Professor ${formData.professorId} created successfully!`, type: 'success' });
      setShowAddForm(false);
      setFormData({ professorId: '', fullName: '', password: '' });
      fetchProfessors();
    } catch (e) { setToast({ message: `Error: ${e.message}`, type: 'error' }); }
    setLoading(false);
  };

  const handleEdit = (prof) => {
    setEditingProf(prof);
    setFormData({ professorId: prof.studentId, fullName: prof.fullName, password: '' });
    setShowAddForm(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'users', editingProf.id), { fullName: formData.fullName });
      setToast({ message: 'Professor updated!', type: 'success' });
      setEditingProf(null);
      setShowAddForm(false);
      setFormData({ professorId: '', fullName: '', password: '' });
      fetchProfessors();
    } catch (e) { setToast({ message: 'Error updating', type: 'error' }); }
  };

  const handleDelete = (prof) => {
    setConfirmDialog({
      isOpen: true, title: 'Delete Professor', danger: true,
      message: `Delete professor ${prof.studentId} (${prof.fullName})? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(d => ({ ...d, isOpen: false }));
        try {
          await deleteDoc(doc(db, 'users', prof.id));
          setToast({ message: 'Professor deleted', type: 'success' });
          fetchProfessors();
        } catch (e) { setToast({ message: 'Error deleting', type: 'error' }); }
      }
    });
  };

  const filtered = professors.filter(p =>
    p.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5";
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 text-gray-700";

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>Manage Professors</h2>
          <p className="text-sm text-gray-400 mt-0.5">Total: {professors.length} professors</p>
        </div>
        <button onClick={() => { setShowAddForm(v => !v); if (showAddForm) { setEditingProf(null); setFormData({ professorId: '', fullName: '', password: '' }); } }}
          className="text-sm font-semibold px-5 py-2.5 rounded-full transition"
          style={showAddForm ? { background: "#f3f4f6", color: "#6b7280" } : { background: NAVY, color: "#fff" }}>
          {showAddForm ? '✕ Cancel' : '+ Add New Professor'}
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100" style={{ background: `${NAVY}08` }}>
            <p className="text-sm font-semibold text-gray-600">{editingProf ? `Editing: ${editingProf.studentId}` : 'Add New Professor'}</p>
          </div>
          <form onSubmit={editingProf ? handleUpdate : handleAdd} className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Professor ID *</label>
                <input type="text" value={formData.professorId}
                  onChange={e => setFormData(p => ({ ...p, professorId: e.target.value.toUpperCase() }))}
                  className={inputClass} placeholder="e.g. PROF-003" required disabled={!!editingProf} />
              </div>
              <div>
                <label className={labelClass}>Full Name *</label>
                <input type="text" value={formData.fullName}
                  onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))}
                  className={inputClass} placeholder="e.g. Dr. Juan Dela Cruz" required />
              </div>
              {!editingProf && (
                <div>
                  <label className={labelClass}>Initial Password *</label>
                  <input type="password" value={formData.password}
                    onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                    className={inputClass} placeholder="Set initial password" required />
                </div>
              )}
            </div>
            <button type="submit" disabled={loading}
              className="px-6 py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50"
              style={{ background: NAVY, color: "#fff" }}>
              {loading ? 'Saving...' : editingProf ? 'Update Professor' : 'Add Professor'}
            </button>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 flex flex-wrap gap-3 items-center">
          <input type="text" placeholder="Search by ID or name..." value={searchTerm}
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
            Showing {filtered.length} of {professors.length} professors
          </p>
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">No professors found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100 bg-gray-50/60">
                  <tr>
                    {["Professor ID", "Full Name", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.studentId}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{p.fullName}</td>
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
      </div>

      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message}
        danger={confirmDialog.danger} onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(d => ({ ...d, isOpen: false }))} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ManageProfessors;
