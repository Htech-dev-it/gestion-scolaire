import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface AdminRouteProps {
  children: React.ReactElement;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = ReactRouterDOM.useLocation();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement de la session...</div>;
  }

  if (!isAuthenticated) {
    return <ReactRouterDOM.Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    // Si l'utilisateur est connecté mais n'est pas admin, on le redirige vers l'accueil
    return <ReactRouterDOM.Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;