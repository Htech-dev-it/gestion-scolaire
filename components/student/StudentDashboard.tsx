import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import StudentChangePasswordForm from './StudentChangePasswordForm';
import { useSchoolYear } from '../../contexts/SchoolYearContext';
import { useStudentAccess } from '../../contexts/StudentAccessContext';
import Tooltip from '../Tooltip';
import { apiFetch } from '../../utils/api';
import type { StudentAnnouncement } from '../../types';

const NavCard: React.FC<{ to: string, title: string, description: string, icon: React.ReactNode, isDisabled?: boolean }> = ({ to, title, description, icon, isDisabled = false }) => {
    
    const cardContent = (
        <div className={`group block p-6 bg-white rounded-xl shadow-md transition-all duration-300 ease-in-out ${isDisabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:shadow-lg transform hover:-translate-y-1'}`}>
            <div className="flex items-center gap-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                    {icon}
                </div>
                <div>
                    <p className="text-xl font-bold text-slate-800 font-display">{title}</p>
                    <p className="text-sm text-slate-500">{description}</p>
                </div>
            </div>
        </div>
    );

    if (isDisabled) {
        return (
            <Tooltip text="L'accès à cette section est actuellement restreint. Veuillez vous rapprocher de l'administration.">
                {cardContent}
            </Tooltip>
        );
    }
    
    return <ReactRouterDOM.Link to={to}>{cardContent}</ReactRouterDOM.Link>;
};

const Announcements: React.FC = () => {
    const { selectedYear } = useSchoolYear();
    const [announcements, setAnnouncements] = useState<StudentAnnouncement[]>([]);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (!selectedYear) return;
        apiFetch(`/student/announcements?yearId=${selectedYear.id}`)
            .then(setAnnouncements)
            .catch(err => console.error("Failed to fetch announcements:", err));
    }, [selectedYear]);

    if (announcements.length === 0 || !visible) return null;

    return (
        <div className="p-4 mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-r-lg shadow relative">
             <button onClick={() => setVisible(false)} className="absolute top-2 right-2 p-1 text-yellow-500 hover:bg-yellow-200 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h4 className="font-bold">Message de l'Administration</h4>
            {announcements.map(ann => (
                <p key={ann.id} className="text-sm mt-2">{ann.content}</p>
            ))}
        </div>
    );
};

const StudentDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'security'>('overview');
    const { accessStatus, isLoading: isLoadingStatus } = useStudentAccess();

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-bold text-gray-800 font-display">
                    Bienvenue, {user?.prenom || user?.username}
                </h1>
                <p className="text-lg text-slate-500 mt-2">
                    Votre tableau de bord personnel.
                </p>
            </header>
            
            <Announcements />
            
            <div className="mb-6 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                    <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 font-medium text-sm rounded-md transition-colors ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>Aperçu</button>
                    <button onClick={() => setActiveTab('security')} className={`px-4 py-2 font-medium text-sm rounded-md transition-colors ${activeTab === 'security' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>Sécurité</button>
                </div>
            </div>

            <main>
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <NavCard to="/student/timetable" title="Emploi du temps" description="Consultez votre horaire de cours" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                        <NavCard to="/student/grades" title="Mes Notes" description="Suivez vos résultats académiques" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>} isDisabled={isLoadingStatus || !accessStatus?.grades_access_enabled} />
                        <NavCard to="/student/resources" title="Ressources" description="Accédez aux documents de cours" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>} />
                        <NavCard to="/student/finance" title="Mes Finances" description="Consultez votre historique de paiements" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                        <NavCard to="/student/docs" title="Documentation" description="Consultez le guide d'utilisation" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} />
                    </div>
                )}
                {activeTab === 'security' && (
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-2xl font-semibold text-slate-700 font-display mb-6">Changer mon mot de passe</h2>
                        <StudentChangePasswordForm />
                    </div>
                )}
            </main>
        </div>
    );
};

export default StudentDashboard;