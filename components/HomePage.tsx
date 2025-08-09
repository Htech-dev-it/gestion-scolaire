import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { CLASSES } from '../constants';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import type { Instance } from '../types';
import { useAuth } from '../auth/AuthContext';

interface NavCardProps {
    to: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
}

const NavCard: React.FC<NavCardProps> = ({ to, icon, title, description, color }) => (
  <ReactRouterDOM.Link
    to={to}
    className="group relative block p-8 bg-white rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl hover:border-blue-300 transition-all duration-300 ease-in-out"
  >
    <div className="relative z-10">
        <div className={`flex-shrink-0 h-16 w-16 mb-6 rounded-xl flex items-center justify-center text-white ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold text-slate-800 font-display">{title}</p>
          <p className="text-sm text-slate-500 mt-2">{description}</p>
        </div>
    </div>
  </ReactRouterDOM.Link>
);


const HomePage: React.FC = () => {
  const { addNotification } = useNotification();
  const [instanceInfo, setInstanceInfo] = useState<Instance | null>(null);
  const { user } = useAuth();
  const navigate = ReactRouterDOM.useNavigate();

  useEffect(() => {
    // Redirect users to their specific dashboards
    if (user?.role === 'teacher') {
      navigate('/teacher', { replace: true });
    } else if (user?.role === 'student') {
      navigate('/student', { replace: true });
    } else if (user?.role === 'superadmin' || user?.role === 'superadmin_delegate') {
      navigate('/superadmin', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchInstanceInfo = async () => {
      try {
        const data = await apiFetch('/instance/current');
        setInstanceInfo(data);
      } catch (error) {
        if (error instanceof Error) {
          addNotification({ type: 'error', message: error.message });
        }
      }
    };
    // Only fetch data if the user is not being redirected
    if (user?.role !== 'teacher' && user?.role !== 'student' && user?.role !== 'superadmin' && user?.role !== 'superadmin_delegate') {
      fetchInstanceInfo();
    }
  }, [addNotification, user]);

  // Render a loading state or nothing while redirecting
  if (user?.role === 'teacher' || user?.role === 'student' || user?.role === 'superadmin' || user?.role === 'superadmin_delegate') {
    return <div className="flex items-center justify-center min-h-screen">Redirection en cours...</div>;
  }
  
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="text-center mb-20">
          {instanceInfo?.logo_url && (
            <img src={instanceInfo.logo_url} alt="Logo de l'école" className="h-24 mx-auto mb-6 object-contain" />
          )}
          <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#4A90E2] via-[#1A202C] to-[#1A202C] font-display">
            {instanceInfo?.name || 'ScolaLink'}
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mt-4 max-w-2xl mx-auto">
            Plateforme de Gestion Scolaire
          </p>
        </header>

        <main className="w-full space-y-24">
            <section>
                <h2 className="text-3xl font-bold text-center text-slate-800 mb-12 font-display">Actions Principales</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <NavCard
                        to="/students"
                        title="Gestion des Élèves"
                        description="Ajouter, inscrire et gérer tous les élèves"
                        color="bg-[#4A90E2]"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-18 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /></svg>}
                    />
                    <NavCard
                        to="/report-cards"
                        title="Gestion des Bulletins"
                        description="Générer les bulletins par classe et période"
                        color="bg-purple-500"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                    />
                     <NavCard
                        to="/report"
                        title="Rapports Financiers"
                        description="Consulter l'historique financier complet"
                        color="bg-teal-500"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" /></svg>}
                    />
                    <NavCard
                        to="/reports/attendance"
                        title="Suivi des Présences"
                        description="Consulter les registres de présence par classe"
                        color="bg-[#F5A623]"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    />
                 </div>
            </section>
            
            <section>
                <h2 className="text-3xl font-bold text-center text-slate-800 mb-12 font-display">Accès Rapide aux Paiements</h2>
                 <div className="flex flex-wrap justify-center gap-4">
                    {CLASSES.map((className) => (
                      <ReactRouterDOM.Link
                        key={className}
                        to={`/class/${className}`}
                        className="group px-6 py-3 bg-white rounded-full border border-slate-200 shadow-lg hover:shadow-xl hover:bg-blue-500 transform hover:-translate-y-1 transition-all duration-300 ease-in-out"
                      >
                         <span className="font-bold text-lg text-slate-700 group-hover:text-white transition-colors">{className}</span>
                      </ReactRouterDOM.Link>
                    ))}
                 </div>
            </section>
        </main>

        <footer className="w-full py-8 text-center text-slate-500 text-sm mt-16">
          <p>&copy; {new Date().getFullYear()} {instanceInfo?.name || 'ScolaLink'}. Tous droits réservés.</p>
          <p>Développé par beauchant509@gmail.com</p>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;