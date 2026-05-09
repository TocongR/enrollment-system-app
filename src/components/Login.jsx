// src/components/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setupUsers } from '../setupUsers';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const studentIdRegex = /^\d{4}-\d{4}-[A-Z]$/;
    const u = username.toUpperCase();
    const isStudentId = studentIdRegex.test(u);
    const isAdmin = u.startsWith('ADMIN');
    const isProf = u.startsWith('PROF');

    if (!isStudentId && !isAdmin && !isProf) {
      setError('Invalid username format.');
      return;
    }

    setLoading(true);
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

  const handleDevSetup = async () => {
    const confirmRun = window.confirm(
      "This will generate bulk test users, courses, and enrollments. Continue?"
    );
  
    if (!confirmRun) return;
  
    try {
      await setupUsers();
      alert("✅ Test environment created successfully!");
    } catch (error) {
      console.error(error);
      alert("❌ Setup failed. Check console.");
    }
  };

  return (
    <div className="flex h-screen font-sans">
      {/* Left Panel */}
      <div className="hidden md:flex w-5/12 bg-[#1a3a6b] flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5" />

        <div className="flex items-center gap-3 z-10">
          <span className="bg-[#f0c040] text-[#1a3a6b] font-bold text-sm px-3 py-1.5 rounded-md tracking-wide">
            ENROLL
          </span>
          <span className="text-white/50 text-xs">Student Portal</span>
        </div>

        <div className="z-10">
          <h1 className="text-white font-bold text-4xl leading-tight mb-6">
            <span className="text-[#f0c040]">Sign in</span> to your
            <br />enrollment
            <br />account.
          </h1>
        </div>

        <div /> {/* spacer */}
      </div>

      {/* Right Panel */}
      <div className="flex flex-1 items-center justify-center bg-white px-8">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8">Sign in</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toUpperCase())}
                className="w-full h-11 border border-gray-300 rounded-lg px-4 text-sm text-gray-900 outline-none focus:border-[#1a3a6b] focus:ring-2 focus:ring-[#1a3a6b]/10 transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 border border-gray-300 rounded-lg px-4 pr-11 text-sm text-gray-900 outline-none focus:border-[#1a3a6b] focus:ring-2 focus:ring-[#1a3a6b]/10 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#1a3a6b] hover:bg-[#14306b] text-white font-semibold rounded-full text-sm tracking-wide transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Signing in…' : 'Continue'}
            </button>
                     

          </form>
          
  <div className="mt-6 text-center">
    <button
      onClick={handleDevSetup}
      className="text-xs text-gray-400 hover:text-gray-600 underline"
    >
      Run Dev Setup
    </button>
  </div>

 
        </div>
      </div>
    </div>
  );
};

export default Login;