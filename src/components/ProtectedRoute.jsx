// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userRole } = useAuth();

  // If not logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // If role is not allowed, redirect to correct dashboard
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/student/dashboard" replace />;
    }
  }

  // If everything is good, show the page
  return children;
};

export default ProtectedRoute;