import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = ReactRouterDOM.useLocation();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement de la session...</div>;
  }

  if (!isAuthenticated) {
    // Redirige vers la page de connexion, en mémorisant l'emplacement précédent
    return <ReactRouterDOM.Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si l'utilisateur a un mot de passe temporaire, le forcer à le changer
  if (user?.status === 'temporary_password' && location.pathname !== '/force-password-change') {
    return <ReactRouterDOM.Navigate to="/force-password-change" state={{ from: location }} replace />;
  }
  
  // Si l'utilisateur a déjà changé son mot de passe et essaie d'accéder à la page de force-change, le rediriger
  if (user?.status === 'active' && location.pathname === '/force-password-change') {
     const redirectTo = user.role === 'student' ? '/student' : '/dashboard';
     return <ReactRouterDOM.Navigate to={redirectTo} replace />;
  }


  return children;
};

export default ProtectedRoute;
