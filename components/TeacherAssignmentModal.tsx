import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import type { Teacher, SchoolYear, Subject, TeacherAssignment } from '../types';

interface CurriculumForAssignment {
    className: string;
    subjects: Subject[];
}

interface TeacherAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacher: Teacher;
    year: SchoolYear;
}

const TeacherAssignmentModal: React.FC<TeacherAssignmentModalProps> = ({ isOpen, onClose, teacher, year }) => {
    const { addNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(true);
    const [curriculum, setCurriculum] = useState<CurriculumForAssignment[]>([]);
    const [assignedSet, setAssignedSet] = useState<Set<string>>(new Set());

    const fetchAssignments = useCallback(async () => {
        if (!teacher || !year) return;
        setIsLoading(true);
        try {
            const [curriculumData, assignmentData] = await Promise.all([
                apiFetch(`/curriculum-for-assignment?yearId=${year.id}`),
                apiFetch(`/teacher-assignments?teacherId=${teacher.id}&yearId=${year.id}`)
            ]);
            
            setCurriculum(curriculumData);
            
            const initialAssignments = new Set(
                (assignmentData as TeacherAssignment[]).map((a) => `${a.class_name}:${a.subject_id}`)
            );
            setAssignedSet(initialAssignments);

        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [teacher, year, addNotification]);

    useEffect(() => {
        if (isOpen) {
            fetchAssignments();
        }
    }, [isOpen, fetchAssignments]);

    const handleCheckboxChange = (className: string, subjectId: number) => {
        const key = `${className}:${subjectId}`;
        setAssignedSet(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        const assignments = Array.from(assignedSet).map(key => {
            const [className, subjectId] = key.split(':');
            return { className, subjectId: Number(subjectId) };
        });

        try {
            await apiFetch('/teacher-assignments/bulk-update', {
                method: 'POST',
                body: JSON.stringify({
                    teacherId: teacher.id,
                    yearId: year.id,
                    assignments,
                }),
            });
            addNotification({ type: 'success', message: 'Assignations mises à jour.' });
            onClose();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div 
                className="bg-slate-50 rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 my-8 h-[80vh] flex flex-col" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-shrink-0 flex justify-between items-start mb-4 border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold font-display text-slate-800">Assignations des Cours</h2>
                        <p className="text-slate-600">
                            Professeur: <span className="font-semibold">{teacher.prenom} {teacher.nom}</span> | Année: <span className="font-semibold">{year.name}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {isLoading ? (
                        <p>Chargement du programme...</p>
                    ) : curriculum.length === 0 ? (
                        <p className="text-center italic text-slate-500 py-10">
                           Aucun programme (matières par classe) n'a été défini pour l'année {year.name}. 
                           Veuillez le faire dans l'onglet "Programme" avant d'assigner des professeurs.
                        </p>
                    ) : (
                        curriculum.map(classInfo => (
                            <div key={classInfo.className} className="bg-white p-4 rounded-lg shadow-sm">
                                <h3 className="font-bold text-lg text-blue-700 mb-3 border-b pb-2">{classInfo.className}</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                                    {classInfo.subjects.map(subject => (
                                        <label key={subject.id} className="flex items-center space-x-2 cursor-pointer p-1 rounded hover:bg-slate-100">
                                            <input
                                                type="checkbox"
                                                checked={assignedSet.has(`${classInfo.className}:${subject.id}`)}
                                                onChange={() => handleCheckboxChange(classInfo.className, subject.id)}
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-700">{subject.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex-shrink-0 flex justify-end items-center pt-4 border-t mt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 rounded-lg text-slate-800 hover:bg-slate-300">Annuler</button>
                    <button onClick={handleSave} className="px-6 py-2 ml-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Sauvegarder</button>
                </div>
            </div>
        </div>
    );
};

export default TeacherAssignmentModal;