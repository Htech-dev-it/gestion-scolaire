import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import type { Instance } from '../types';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
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
      const response = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      // If apiFetch succeeds, we are guaranteed to have an accessToken.
      const user = login(response.accessToken);
      
      // NEW: Check user status for password policy
      if (user?.status === 'temporary_password') {
          addNotification({ type: 'info', message: 'Mise à jour de sécurité requise.' });
          navigate('/force-password-change', { replace: true });
      } else if (user?.role === 'teacher') {
          navigate('/teacher', { replace: true });
      } else if (user?.role === 'student') {
          navigate('/student', { replace: true });
      } else if (user?.role === 'superadmin' || user?.role === 'superadmin_delegate') {
          navigate('/superadmin', { replace: true });
      } else {
          navigate('/dashboard', { replace: true });
      }

    } catch (err) {
      // apiFetch is designed to throw an error with a user-friendly message from the server on failure.
      if (err instanceof Error && err.message) {
        addNotification({ type: 'error', message: err.message });
      } else {
        addNotification({ type: 'error', message: "Une erreur inattendue est survenue." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex w-full h-screen">
             {/* Left Side (Form) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#F8F9FA]">
                <div className="w-full max-w-md">
                     <div className="text-center mb-8">
                       <img src="/scolalink_logo.jpg" alt="Logo ScolaLink" className="h-20 mx-auto mb-2 object-contain" />
                       <p className="text-2xl font-bold" style={{ color: '#F27438' }}>ScolaLink</p>
                       <hr className="w-48 mx-auto my-3 border-slate-300" />
                       <h1 className="text-4xl font-bold text-[#1A202C] font-display">{instanceInfo?.name || 'IT-School'}</h1>
                       <p className="mt-2 text-slate-600">Portail de Gestion Scolaire</p>
                      <h2 className="text-2xl font-semibold text-slate-800 mt-8">Connexion</h2>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="username-address" className="sr-only">Nom d'utilisateur</label>
                            <div className="flex items-center gap-3 w-full bg-white rounded-xl shadow-lg border border-blue-600 transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2 px-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                <input
                                    id="username-address"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    className="flex-1 min-w-0 !mt-0 !p-0 !rounded-none !border-0 bg-white placeholder-slate-400 text-slate-900 focus:!outline-none focus:!ring-0 sm:text-sm !py-3"
                                    placeholder="Nom d'utilisateur"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="sr-only">Mot de passe</label>
                            <div className="flex items-center gap-3 w-full bg-white rounded-xl shadow-lg border border-blue-600 transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2 pl-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <input
                                    id="password"
                                    name="password"
                                    type={passwordVisible ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    className="flex-1 min-w-0 !mt-0 !p-0 !rounded-none !border-0 bg-white placeholder-slate-400 text-slate-900 focus:!outline-none focus:!ring-0 sm:text-sm !py-3"
                                    placeholder="Mot de passe"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setPasswordVisible(!passwordVisible)}
                                    className="text-gray-500 hover:text-gray-700 p-3"
                                    aria-label={passwordVisible ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                                >
                                    {passwordVisible ? (
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C3.732 4.943 7.523 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-7.03 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 8.473 16.559 7.142 14.478 6.135L13.707 5.364A1 1 0 0013.707 2.293L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M2 10s3.939 6 8 6 8-6 8-6-3.939-6-8-6S2 10 2 10zm10.894 2.894l-3.788-3.788A2.002 2.002 0 0110 8a2 2 0 112.894 2.894z" /></svg>
                                    )}
                                </button>
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

                     <div className="text-center text-sm text-slate-500 mt-8">
                        <ReactRouterDOM.Link to="/" className="font-medium text-blue-600 hover:text-blue-800">
                            ← Retour à la page de présentation
                        </ReactRouterDOM.Link>
                    </div>
                </div>
            </div>

            {/* Right Side (Image) */}
            <div className="hidden lg:block lg:w-1/2">
                <img src="/login_image.jpg" alt="Illustration de connexion" className="w-full h-full object-cover" />
            </div>
        </div>
    </div>
  );
};

export default LoginPage;