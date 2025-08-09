import React, { useState, useEffect, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useSchoolYear } from '../../contexts/SchoolYearContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useStudentAccess } from '../../contexts/StudentAccessContext';
import type { StudentGradeData } from '../../types';

const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
    <div className="w-full bg-slate-200 rounded-full h-2.5">
        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min(value, 100)}%` }}></div>
    </div>
);

const AccessRestrictedMessage: React.FC = () => (
    <div className="p-8 bg-white rounded-xl shadow-md text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        <h2 className="mt-4 text-2xl font-bold text-slate-800 font-display">Accès Restreint</h2>
        <p className="mt-2 text-slate-600">L'accès à vos notes est actuellement restreint par l'administration.</p>
        <p className="mt-1 text-sm text-slate-500">Veuillez vous rapprocher du secrétariat pour plus d'informations.</p>
    </div>
);


const StudentGradesPage: React.FC = () => {
    const { selectedYear } = useSchoolYear();
    const { addNotification } = useNotification();
    const { accessStatus, isLoading: isAccessStatusLoading } = useStudentAccess();
    
    const [gradeData, setGradeData] = useState<StudentGradeData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activePeriodId, setActivePeriodId] = useState<number | null>(null);

    const isAccessRestricted = !isAccessStatusLoading && !accessStatus?.grades_access_enabled;

    const fetchGrades = useCallback(async () => {
        if (!selectedYear || isAccessRestricted) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await apiFetch(`/student/grades?yearId=${selectedYear.id}`);
            setGradeData(data);
            if (data.length > 0) {
                setActivePeriodId(data[0].period_id);
            }
        } catch (error) {
            // Error handling is mostly for non-403 errors now, as 403 is pre-empted
            if (error instanceof Error) {
                addNotification({ type: 'error', message: error.message });
            }
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear, addNotification, isAccessRestricted]);

    useEffect(() => {
        if (!isAccessStatusLoading) {
            fetchGrades();
        }
    }, [fetchGrades, isAccessStatusLoading]);

    const activePeriodData = gradeData.find(p => p.period_id === activePeriodId);

    const renderContent = () => {
        if (isLoading || isAccessStatusLoading) return <div className="text-center p-10 text-slate-500">Chargement des notes...</div>;
        if (isAccessRestricted) return <AccessRestrictedMessage />;
        if (gradeData.length === 0) return <div className="text-center p-10 bg-white rounded-lg shadow-md">Aucune note trouvée pour cette année scolaire.</div>;

        return (
            <>
                <div className="mb-6 border-b border-slate-200">
                    <div className="flex items-center space-x-2">
                        {gradeData.map(period => (
                            <button key={period.period_id} onClick={() => setActivePeriodId(period.period_id)} className={`px-4 py-2 font-medium text-sm rounded-t-md transition-colors ${activePeriodId === period.period_id ? 'bg-white border border-slate-200 border-b-white -mb-px' : 'text-slate-500 hover:bg-slate-100'}`}>{period.period_name}</button>
                        ))}
                    </div>
                </div>

                {activePeriodData && (
                    <div className="space-y-6">
                         <div className="p-6 bg-white rounded-xl shadow-md">
                             <div className="flex justify-between items-baseline">
                                <h2 className="text-xl font-bold text-slate-800 font-display">Résumé de la Période</h2>
                                <div>
                                    <span className="text-slate-500">Moyenne Générale: </span>
                                    <span className="text-2xl font-bold text-blue-700">{(typeof activePeriodData.period_average === 'number' ? activePeriodData.period_average : 0).toFixed(2)}%</span>
                                </div>
                             </div>
                             {activePeriodData.general_appreciation && <blockquote className="mt-4 p-3 bg-slate-50 border-l-4 border-slate-300 text-slate-600 italic">"{activePeriodData.general_appreciation}"</blockquote>}
                         </div>

                         {activePeriodData.subjects.map(subject => (
                            <div key={subject.subject_id} className="p-6 bg-white rounded-xl shadow-md">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-slate-700">{subject.subject_name}</h3>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-slate-800">{(typeof subject.average === 'number' && subject.max_grade > 0 ? (subject.average / subject.max_grade * 100) : 0).toFixed(2)}%</p>
                                        <p className="text-xs text-slate-500">Moyenne</p>
                                    </div>
                                </div>
                                {subject.appreciation && <blockquote className="mb-4 p-2 bg-blue-50 text-blue-800 text-sm rounded-md italic">"{subject.appreciation}"</blockquote>}
                                {subject.grades.length > 0 ? (
                                    <table className="w-full text-sm">
                                        <thead><tr className="border-b"><th className="p-2 text-left font-medium text-slate-500">Évaluation</th><th className="p-2 text-center font-medium text-slate-500">Note</th></tr></thead>
                                        <tbody>
                                            {subject.grades.map(grade => (
                                                <tr key={grade.id}><td className="p-2">{grade.evaluation_name}</td><td className="p-2 text-center font-mono">{grade.score} / {grade.max_score}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-center text-sm text-slate-400 italic py-4">Aucune évaluation pour cette matière.</p>
                                )}
                            </div>
                         ))}
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <header className="mb-8">
                <ReactRouterDOM.Link to="/student" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>Retour</ReactRouterDOM.Link>
                <h1 className="text-4xl font-bold text-gray-800 font-display">Mes Notes</h1>
                <p className="text-lg text-slate-500 mt-2">Suivez vos résultats pour l'année {selectedYear?.name}</p>
            </header>
            {renderContent()}
        </div>
    );
};

export default StudentGradesPage;