// src/components/EnrollmentPeriod.jsx
import { useState, useEffect } from 'react';
import {  
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import './EnrollmentPeriod.css';

const EnrollmentPeriod = () => {
  const [enrollmentPeriod, setEnrollmentPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    semester: '1st Sem 2024-2025',
    startDate: '',
    endDate: '',
    isActive: false
  });

  useEffect(() => {
    fetchEnrollmentPeriod();
  }, []);

  const fetchEnrollmentPeriod = async () => {
    try {
      const periodDoc = await getDoc(doc(db, 'settings', 'enrollmentPeriod'));
      
      if (periodDoc.exists()) {
        const data = periodDoc.data();
        setEnrollmentPeriod(data);
        setFormData({
          semester: data.semester || '1st Sem 2024-2025',
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          isActive: data.isActive || false
        });
      }
    } catch (error) {
      console.error('Error fetching enrollment period:', error);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate dates
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        alert('End date must be after start date');
        setSaving(false);
        return;
      }

      await setDoc(doc(db, 'settings', 'enrollmentPeriod'), {
        ...formData,
        updatedAt: new Date()
      });

      alert('Enrollment period settings saved!');
      fetchEnrollmentPeriod();
      
    } catch (error) {
      console.error('Error saving enrollment period:', error);
      alert('Error saving settings');
    }

    setSaving(false);
  };

  const isEnrollmentOpen = () => {
    if (!enrollmentPeriod || !enrollmentPeriod.isActive) return false;
    
    const now = new Date();
    const start = new Date(enrollmentPeriod.startDate);
    const end = new Date(enrollmentPeriod.endDate);
    
    return now >= start && now <= end;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="enrollment-period">
      <h2>Enrollment Period Settings</h2>
      <p className="subtitle">Configure when students can enroll</p>

      {/* Current Status */}
      <div className={`status-banner ${isEnrollmentOpen() ? 'open' : 'closed'}`}>
        <h3>
          {isEnrollmentOpen() ? '✓ Enrollment is Currently OPEN' : '✕ Enrollment is Currently CLOSED'}
        </h3>
        {enrollmentPeriod && (
          <p>
            {enrollmentPeriod.semester} | 
            {new Date(enrollmentPeriod.startDate).toLocaleDateString()} - 
            {new Date(enrollmentPeriod.endDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Settings Form */}
      <div className="period-form-container">
        <h3>Configure Enrollment Period</h3>
        <form onSubmit={handleSave} className="period-form">
          <div className="form-group">
            <label>Semester/School Year</label>
            <input
              type="text"
              name="semester"
              value={formData.semester}
              onChange={handleInputChange}
              placeholder="e.g., 1st Sem 2024-2025"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-group-checkbox">
            <label>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
              />
              <span>Enrollment is Active (students can enroll)</span>
            </label>
          </div>

          <button type="submit" disabled={saving} className="save-btn">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <h4>ℹ️ How it works:</h4>
        <ul>
          <li>Set the enrollment period dates</li>
          <li>Check "Enrollment is Active" to open enrollment</li>
          <li>Students can only enroll during the active period</li>
          <li>You can close enrollment anytime by unchecking "Active"</li>
        </ul>
      </div>
    </div>
  );
};

export default EnrollmentPeriod;