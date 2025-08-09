import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import type { Instance } from '../types';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = ReactRouterDOM.useNavigate();
  const { addNotification } = useNotification();
  const [instanceInfo, setInstanceInfo] = useState<Instance | null>(null);

  useEffect(() => {
    const fetchInstanceInfo = async () => {
      try {
        const data = await apiFetch('/instance/default');
        setInstanceInfo(data);
      } catch (error) {
        console.error("Could not fetch school name", error);
      }
    };
    fetchInstanceInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { accessToken, message } = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (message) {
        addNotification({ type: 'error', message });
        setIsLoading(false);
        return;
      }

      const user = login(accessToken);
      
      if (user?.role === 'teacher') {
          navigate('/teacher');
      } else if (user?.role === 'student') {
          navigate('/student');
      } else if (user?.role === 'superadmin' || user?.role === 'superadmin_delegate') {
          navigate('/superadmin');
      }
       else {
          navigate('/dashboard');
      }

    } catch (err) {
      if (err instanceof Error) {
        addNotification({ type: 'error', message: err.message });
      } else {
        addNotification({ type: 'error', message: 'Une erreur inconnue est survenue.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8F9FA] px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 via-transparent to-transparent"></div>
      <div className="relative w-full max-w-md p-8 space-y-8 bg-white/70 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl">
        <div className="text-center">
           <img src="/scolalink_logo.jpg" alt="Logo ScolaLink" className="h-20 mx-auto mb-2 object-contain" />
           <p className="text-2xl font-bold" style={{ color: '#F27438' }}>ScolaLink</p>
           <hr className="w-48 mx-auto my-3 border-slate-300" />
           <h1 className="text-4xl font-bold text-[#1A202C] font-display">{instanceInfo?.name || 'École de Démonstration'}</h1>
           <p className="mt-2 text-slate-600">Portail de Gestion Scolaire</p>
          <h2 className="text-2xl font-semibold text-slate-800 mt-8">Connexion</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username-address" className="sr-only">Nom d'utilisateur</label>
              <input
                id="username-address"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="relative block w-full px-4 py-3 bg-white border border-slate-300 placeholder-slate-400 text-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/50 focus:border-[#4A90E2] focus:z-10 sm:text-sm"
                placeholder="Nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Mot de passe</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full px-4 py-3 bg-white border border-slate-300 placeholder-slate-400 text-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/50 focus:border-[#4A90E2] focus:z-10 sm:text-sm"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-md text-white bg-[#4A90E2] hover:bg-[#357ABD] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 focus:ring-[#4A90E2] disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </div>
        </form>
         <div className="text-center text-sm text-slate-500">
            <ReactRouterDOM.Link to="/" className="font-medium text-blue-600 hover:text-blue-800">
                ← Retour à la page de présentation
            </ReactRouterDOM.Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
