import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import type { Enrollment, SchoolYear } from '../types';

interface AttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    enrollments: Enrollment[];
    subjectId: number;
    year: SchoolYear;
    className: string;
}

type Status = 'present' | 'absent' | 'late';

const AttendanceModal: React.FC<AttendanceModalProps> = ({ isOpen, onClose, enrollments, subjectId, year }) => {
    const { addNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(false);
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [statuses, setStatuses] = useState<Record<number, Status>>({});

    const fetchAttendanceForDate = useCallback(async () => {
        if (!attendanceDate || enrollments.length === 0) {
            setStatuses({});
            return;
        }
        setIsLoading(true);
        try {
            const enrollmentIds = enrollments.map(e => e.id).join(',');
            const data = await apiFetch(`/attendance?enrollmentIds=${enrollmentIds}&subjectId=${subjectId}&date=${attendanceDate}`);
            
            const newStatuses: Record<number, Status> = {};
            // Set all to present by default
            enrollments.forEach(e => newStatuses[e.id] = 'present');
            // Then override with fetched data
            data.forEach((record: { enrollment_id: number, status: Status }) => {
                newStatuses[record.enrollment_id] = record.status;
            });
            setStatuses(newStatuses);

        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [attendanceDate, enrollments, subjectId, addNotification]);

    useEffect(() => {
        if (isOpen) {
            fetchAttendanceForDate();
        }
    }, [isOpen, fetchAttendanceForDate]);

    const handleStatusChange = (enrollmentId: number, status: Status) => {
        setStatuses(prev => ({ ...prev, [enrollmentId]: status }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        const records = Object.entries(statuses).map(([enrollment_id, status]) => ({
            enrollment_id: Number(enrollment_id),
            status
        }));
        
        try {
            const result = await apiFetch('/attendance/bulk-update', {
                method: 'POST',
                body: JSON.stringify({ subjectId, date: attendanceDate, records }),
            });
            if(result?.queued) {
                 addNotification({ type: 'info', message: 'Feuille d\'appel sauvegardée et en attente de synchronisation.' });
            } else {
                addNotification({ type: 'success', message: 'Feuille d\'appel enregistrée.' });
            }
            onClose();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const StatusButton: React.FC<{ enrollmentId: number, status: Status, label: string, color: string }> = 
      ({ enrollmentId, status, label, color }) => (
        <button
            onClick={() => handleStatusChange(enrollmentId, status)}
            className={`px-3 py-1.5 text-sm rounded-md transition-all w-24
                ${statuses[enrollmentId] === status 
                    ? `${color} text-white shadow-md` 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`
            }
        >
            {label}
        </button>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div 
                className="bg-slate-50 rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 my-8 h-[90vh] flex flex-col" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-shrink-0 flex justify-between items-center mb-4 border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold font-display text-slate-800">Feuille d'Appel</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <input 
                            type="date" 
                            value={attendanceDate} 
                            onChange={e => setAttendanceDate(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg shadow-sm"
                        />
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2">
                    {isLoading ? (
                        <p className="text-center py-10">Chargement...</p>
                    ) : (
                        <ul className="space-y-2">
                            {enrollments.map(enrollment => (
                                <li key={enrollment.id} className="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between">
                                    <p className="font-medium text-slate-700">{enrollment.student?.prenom} {enrollment.student?.nom}</p>
                                    <div className="flex items-center space-x-2">
                                        <StatusButton enrollmentId={enrollment.id} status="present" label="Présent" color="bg-green-500" />
                                        <StatusButton enrollmentId={enrollment.id} status="absent" label="Absent" color="bg-red-500" />
                                        <StatusButton enrollmentId={enrollment.id} status="late" label="En retard" color="bg-yellow-500" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex-shrink-0 flex justify-end items-center pt-4 border-t mt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 rounded-lg text-slate-800 hover:bg-slate-300">Annuler</button>
                    <button onClick={handleSave} disabled={isLoading} className="px-6 py-2 ml-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400">
                        {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceModal;