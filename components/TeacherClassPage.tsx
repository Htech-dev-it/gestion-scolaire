import React, { useState, useEffect, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { apiFetch } from '../utils/api';
import type { Enrollment, Subject, Instance } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import AttendanceModal from './AttendanceModal';
import TeacherReportModal from './TeacherReportModal';
import ResourceManager from './ResourceManager';

const Avatar: React.FC<{ student: Enrollment['student'], size?: string }> = ({ student, size = "h-10 w-10" }) => {
    if (!student) return <div className={`${size} rounded-full bg-slate-200`}></div>;
    const initials = `${student.prenom?.[0] || ''}${student.nom?.[0] || ''}`.toUpperCase();
    const colors = ['bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-red-200', 'bg-purple-200', 'bg-pink-200'];
    const color = colors[((student.nom?.charCodeAt(0) || 0) + (student.prenom?.charCodeAt(0) || 0)) % colors.length];

    if (student.photo_url) {
        return <img src={student.photo_url} alt={`${student.prenom} ${student.nom}`} className={`${size} rounded-full object-cover shadow-sm`}/>;
    }
    return <div className={`${size} rounded-full flex items-center justify-center font-bold text-slate-700 ${color} shadow-sm`}>{initials}</div>;
};

const TeacherClassPage: React.FC = () => {
    const { className, subjectId } = ReactRouterDOM.useParams<{ className: string; subjectId: string }>();
    const { addNotification } = useNotification();
    const { selectedYear } = useSchoolYear();

    const [roster, setRoster] = useState<Enrollment[]>([]);
    const [subject, setSubject] = useState<Subject | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAttendanceModalOpen, setAttendanceModalOpen] = useState(false);
    
    const [reportModalEnrollment, setReportModalEnrollment] = useState<Enrollment | null>(null);
    const [schoolInfo, setSchoolInfo] = useState<Instance | null>(null);
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const [assignmentId, setAssignmentId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        if (!className || !selectedYear || !subjectId) return;
        setIsLoading(true);
        try {
            const [rosterData, allSubjects, schoolInfoData] = await Promise.all([
                apiFetch(`/teacher/class-roster?className=${className}&yearId=${selectedYear.id}`),
                apiFetch('/subjects'),
                apiFetch('/instance/current')
            ]);
            setRoster(rosterData);
            const currentSubject = allSubjects.find((s: Subject) => s.id === Number(subjectId));
            setSubject(currentSubject || null);
            setSchoolInfo(schoolInfoData);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [className, selectedYear, subjectId, addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    useEffect(() => {
        const fetchAssignmentId = async () => {
            if (!selectedYear || !subjectId || !className) return;
            try {
                const assignment = await apiFetch(`/teacher/assignment?yearId=${selectedYear.id}&className=${className}&subjectId=${subjectId}`);
                setAssignmentId(assignment.id);
            } catch (error) {
                console.error("Could not fetch assignment ID:", error);
                setAssignmentId(null);
            }
        };
        fetchAssignmentId();
    }, [selectedYear, subjectId, className]);

    const handleOpenReportModal = (enrollment: Enrollment) => {
        setReportModalEnrollment(enrollment);
    };

    const handleCloseReportModal = () => {
        setReportModalEnrollment(null);
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <header className="mb-8">
                <ReactRouterDOM.Link to="/teacher" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                  Retour au tableau de bord
                </ReactRouterDOM.Link>
                <h1 className="text-4xl font-bold text-gray-800 font-display">{className}</h1>
                <p className="text-2xl text-slate-600 mt-2">{subject?.name}</p>
            </header>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-slate-700">Liste des Élèves ({roster.length})</h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsResourceModalOpen(true)}
                            className="px-4 py-2 text-white bg-purple-600 rounded-lg shadow-md hover:bg-purple-700 flex items-center gap-2"
                            disabled={isLoading || !assignmentId}
                            title={!assignmentId ? "Impossible de trouver l'assignation pour ce cours" : "Gérer les ressources du cours"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                            Gérer les ressources
                        </button>
                        <button 
                            onClick={() => setAttendanceModalOpen(true)}
                            className="px-4 py-2 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 flex items-center gap-2"
                            disabled={isLoading || roster.length === 0}
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                            Faire l'appel
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <p className="text-center text-slate-500 py-8">Chargement de la liste...</p>
                ) : roster.length === 0 ? (
                    <p className="text-center text-slate-500 py-8 italic">Aucun élève inscrit dans cette classe.</p>
                ) : (
                    <ul className="divide-y divide-slate-200">
                        {roster.map(enrollment => (
                            <li key={enrollment.id} className="py-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Avatar student={enrollment.student} />
                                    <div>
                                        <p className="font-medium text-slate-800">{enrollment.student?.prenom} {enrollment.student?.nom}</p>
                                    </div>
                                </div>
                                <div>
                                    <button 
                                        onClick={() => handleOpenReportModal(enrollment)}
                                        className="px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200 transition">
                                        Gérer les Notes
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            
            {selectedYear && subjectId && (
                <AttendanceModal 
                    isOpen={isAttendanceModalOpen}
                    onClose={() => setAttendanceModalOpen(false)}
                    enrollments={roster}
                    subjectId={Number(subjectId)}
                    year={selectedYear}
                    className={className!}
                />
            )}

            {reportModalEnrollment && selectedYear && schoolInfo && subjectId && (
                <TeacherReportModal
                    isOpen={!!reportModalEnrollment}
                    onClose={handleCloseReportModal}
                    initialEnrollment={reportModalEnrollment}
                    classRoster={roster}
                    year={selectedYear}
                    schoolInfo={schoolInfo}
                    subjectId={Number(subjectId)}
                    subjectName={subject?.name || ''}
                    className={className || ''}
                />
            )}

            {isResourceModalOpen && assignmentId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={() => setIsResourceModalOpen(false)}>
                    <div className="bg-slate-50 rounded-xl shadow-2xl p-6 w-full max-w-3xl mx-4 my-8 h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex-shrink-0 flex justify-between items-start mb-4 border-b pb-4">
                            <div>
                                <h2 className="text-2xl font-bold font-display text-slate-800">Ressources du cours</h2>
                                <p className="text-slate-600">{subject?.name} - {className}</p>
                            </div>
                            <button onClick={() => setIsResourceModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto pr-2">
                            <ResourceManager assignmentId={assignmentId} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherClassPage;