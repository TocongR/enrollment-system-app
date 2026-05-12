// src/components/EnrollmentPeriod.jsx
import { useState, useEffect, useCallback } from 'react';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';

const NAVY = "#1a3a6b";
const GOLD = "#f0c040";

const StatusBadge = ({ status, label }) => {
  const styles = {
    open:     "bg-green-100 text-green-800",
    closed:   "bg-gray-100 text-gray-600",
    upcoming: "bg-blue-100 text-blue-800",
    expired:  "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status] ?? styles.closed}`}>
      {label}
    </span>
  );
};

const EnrollmentPeriod = () => {
  const [enrollmentPeriods, setEnrollmentPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [formData, setFormData] = useState({
    term: '', startYear: new Date().getFullYear(), endYear: new Date().getFullYear() + 1, startDate: '', endDate: '', isActive: true, autoToggle: true
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  const emptyForm = { term: '', startYear: new Date().getFullYear(), endYear: new Date().getFullYear() + 1, startDate: '', endDate: '', isActive: true, autoToggle: true };

  // Wrapped in useCallback so it has a stable reference for useEffect deps
  const fetchData = useCallback(async () => {
    try {
      const [assignSnap, periodsSnap] = await Promise.all([
        getDocs(collection(db, 'classAssignments')),
        getDocs(collection(db, 'enrollmentPeriods')),
      ]);
      const sems = new Set();
      assignSnap.docs.forEach(d => sems.add(d.data().semester));
      setAvailableSemesters(Array.from(sems).sort().reverse());

      const periods = periodsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEnrollmentPeriods(periods.filter(p => !p.deleted));
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  // Wrapped in useCallback with fetchData as a dependency
  const checkAndUpdatePeriods = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'enrollmentPeriods'));
      const now = new Date();
      await Promise.all(snap.docs.map(async d => {
        const p = d.data();
        if (!p.autoToggle || p.deleted) return;
        const shouldBeActive = now >= new Date(p.startDate) && now <= new Date(p.endDate);
        if (p.isActive !== shouldBeActive) {
          await setDoc(doc(db, 'enrollmentPeriods', d.id), { ...p, isActive: shouldBeActive, lastAutoUpdate: new Date() });
        }
      }));
      fetchData();
    } catch (e) { console.error(e); }
  }, [fetchData]);

  // Both functions are now stable references — safe to include in deps
  useEffect(() => {
    fetchData();
    const interval = setInterval(checkAndUpdatePeriods, 60000);
    return () => clearInterval(interval);
  }, [fetchData, checkAndUpdatePeriods]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (Number(formData.endYear) !== Number(formData.startYear) + 1) {
        setToast({ message: 'Academic years must be exactly 1 year apart (e.g., 2024-2025).', type: 'error' }); 
        setSaving(false); return;
      }
      
      const assembledSemester = `${formData.term} ${formData.startYear}-${formData.endYear}`;

      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        alert('End date must be after start date'); setSaving(false); return;
      }
      const exists = enrollmentPeriods.some(p =>
        p.semester === assembledSemester && (!editingPeriod || p.id !== editingPeriod.id)
      );
      if (exists) {
        alert('An enrollment period already exists for this semester.'); setSaving(false); return;
      }
      const now = new Date();
      const shouldBeActive = formData.autoToggle
        ? (now >= new Date(formData.startDate) && now <= new Date(formData.endDate))
        : formData.isActive;

      const data = {
        semester: assembledSemester, startDate: formData.startDate, endDate: formData.endDate,
        autoToggle: formData.autoToggle, isActive: shouldBeActive, updatedAt: new Date()
      };

      if (editingPeriod) {
        await setDoc(doc(db, 'enrollmentPeriods', editingPeriod.id), { ...data, createdAt: editingPeriod.createdAt });
        setToast({ message: 'Enrollment period updated!', type: 'success' });
      } else {
        await setDoc(doc(db, 'enrollmentPeriods', assembledSemester.replace(/\s+/g, '-')), { ...data, createdAt: new Date() });
        setToast({ message: 'Enrollment period created!', type: 'success' });
        setShowCreateForm(false);
      }

      setFormData(emptyForm); setEditingPeriod(null); fetchData();
    } catch (e) { setToast({ message: 'Error saving settings', type: 'error' }); }
    setSaving(false);
  };

  const handleEdit = (period) => {
    setEditingPeriod(period);
    
    let term = '';
    let startYear = new Date().getFullYear();
    let endYear = new Date().getFullYear() + 1;
    
    const match = period.semester.match(/(.+) (\d{4})-(\d{4})/);
    if (match) {
      term = match[1];
      startYear = parseInt(match[2]);
      endYear = parseInt(match[3]);
    }
    
    setFormData({ term, startYear, endYear, startDate: period.startDate, endDate: period.endDate, isActive: period.isActive, autoToggle: period.autoToggle });
    setShowCreateForm(true);
  };

  const handleCancelEdit = () => { setEditingPeriod(null); setFormData(emptyForm); setShowCreateForm(false); };

  const handleToggleActive = async (period) => {
    if (period.autoToggle) { setToast({ message: 'Auto-toggle is enabled. Edit the period to disable it first.', type: 'info' }); return; }
    setConfirmDialog({
      isOpen: true, title: period.isActive ? 'Close Enrollment' : 'Open Enrollment',
      message: `${period.isActive ? 'Close' : 'Open'} enrollment for ${period.semester}?`, danger: period.isActive,
      onConfirm: async () => {
        setConfirmDialog(d => ({ ...d, isOpen: false }));
        try {
          await setDoc(doc(db, 'enrollmentPeriods', period.id), { ...period, isActive: !period.isActive, updatedAt: new Date() });
          fetchData();
        } catch (e) { setToast({ message: 'Error updating status', type: 'error' }); }
      }
    });
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true, title: 'Delete Enrollment Period', danger: true,
      message: 'Delete this enrollment period? This cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog(d => ({ ...d, isOpen: false }));
        try {
          await setDoc(doc(db, 'enrollmentPeriods', id), { deleted: true, deletedAt: new Date() });
          setToast({ message: 'Period deleted', type: 'success' });
          fetchData();
        } catch (e) { setToast({ message: 'Error deleting period', type: 'error' }); }
      }
    });
  };

  const getPeriodStatus = (period) => {
    const now = new Date();
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    if (now < start) return { status: 'upcoming', label: 'Upcoming' };
    if (now > end)   return { status: 'expired',  label: 'Expired' };
    if (period.isActive) return { status: 'open', label: 'Open' };
    return { status: 'closed', label: 'Closed' };
  };

  const getActivePeriods = () => enrollmentPeriods.filter(p => {
    if (!p.isActive) return false;
    const now = new Date();
    return now >= new Date(p.startDate) && now <= new Date(p.endDate);
  });

  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5";
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 text-gray-700";

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: `${NAVY} transparent ${NAVY} ${NAVY}` }} />
    </div>
  );

  const activePeriods = getActivePeriods();

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>
            Enrollment Period Management
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Set enrollment dates per semester</p>
        </div>
        <button
          onClick={() => { setShowCreateForm(v => !v); if (showCreateForm) handleCancelEdit(); }}
          className="text-sm font-semibold px-5 py-2.5 rounded-full transition"
          style={showCreateForm ? { background: "#f3f4f6", color: "#6b7280" } : { background: NAVY, color: "#fff" }}>
          {showCreateForm ? '✕ Cancel' : '+ Add Enrollment Period'}
        </button>
      </div>

      {/* Status banner */}
      <div className={`rounded-2xl px-5 py-4 flex items-start gap-4 border ${
        activePeriods.length > 0
          ? 'bg-green-50 border-green-200'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${activePeriods.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
        <div>
          <p className={`font-semibold text-sm ${activePeriods.length > 0 ? 'text-green-800' : 'text-gray-600'}`}>
            {activePeriods.length > 0 ? 'Enrollment is currently open' : 'Enrollment is currently closed'}
          </p>
          {activePeriods.map(p => (
            <p key={p.id} className="text-xs text-green-700 mt-1">
              <span className="font-semibold">{p.semester}</span>
              {' — '}
              {new Date(p.startDate).toLocaleString()} to {new Date(p.endDate).toLocaleString()}
            </p>
          ))}
        </div>
      </div>
      {/* Form Modal */}
      {showCreateForm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-dialogIn" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>
              {editingPeriod ? `Edit: ${editingPeriod.semester}` : 'Create Enrollment Period'}
            </h2>
            <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
          <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Semester *</label>
                <select name="term" value={formData.term} onChange={handleInputChange}
                  className={inputClass} required disabled={!!editingPeriod}>
                  <option value="">Select Term</option>
                  <option value="1st Sem">1st Sem</option>
                  <option value="2nd Sem">2nd Sem</option>
                  <option value="Summer">Summer</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Start Year *</label>
                <input type="number" name="startYear" value={formData.startYear} onChange={handleInputChange}
                  className={inputClass} required disabled={!!editingPeriod} min="2000" max="2100" />
              </div>
              <div>
                <label className={labelClass}>End Year *</label>
                <input type="number" name="endYear" value={formData.endYear} onChange={handleInputChange}
                  className={inputClass} required disabled={!!editingPeriod} min="2000" max="2100" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Start Date & Time *</label>
                <input type="datetime-local" name="startDate" value={formData.startDate}
                  onChange={handleInputChange} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>End Date & Time *</label>
                <input type="datetime-local" name="endDate" value={formData.endDate}
                  onChange={handleInputChange} className={inputClass} required />
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" name="autoToggle" checked={formData.autoToggle}
                  onChange={handleInputChange}
                  className="mt-0.5 w-4 h-4 rounded cursor-pointer" style={{ accentColor: NAVY }} />
                <div>
                  <p className="text-sm font-medium text-gray-700">Auto-toggle enrollment based on dates</p>
                  <p className="text-xs text-gray-400 mt-0.5">Automatically opens/closes when start/end dates are reached — recommended</p>
                </div>
              </label>
              {!formData.autoToggle && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="isActive" checked={formData.isActive}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded cursor-pointer" style={{ accentColor: NAVY }} />
                  <p className="text-sm font-medium text-gray-700">Manually set as active now</p>
                </label>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={handleCancelEdit}
                className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: NAVY }}>
                {saving ? 'Saving…' : editingPeriod ? 'Update Period' : 'Create Period'}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Periods list */}
      <div className="rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100" style={{ background: `${NAVY}08` }}>
          <p className="text-sm font-semibold text-gray-600">
            All Enrollment Periods ({enrollmentPeriods.length})
          </p>
        </div>

        {enrollmentPeriods.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            No enrollment periods configured yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {enrollmentPeriods.map(period => {
              const { status, label } = getPeriodStatus(period);
              return (
                <div key={period.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900" style={{ fontFamily: "'Sora', sans-serif" }}>
                          {period.semester}
                        </span>
                        <StatusBadge status={status} label={label} />
                        {period.autoToggle && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: `${GOLD}33`, color: NAVY }}>
                            Auto
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 space-y-0.5">
                        <p>Start: {new Date(period.startDate).toLocaleString()}</p>
                        <p>End: {new Date(period.endDate).toLocaleString()}</p>
                        {period.lastAutoUpdate && (
                          <p className="text-gray-400">
                            Last auto-update: {new Date(period.lastAutoUpdate.seconds * 1000).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {!period.autoToggle && (
                        <button onClick={() => handleToggleActive(period)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full border transition"
                          style={period.isActive
                            ? { background: "#fee2e2", color: "#dc2626", borderColor: "#fca5a5" }
                            : { background: "#dcfce7", color: "#16a34a", borderColor: "#86efac" }}>
                          {period.isActive ? 'Close' : 'Open'}
                        </button>
                      )}
                      <button onClick={() => handleEdit(period)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full border transition hover:bg-gray-50"
                        style={{ borderColor: "#e5e7eb", color: "#374151" }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(period.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full transition"
                        style={{ background: "#fee2e2", color: "#dc2626" }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100" style={{ background: `${GOLD}18` }}>
          <p className="text-sm font-semibold" style={{ color: NAVY }}>How Enrollment Works</p>
        </div>
        <div className="px-5 py-4 space-y-2">
          {[
            ["One period per semester", "Set enrollment dates for each semester individually."],
            ["Automatic course filtering", "Students automatically see only courses for their program, year, and section."],
            ["Regular students", "See courses designated for their current year level only."],
            ["Irregular students", "Can request courses from other year levels through a separate request flow."],
            ["Auto-toggle", "Enrollment opens and closes automatically based on the dates you set."],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-2.5 text-sm">
              <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: GOLD }} />
              <p className="text-gray-600"><span className="font-semibold text-gray-800">{title}:</span> {desc}</p>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message}
        danger={confirmDialog.danger} onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(d => ({ ...d, isOpen: false }))} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default EnrollmentPeriod;