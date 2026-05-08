// src/components/StudentDashboard.jsx
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Dashboard.css';

const StudentDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
        setLoading(false);
      }
    };
    fetchUserData();
  }, [currentUser]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Student Portal</h2>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </nav>
      
      <div className="dashboard-content">
        <div className="welcome-card">
          <h1>Welcome, {userData?.fullName || 'Student'}!</h1>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>📚 My Enrollment</h3>
            <p>View your current enrollment status</p>
          </div>
          
          <div className="dashboard-card">
            <h3>📖 Subjects</h3>
            <p>View enrolled subjects</p>
          </div>
          
          <div className="dashboard-card">
            <h3>📅 Schedule</h3>
            <p>View your class schedule</p>
          </div>
          
          <div className="dashboard-card">
            <h3>👤 Profile</h3>
            <p>View and update your profile</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;