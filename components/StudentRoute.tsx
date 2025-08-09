import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface StudentRouteProps {
  children: React.ReactElement;
}

const StudentRoute: React.FC<StudentRouteProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = ReactRouterDOM.useLocation();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement de la session...</div>;
  }

  if (!isAuthenticated) {
    return <ReactRouterDOM.Navigate to="/login" state={{ from: location }} replace />;
  }

  // Allow admins to access student routes, but redirect others.
  if (user?.role !== 'student' && user?.role !== 'admin') {
    return <ReactRouterDOM.Navigate to="/" replace />;
  }

  return children;
};

export default StudentRoute;