import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import TimetableManager from './TimetableManager';

const TimetablePage: React.FC = () => {
    const { hasPermission } = useAuth();
    const navigate = ReactRouterDOM.useNavigate();

    // Secure this page with a specific permission check
    React.useEffect(() => {
        if (!hasPermission('settings:manage_timetable')) {
            // Redirect to dashboard if the user does not have the required permission
            navigate('/dashboard', { replace: true });
        }
    }, [hasPermission, navigate]);

    // Render nothing or a loading state while checking, or let the redirect happen
    if (!hasPermission('settings:manage_timetable')) {
        return null;
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <header className="mb-8">
                <ReactRouterDOM.Link to="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                    Retour à l'accueil
                </ReactRouterDOM.Link>
                <h1 className="text-4xl font-bold text-gray-800 font-display">Gestion de l'Emploi du Temps</h1>
                <p className="text-lg text-slate-500 mt-2">Construisez et gérez l'horaire des cours pour l'établissement.</p>
            </header>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <TimetableManager />
            </div>
        </div>
    );
};

export default TimetablePage;