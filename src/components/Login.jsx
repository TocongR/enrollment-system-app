// src/components/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check if it's a student ID (YYYY-XXXX-L format) or admin username
    const studentIdRegex = /^\d{4}-\d{4}-[A-Z]$/;
    const isStudentId = studentIdRegex.test(username);
    const isAdmin = username.toUpperCase().startsWith('ADMIN');

    // Validate format
    if (!isStudentId && !isAdmin) {
      setError('Invalid format. Use Student ID (e.g., 2023-3037-I) or Admin username (e.g., ADMIN-001)');
      setLoading(false);
      return;
    }

    const result = await login(username, password);
    
    if (result.success) {
      if (result.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (result.role === 'student') {
        navigate('/student/dashboard');
      }
    } else {
      setError('Login failed. Check your credentials.');
    }
    
    setLoading(false);
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
              placeholder="eg: 2023-3037-I"
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
      </div>
    </div>
  );
};

export default Login;