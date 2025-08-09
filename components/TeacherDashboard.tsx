import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../utils/api';
import type { TeacherDashboardAssignment } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import ChangePasswordForm from './ChangePasswordForm';
import TeacherTimetableView from './TeacherTimetableView';

type TeacherTab = 'courses' | 'timetable' | 'security';

const TeacherDashboard: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const { selectedYear } = useSchoolYear();
    const [assignments, setAssignments] = useState<TeacherDashboardAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TeacherTab>('courses');

    useEffect(() => {
        if (activeTab !== 'courses') return;
        const fetchDashboardData = async () => {
            if (!user || !selectedYear) return;
            setIsLoading(true);
            try {
                const data = await apiFetch(`/teacher/dashboard?yearId=${selectedYear.id}`);
                setAssignments(data);
            } catch (error) {
                if (error instanceof Error) addNotification({ type: 'error', message: error.message });
                setAssignments([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, selectedYear, addNotification, activeTab]);
    
    const coursesByClass = useMemo(() => {
        return assignments.reduce((acc, course) => {
            if (!acc[course.class_name]) {
                acc[course.class_name] = [];
            }
            acc[course.class_name].push(course);
            return acc;
        }, {} as Record<string, TeacherDashboardAssignment[]>);
    }, [assignments]);

    const TabButton: React.FC<{ tabId: TeacherTab; children: React.ReactNode }> = ({ tabId, children }) => (
        <button
          onClick={() => setActiveTab(tabId)}
          className={`px-4 py-2 font-medium text-sm rounded-md transition-colors ${activeTab === tabId ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          {children}
        </button>
    );

    const renderCourses = () => (
        isLoading ? (
            <p>Chargement de vos cours...</p>
        ) : Object.keys(coursesByClass).length === 0 ? (
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <p className="text-slate-500">Vous n'avez aucun cours assigné pour l'année scolaire sélectionnée.</p>
                <p className="text-sm text-slate-400 mt-2">Veuillez contacter un administrateur si cela semble être une erreur.</p>
            </div>
        ) : (
            <div className="space-y-6">
                {Object.entries(coursesByClass).map(([className, courses]) => (
                    <div key={className} className="bg-white p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-bold text-blue-700 font-display mb-4">{className}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {courses.map(course => (
                                <ReactRouterDOM.Link 
                                    key={course.subject_id}
                                    to={`/teacher/class/${className}/subject/${course.subject_id}`}
                                    className="group block p-4 bg-slate-50 rounded-lg hover:bg-blue-100 hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-300"
                                >
                                    <p className="font-semibold text-slate-800">{course.subject_name}</p>
                                    <p className="text-sm text-blue-600 mt-1">Gérer la classe →</p>
                                </ReactRouterDOM.Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )
    );

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-bold text-gray-800 font-display">
                    Bienvenue, {user?.prenom || user?.username}
                </h1>
                <p className="text-lg text-slate-500 mt-2">
                    Votre tableau de bord pour l'année scolaire {selectedYear?.name}
                </p>
            </header>

            <main>
                <div className="mb-6 border-b border-slate-200">
                    <div className="flex items-center space-x-2">
                        <TabButton tabId="courses">Mes Cours</TabButton>
                        <TabButton tabId="timetable">Mon Emploi du temps</TabButton>
                        <TabButton tabId="security">Sécurité</TabButton>
                    </div>
                </div>

                {activeTab === 'courses' && (
                    <>
                        <h2 className="text-2xl font-semibold text-slate-700 font-display mb-6">Mes Cours Assignés</h2>
                        {renderCourses()}
                    </>
                )}

                {activeTab === 'timetable' && (
                     <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-2xl font-semibold text-slate-700 font-display mb-6">Mon Emploi du Temps</h2>
                        <TeacherTimetableView />
                    </div>
                )}


                {activeTab === 'security' && (
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-2xl font-semibold text-slate-700 font-display mb-6">Changer mon mot de passe</h2>
                        <ChangePasswordForm />
                    </div>
                )}
            </main>
        </div>
    );
};

export default TeacherDashboard;