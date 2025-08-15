import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface AdminRouteProps {
  children: React.ReactElement;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();
  const location = ReactRouterDOM.useLocation();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement de la session...</div>;
  }

  if (!isAuthenticated) {
    return <ReactRouterDOM.Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasPermission('user:manage')) {
    // Si l'utilisateur est connecté mais n'a pas les permissions d'admin, on le redirige
    return <ReactRouterDOM.Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;