// src/components/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setupUsers } from '../setupUsers';
import { setupSampleData } from '../setupData';
import { setupClassAssignments } from '../setupClassAssignments';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const studentIdRegex = /^\d{4}-\d{4}-[A-Z]$/;
    const isStudentId = studentIdRegex.test(username);
    const isAdmin = username.toUpperCase().startsWith('ADMIN');
    const isProf = username.toUpperCase().startsWith('PROF');

    if (!isStudentId && !isAdmin && !isProf) {
      setError('Invalid format');
      setLoading(false);
      return;
    }

    const result = await login(username, password);

    if (result.success) {
      if (result.role === 'admin') navigate('/admin/dashboard');
      else if (result.role === 'student') navigate('/student/dashboard');
      else if (result.role === 'professor') navigate('/professor/dashboard');
    } else {
      setError('Login failed. Check your credentials.');
    }

    setLoading(false);
  };

  const handleSetupUsers = async () => {
    if (!window.confirm('Create test users?')) return;
    setSetupStatus('⏳ Creating users...');
    try {
      const result = await setupUsers();
      setSetupStatus(
        `✅ Done! ${result.successCount} created, ${result.errorCount} failed. Check console for details.`
      );
    } catch (err) {
      console.error(err);
      setSetupStatus(`❌ Error: ${err.message}`);
    }
  };

  const handleSetupData = async () => {
    if (!window.confirm('Create sample courses and curriculum?')) return;
    setSetupStatus('⏳ Creating courses...');
    try {
      await setupSampleData();
      setSetupStatus('✅ Sample data created!');
    } catch (err) {
      console.error(err);
      setSetupStatus(`❌ Error: ${err.message}`);
    }
  };

  const handleSetupAssignments = async () => {
    if (!window.confirm('Assign professors to classes?')) return;
    setSetupStatus('⏳ Assigning classes...');
    try {
      await setupClassAssignments();
      setSetupStatus('✅ Class assignments created!');
    } catch (err) {
      console.error(err);
      setSetupStatus(`❌ Error: ${err.message}`);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Enrollment System</h1>
        <h2>Login</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              placeholder="Student ID or Username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Setup Buttons - REMOVE AFTER SETUP */}
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={handleSetupUsers}
            style={{ background: '#28a745', color: '#fff', padding: '8px', fontSize: '12px' }}
          >
            1. Setup Users
          </button>
          <button
            type="button"
            onClick={handleSetupData}
            style={{ background: '#17a2b8', color: '#fff', padding: '8px', fontSize: '12px' }}
          >
            2. Setup Data (Courses)
          </button>
          <button
            type="button"
            onClick={handleSetupAssignments}
            style={{ background: '#ffc107', color: '#000', padding: '8px', fontSize: '12px' }}
          >
            3. Setup Class Assignments
          </button>
        </div>

        {/* Status feedback */}
        {setupStatus && (
          <div style={{ marginTop: '10px', fontSize: '12px', padding: '8px', background: '#f8f9fa', borderRadius: '4px' }}>
            {setupStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;