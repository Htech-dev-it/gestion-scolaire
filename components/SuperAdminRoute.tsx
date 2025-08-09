import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface SuperAdminRouteProps {
  children: React.ReactElement;
}

const SuperAdminRoute: React.FC<SuperAdminRouteProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = ReactRouterDOM.useLocation();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement de la session...</div>;
  }

  if (!isAuthenticated) {
    return <ReactRouterDOM.Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'superadmin' && user?.role !== 'superadmin_delegate') {
    // Si l'utilisateur est connecté mais n'est pas un superadmin, on le redirige vers l'accueil
    return <ReactRouterDOM.Navigate to="/" replace />;
  }

  return children;
};

export default SuperAdminRoute;