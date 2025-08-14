import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import ChangePasswordForm from './ChangePasswordForm';
import { Instance, SchoolYear, Subject, ClassSubject, AcademicPeriod, Teacher, FullTeacherAssignment, Announcement } from '../types';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import ConfirmationModal from './ConfirmationModal';
import Tooltip from './Tooltip';
import { CLASSES } from '../constants';
import TeacherAssignmentModal from './TeacherAssignmentModal';
import AuditLogViewer from './AuditLogViewer';
import PromotionManager from './PromotionManager';
import TimetableManager from './TimetableManager';
import StudentPortalManager from './StudentPortalManager';
import ResourceManager from './ResourceManager';
import PhoneInput from 'react-phone-input-2';

const SuspensionWarningBanner: React.FC<{ instance: Instance | null }> = ({ instance }) => {
    const [timeRemaining, setTimeRemaining] = useState('');
    const [level, setLevel] = useState<'info' | 'warning' | 'danger' | null>(null);

    useEffect(() => {
        if (!instance?.expires_at) {
            setLevel(null);
            return;
        }

        const interval = setInterval(() => {
            const expirationDate = new Date(instance.expires_at!);
            const now = new Date();
            const diff = expirationDate.getTime() - now.getTime();

            if (diff <= 0) {
                setLevel('danger');
                setTimeRemaining("L'accès à cette instance a expiré et sera suspendu.");
                clearInterval(interval);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (days < 1) {
                setLevel('danger');
                setTimeRemaining(`Expire dans : ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
            } else if (days < 3) {
                setLevel('danger');
                setTimeRemaining(`Expire dans ${days} jour(s) et ${hours} heure(s).`);
            } else if (days < 7) {
                setLevel('warning');
                setTimeRemaining(`Votre accès expire dans ${days} jour(s).`);
            } else {
                setLevel(null);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [instance]);

    if (!level) return null;

    const styles = {
        warning: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-700', icon: 'text-orange-500' },
        danger: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-700', icon: 'text-red-500' },
        info: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700', icon: 'text-blue-500' },
    };
    const currentStyle = styles[level];

    return (
        <div className={`p-4 mb-6 border-l-4 rounded-r-lg shadow ${currentStyle.bg} ${currentStyle.border}`}>
            <div className="flex">
                <div className="py-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 mr-4 ${currentStyle.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                    <p className={`font-bold ${currentStyle.text}`}>Avertissement de Suspension</p>
                    <p className={`text-sm ${currentStyle.text}`}>{timeRemaining} Veuillez contacter le support pour le renouvellement.</p>
                </div>
            </div>
        </div>
    );
};


const SchoolYearManager: React.FC = () => {
    const { schoolYears, refreshYears, setSelectedYearById } = useSchoolYear();
    const { addNotification } = useNotification();
    const [newYearName, setNewYearName] = useState('');
    const [yearToDelete, setYearToDelete] = useState<SchoolYear | null>(null);

    const handleAddYear = async () => {
        if (!newYearName.match(/^\d{4}-\d{4}$/)) {
            addNotification({ type: 'error', message: "Format d'année invalide. Utilisez AAAA-AAAA." });
            return;
        }
        try {
            await apiFetch('/school-years', {
                method: 'POST',
                body: JSON.stringify({ name: newYearName })
            });
            addNotification({ type: 'success', message: `Année ${newYearName} ajoutée.` });
            setNewYearName('');
            refreshYears();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleSetCurrent = async (id: number) => {
        try {
            await apiFetch(`/school-years/${id}/set-current`, { method: 'PUT' });
            addNotification({ type: 'success', message: 'Année scolaire actuelle mise à jour.' });
            refreshYears();
            setSelectedYearById(id);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleDeleteRequest = (year: SchoolYear) => {
        setYearToDelete(year);
    };

    const handleConfirmDelete = async () => {
        if (!yearToDelete) return;
        try {
            await apiFetch(`/school-years/${yearToDelete.id}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: `L'année ${yearToDelete.name} a été supprimée.` });
            refreshYears();
            setYearToDelete(null);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
            setYearToDelete(null);
        }
    };


    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-700 font-display">Années Scolaires</h2>
            <div className="my-4 p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Ajouter une année scolaire</h3>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newYearName} 
                        onChange={e => setNewYearName(e.target.value)} 
                        placeholder="Ex: 2024-2025"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                    />
                    <button onClick={handleAddYear} className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 whitespace-nowrap">Ajouter</button>
                </div>
            </div>
            <ul className="space-y-2">
                {schoolYears.map(year => (
                    <li key={year.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="font-medium">{year.name}</span>
                        <div className="flex items-center gap-2">
                            {year.is_current ? (
                                <span className="px-3 py-1 text-xs font-bold text-white bg-green-600 rounded-full">Actuelle</span>
                            ) : (
                                <>
                                    <button onClick={() => handleSetCurrent(year.id)} className="px-3 py-1 text-xs text-slate-600 bg-slate-200 rounded-full hover:bg-slate-300">Définir comme actuelle</button>
                                    <Tooltip text={`Supprimer ${year.name}`}>
                                        <button 
                                            onClick={() => handleDeleteRequest(year)} 
                                            className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                                            aria-label={`Supprimer l'année ${year.name}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </Tooltip>
                                </>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
            {yearToDelete && (
                <ConfirmationModal
                    isOpen={!!yearToDelete}
                    onClose={() => setYearToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title={`Supprimer l'année ${yearToDelete.name}`}
                    message="Êtes-vous sûr de vouloir supprimer cette année scolaire ? Toutes les données associées (inscriptions, périodes, notes...) seront définitivement effacées. Cette action est irréversible."
                />
            )}
        </div>
    );
};

const PeriodManager: React.FC = () => {
    const { addNotification } = useNotification();
    const { schoolYears } = useSchoolYear();
    const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
    const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formState, setFormState] = useState<{ id: number | null, name: string }>({ id: null, name: '' });
    const [periodToDelete, setPeriodToDelete] = useState<AcademicPeriod | null>(null);

    useEffect(() => {
        const currentYear = schoolYears.find(y => y.is_current);
        if (currentYear) {
            setSelectedYearId(currentYear.id);
        } else if (schoolYears.length > 0) {
            setSelectedYearId(schoolYears[0].id);
        }
    }, [schoolYears]);

    const fetchPeriods = useCallback(async () => {
        if (!selectedYearId) return;
        setIsLoading(true);
        try {
            const data = await apiFetch(`/academic-periods?yearId=${selectedYearId}`);
            setPeriods(data);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [addNotification, selectedYearId]);

    useEffect(() => {
        fetchPeriods();
    }, [fetchPeriods]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.name.trim() || !selectedYearId) return;
        const isEditing = formState.id !== null;
        const url = isEditing ? `/academic-periods/${formState.id}` : '/academic-periods';
        const method = isEditing ? 'PUT' : 'POST';
        const body = { name: formState.name, year_id: selectedYearId };
        
        try {
            await apiFetch(url, { method, body: JSON.stringify(body) });
            addNotification({ type: 'success', message: `Période ${isEditing ? 'mise à jour' : 'ajoutée'}.` });
            setFormState({ id: null, name: '' });
            await fetchPeriods();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleConfirmDelete = async () => {
        if (!periodToDelete) return;
        try {
            await apiFetch(`/academic-periods/${periodToDelete.id}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: 'Période supprimée.' });
            setPeriodToDelete(null);
            await fetchPeriods();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-700 font-display">Gestion des Périodes (Trimestres, Étapes...)</h2>
            <div className="my-4">
                <label className="block text-sm font-medium text-gray-700">Année Scolaire</label>
                <select onChange={e => setSelectedYearId(Number(e.target.value))} value={selectedYearId || ''} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md">
                    {schoolYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
            </div>
            <div className="my-4 p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">{formState.id ? 'Modifier la période' : 'Ajouter une période'}</h3>
                <form onSubmit={handleFormSubmit} className="flex gap-2">
                    <input type="text" value={formState.name} onChange={e => setFormState(p => ({...p, name: e.target.value}))} placeholder="Ex: Trimestre 1" className="w-full px-3 py-2 border rounded-md" />
                    <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md">{formState.id ? 'Mettre à jour' : 'Ajouter'}</button>
                    {formState.id && <button type="button" onClick={() => setFormState({ id: null, name: '' })} className="px-4 py-2 bg-slate-100 rounded-md">Annuler</button>}
                </form>
            </div>
            {isLoading ? <p>Chargement...</p> : (
                <ul className="space-y-2">
                    {periods.map(period => (
                        <li key={period.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span>{period.name}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setFormState(period)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                <button onClick={() => setPeriodToDelete(period)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {periodToDelete && <ConfirmationModal isOpen={!!periodToDelete} onClose={() => setPeriodToDelete(null)} onConfirm={handleConfirmDelete} title="Supprimer Période" message={`Confirmez-vous la suppression de '${periodToDelete.name}' ? Toutes les notes associées seront perdues.`} />}
        </div>
    );
};


const SubjectManager: React.FC = () => {
    const { addNotification } = useNotification();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [formState, setFormState] = useState<{ id: number | null, name: string }>({ id: null, name: '' });
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

    const fetchSubjects = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch('/subjects');
            setSubjects(data);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        fetchSubjects();
    }, [fetchSubjects]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormState(prev => ({ ...prev, name: e.target.value }));
    };

    const handleEditRequest = (subject: Subject) => {
        setFormState({ id: subject.id, name: subject.name });
    };

    const resetForm = () => {
        setFormState({ id: null, name: '' });
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.name.trim()) {
            addNotification({ type: 'error', message: 'Le nom de la matière ne peut pas être vide.' });
            return;
        }

        const isEditing = formState.id !== null;
        const url = isEditing ? `/subjects/${formState.id}` : '/subjects';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await apiFetch(url, { method, body: JSON.stringify({ name: formState.name }) });
            addNotification({ type: 'success', message: `Matière ${isEditing ? 'mise à jour' : 'ajoutée'}.` });
            resetForm();
            await fetchSubjects();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleDeleteRequest = (subject: Subject) => {
        setSubjectToDelete(subject);
    };

    const handleConfirmDelete = async () => {
        if (!subjectToDelete) return;
        try {
            await apiFetch(`/subjects/${subjectToDelete.id}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: `La matière '${subjectToDelete.name}' a été supprimée.` });
            await fetchSubjects();
            setSubjectToDelete(null);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
            setSubjectToDelete(null);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-700 font-display">Gestion des Matières</h2>
            <div className="my-4 p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">{formState.id ? 'Modifier la matière' : 'Ajouter une nouvelle matière'}</h3>
                <form onSubmit={handleFormSubmit} className="flex gap-2">
                    <input 
                        type="text" 
                        value={formState.name} 
                        onChange={handleFormChange} 
                        placeholder="Ex: Mathématiques"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                    />
                    <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 whitespace-nowrap">{formState.id ? 'Mettre à jour' : 'Ajouter'}</button>
                    {formState.id && <button type="button" onClick={resetForm} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">Annuler</button>}
                </form>
            </div>
            {isLoading ? <p>Chargement des matières...</p> : (
                <ul className="space-y-2">
                    {subjects.map(subject => (
                        <li key={subject.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="font-medium">{subject.name}</span>
                            <div className="flex items-center gap-2">
                                <Tooltip text={`Modifier ${subject.name}`}>
                                    <button onClick={() => handleEditRequest(subject)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                    </button>
                                </Tooltip>
                                <Tooltip text={`Supprimer ${subject.name}`}>
                                    <button onClick={() => handleDeleteRequest(subject)} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                </Tooltip>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
             {subjectToDelete && (
                <ConfirmationModal
                    isOpen={!!subjectToDelete}
                    onClose={() => setSubjectToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title={`Supprimer la matière '${subjectToDelete.name}'`}
                    message="Êtes-vous sûr de vouloir supprimer cette matière ? Cette action est irréversible et affectera tous les programmes scolaires."
                />
            )}
        </div>
    );
};

const CurriculumManager: React.FC = () => {
    const { addNotification } = useNotification();
    const { selectedYear } = useSchoolYear();
    const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
    const [curriculum, setCurriculum] = useState<{ assigned: ClassSubject[], available: Subject[] }>({ assigned: [], available: [] });
    const [isLoading, setIsLoading] = useState(true);

    const fetchCurriculum = useCallback(async () => {
        if (!selectedYear || !selectedClass) return;
        setIsLoading(true);
        try {
            const data = await apiFetch(`/curriculum?yearId=${selectedYear.id}&className=${selectedClass}`);
            setCurriculum(data);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [addNotification, selectedYear, selectedClass]);

    useEffect(() => {
        fetchCurriculum();
    }, [fetchCurriculum]);

    const handleMoveSubject = async (subjectId: number, direction: 'assign' | 'unassign') => {
        if (!selectedYear) return;
        try {
            await apiFetch(`/curriculum/${direction}`, {
                method: 'POST',
                body: JSON.stringify({ yearId: selectedYear.id, className: selectedClass, subjectId })
            });
            addNotification({ type: 'success', message: `Matière ${direction === 'assign' ? 'assignée' : 'retirée'}.` });
            await fetchCurriculum();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleMaxGradeChange = async (classSubjectId: number, newMaxGrade: number) => {
        // Optimistic UI update for responsiveness
        setCurriculum(prev => ({
            ...prev,
            assigned: prev.assigned.map(s => s.id === classSubjectId ? { ...s, max_grade: newMaxGrade } : s)
        }));

        try {
            await apiFetch(`/curriculum/max-grade/${classSubjectId}`, {
                method: 'PUT',
                body: JSON.stringify({ max_grade: newMaxGrade })
            });
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
            // Re-fetch from server on error to ensure data consistency
            fetchCurriculum();
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-700 font-display">Programme par Classe</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">Assignez les matières qui seront enseignées dans chaque classe pour l'année scolaire <span className="font-semibold">{selectedYear?.name}</span>.</p>
            
            <div className="my-4">
                <label htmlFor="class-selector" className="block text-sm font-medium text-gray-700 mb-1">Sélectionner une classe</label>
                <select id="class-selector" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-100 border-2 border-slate-200 rounded-lg text-base text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm">
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {isLoading ? <p>Chargement...</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold mb-2 text-slate-800">Matières Assignées ({curriculum.assigned.length})</h3>
                        <div className="space-y-2 p-3 border rounded-lg bg-slate-50 min-h-[200px]">
                           {curriculum.assigned.length === 0 && <div className="text-slate-500 text-sm italic p-2">Aucune matière assignée.</div>}
                           {curriculum.assigned.map(subject => (
                                <div key={subject.id} className="flex justify-between items-center p-2 bg-white rounded-md shadow-sm">
                                    <span className="font-medium text-sm text-slate-700 flex-grow">{subject.subject_name}</span>
                                    <div className="flex items-center gap-2">
                                        <label htmlFor={`max-grade-${subject.id}`} className="text-xs font-medium text-slate-600">Note max:</label>
                                        <input
                                            id={`max-grade-${subject.id}`}
                                            type="number"
                                            value={subject.max_grade}
                                            onChange={e => handleMaxGradeChange(subject.id, Number(e.target.value))}
                                            className="w-20 p-1 border rounded text-sm"
                                        />
                                        <button onClick={() => handleMoveSubject(subject.subject_id, 'unassign')} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full transition-colors" title="Retirer">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </button>
                                    </div>
                                </div>
                           ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2 text-slate-800">Matières Disponibles ({curriculum.available.length})</h3>
                        <div className="space-y-2 p-3 border rounded-lg bg-slate-50 min-h-[200px]">
                           {curriculum.available.length === 0 && <div className="text-slate-500 text-sm italic p-2">Toutes les matières sont assignées.</div>}
                           {curriculum.available.map(subject => (
                                <div key={subject.id} className="flex justify-between items-center p-2 bg-white rounded-md shadow-sm">
                                    <span className="font-medium text-sm text-slate-700">{subject.name}</span>
                                    <button onClick={() => handleMoveSubject(subject.id, 'assign')} className="p-1.5 text-green-500 hover:bg-green-100 rounded-full transition-colors" title="Assigner">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </button>
                                </div>
                           ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CredentialsModal: React.FC<{
    credentials: { username: string; tempPassword: string };
    onClose: () => void;
}> = ({ credentials, onClose }) => {
    const { addNotification } = useNotification();
    const copyToClipboard = () => {
        navigator.clipboard.writeText(credentials.tempPassword);
        addNotification({ type: 'info', message: 'Mot de passe copié !' });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
                <h2 className="text-lg font-bold mb-4">Identifiants du Professeur</h2>
                <p className="text-sm text-slate-600 mb-4">Veuillez noter ces informations et les transmettre au professeur. Le mot de passe est temporaire.</p>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-500">Nom d'utilisateur</label>
                        <p className="p-2 bg-slate-100 rounded font-mono">{credentials.username}</p>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500">Mot de passe temporaire</label>
                        <div className="flex items-center gap-2">
                             <p className="flex-grow p-2 bg-slate-100 rounded font-mono">{credentials.tempPassword}</p>
                             <button onClick={copyToClipboard} className="p-2 text-slate-500 hover:bg-slate-200 rounded">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2-2H9a2 2 0 01-2-2V9z" /><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H4z" /></svg>
                             </button>
                        </div>
                    </div>
                </div>
                <div className="mt-6 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md">J'ai noté</button>
                </div>
            </div>
        </div>
    );
};


const TeacherManager: React.FC<{
    onAssign: (teacher: Teacher) => void;
}> = ({ onAssign }) => {
    const { addNotification } = useNotification();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formState, setFormState] = useState({ nom: '', prenom: '', email: '', phone: '' });
    const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
    const [credentials, setCredentials] = useState<{ username: string, tempPassword: string } | null>(null);


    const fetchTeachers = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch('/teachers');
            setTeachers(data);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        fetchTeachers();
    }, [fetchTeachers]);

    const resetForm = () => {
        setFormState({ nom: '', prenom: '', email: '', phone: '' });
        setShowForm(false);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = await apiFetch('/teachers', { method: 'POST', body: JSON.stringify(formState) });
            addNotification({ type: 'success', message: `Le professeur ${data.teacher.prenom} a été ajouté.` });
            setCredentials({ username: data.username, tempPassword: data.tempPassword });
            resetForm();
            await fetchTeachers();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleResetPassword = async (teacher: Teacher) => {
        try {
            const data = await apiFetch(`/teachers/${teacher.id}/reset-password`, { method: 'PUT' });
            addNotification({ type: 'success', message: `Le mot de passe pour ${teacher.prenom} a été réinitialisé.` });
            setCredentials({ username: teacher.username, tempPassword: data.tempPassword });
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleDeleteConfirm = async () => {
        if (!teacherToDelete) return;
        try {
            await apiFetch(`/teachers/${teacherToDelete.id}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: 'Professeur supprimé.' });
            setTeacherToDelete(null);
            await fetchTeachers();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-700 font-display">Gestion des Professeurs</h2>
            
            {showForm ? (
                <div className="my-4 p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Ajouter un nouveau professeur</h3>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" value={formState.prenom} onChange={e => setFormState(s => ({...s, prenom: e.target.value}))} placeholder="Prénom" required className="px-3 py-2 border rounded-md" />
                            <input type="text" value={formState.nom} onChange={e => setFormState(s => ({...s, nom: e.target.value}))} placeholder="Nom" required className="px-3 py-2 border rounded-md" />
                            <input type="email" value={formState.email} onChange={e => setFormState(s => ({...s, email: e.target.value}))} placeholder="Email (optionnel)" className="px-3 py-2 border rounded-md" />
                            <PhoneInput
                                country={'ht'}
                                value={formState.phone}
                                onChange={phone => setFormState(s => ({...s, phone}))}
                                containerClass="mt-0"
                                inputProps={{
                                    name: 'phone',
                                    placeholder: 'Téléphone (optionnel)'
                                }}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-100 rounded-md">Annuler</button>
                            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md">Enregistrer</button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="my-4"><button onClick={() => setShowForm(true)} className="w-full py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">Ajouter un Professeur</button></div>
            )}

            {isLoading ? <p>Chargement...</p> : (
                <ul className="space-y-2">
                    {teachers.map(teacher => (
                        <li key={teacher.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg flex-wrap gap-2">
                           <div>
                             <p className="font-medium">{teacher.prenom} {teacher.nom}</p>
                             <p className="text-sm text-slate-500">{teacher.email || 'Pas d\'email'}</p>
                           </div>
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={() => handleResetPassword(teacher)} className="px-3 py-1 text-xs font-medium text-yellow-800 bg-yellow-200 rounded-full hover:bg-yellow-300">Réinitialiser MDP</button>
                                <button onClick={() => onAssign(teacher)} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-full hover:bg-indigo-200">Gérer les assignations</button>
                                <button onClick={() => setTeacherToDelete(teacher)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {teacherToDelete && <ConfirmationModal isOpen={!!teacherToDelete} onClose={() => setTeacherToDelete(null)} onConfirm={handleDeleteConfirm} title="Supprimer Professeur" message={`Confirmez-vous la suppression de ${teacherToDelete.prenom} ${teacherToDelete.nom} ? Le compte utilisateur associé sera aussi supprimé.`} />}
            {credentials && <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />}
        </div>
    );
};

const ResourceAdminManager: React.FC = () => {
    const { addNotification } = useNotification();
    const { selectedYear } = useSchoolYear();
    const [assignments, setAssignments] = useState<FullTeacherAssignment[]>([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');

    useEffect(() => {
        if (!selectedYear) return;
        apiFetch(`/full-assignments?yearId=${selectedYear.id}`)
            .then(data => {
                setAssignments(data);
                if (data.length > 0) {
                    setSelectedAssignmentId(data[0].id.toString());
                }
            })
            .catch(err => addNotification({ type: 'error', message: err.message }));
    }, [selectedYear, addNotification]);

    return (
        <div>
             <h2 className="text-xl font-semibold text-slate-700 font-display">Gestion des Ressources Pédagogiques</h2>
             <p className="text-sm text-slate-500 mt-1 mb-4">Ajoutez des documents, liens ou vidéos pour n'importe quel cours de l'année scolaire en cours.</p>
             <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Sélectionner un cours</label>
                <select 
                    value={selectedAssignmentId} 
                    onChange={e => setSelectedAssignmentId(e.target.value)} 
                    className="w-full p-2 border rounded-md bg-slate-50"
                >
                    {assignments.map(a => (
                        <option key={a.id} value={a.id}>
                            {a.class_name} - {a.subject_name} ({a.teacher_prenom} {a.teacher_nom})
                        </option>
                    ))}
                </select>
             </div>
             {selectedAssignmentId && <ResourceManager assignmentId={parseInt(selectedAssignmentId, 10)} />}
        </div>
    );
};


const InputField: React.FC<{ label: string; name: keyof Omit<Instance, 'id' | 'status' | 'passing_grade' | 'expires_at' | 'phone'>; value: string | null; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; }> = ({ label, name, value, onChange, type = 'text' }) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">{label}</label>
      <input type={type} id={name} name={name} value={value || ''} onChange={onChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm" />
    </div>
);

type AdminTab = 'general' | 'student_portal' | 'teachers' | 'resources' | 'timetable' | 'years' | 'periods' | 'subjects' | 'curriculum' | 'promotions' | 'security' | 'audit' | 'support';

const AdminPage: React.FC = () => {
  const { addNotification } = useNotification();
  const { selectedYear } = useSchoolYear();
  const [info, setInfo] = useState<Omit<Instance, 'id' | 'status' | 'expires_at'>>({ name: '', address: '', phone: '', email: '', logo_url: null, passing_grade: null });
  const [isInfoLoading, setIsInfoLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('general');
  const [teacherToAssign, setTeacherToAssign] = useState<Teacher | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const fetchInfo = useCallback(async () => {
    setIsInfoLoading(true);
    try {
      const data = await apiFetch('/instance/current');
      setInfo(data);
    } catch (error) {
      if (error instanceof Error) addNotification({ type: 'error', message: `Impossible de charger les informations: ${error.message}` });
    } finally {
      setIsInfoLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
        try {
            const data = await apiFetch('/announcements/active');
            setAnnouncements(data);
        } catch (error) {
            console.error("Failed to fetch announcements:", error);
        }
    };
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (activeTab === 'general') {
      fetchInfo();
    }
  }, [activeTab, fetchInfo]);
  
   const handleInfoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setInfo(prev => ({ ...prev, [name]: type === 'number' ? (value === '' ? null : Number(value)) : value }));
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 2 * 1024 * 1024) { // 2MB limit
              addNotification({ type: 'error', message: 'Le logo ne doit pas dépasser 2 Mo.' });
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              setInfo(prev => ({ ...prev, logo_url: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSubmitInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { message } = await apiFetch('/instance/current', { method: 'PUT', body: JSON.stringify(info) });
      addNotification({ type: 'success', message: message });
    } catch (error) {
      if (error instanceof Error) addNotification({ type: 'error', message: error.message });
    }
  };
  
  const TabButton: React.FC<{ tabId: AdminTab; children: React.ReactNode }> = ({ tabId, children }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`px-4 py-2 font-medium text-sm rounded-md transition-colors whitespace-nowrap ${activeTab === tabId ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {children}
    </button>
  );

  const AnnouncementsSection: React.FC<{ announcements: Announcement[] }> = ({ announcements }) => {
    if (announcements.length === 0) {
      return null;
    }
    return (
        <div className="mb-8 space-y-4">
            {announcements.map(announcement => (
                <div key={announcement.id} className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg shadow">
                    <div className="flex">
                        <div className="flex-shrink-0">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-bold text-blue-800">{announcement.title}</p>
                            <p className="mt-1 text-sm text-blue-700">{announcement.content}</p>
                            <p className="mt-2 text-xs text-blue-600">
                                Publié le {new Date(announcement.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
  };
  

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-start">
          <div>
            <ReactRouterDOM.Link to="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium no-print">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
              Retour à l'accueil
            </ReactRouterDOM.Link>
            <h1 className="text-4xl font-bold text-gray-800 font-display">Tableau de Bord Admin</h1>
          </div>
      </header>
      
      <SuspensionWarningBanner instance={info as Instance} />
      <AnnouncementsSection announcements={announcements} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
              <div className="border-b border-slate-200 mb-6">
                  <div className="flex items-center flex-wrap gap-2 p-1 bg-slate-50 rounded-lg">
                      <TabButton tabId="general">Général</TabButton>
                      <TabButton tabId="student_portal">Portail Élève</TabButton>
                      <TabButton tabId="teachers">Professeurs</TabButton>
                      <TabButton tabId="resources">Ressources</TabButton>
                      <TabButton tabId="timetable">Emploi du temps</TabButton>
                      <TabButton tabId="years">Années</TabButton>
                      <TabButton tabId="periods">Périodes</TabButton>
                      <TabButton tabId="subjects">Matières</TabButton>
                      <TabButton tabId="curriculum">Programme</TabButton>
                      <TabButton tabId="promotions">Promotions</TabButton>
                      <TabButton tabId="security">Sécurité</TabButton>
                      <TabButton tabId="audit">Journal</TabButton>
                  </div>
              </div>

              {activeTab === 'general' && (
                isInfoLoading ? <p>Chargement des informations...</p> : 
                <form onSubmit={handleSubmitInfo} className="space-y-6">
                  <h2 className="text-xl font-semibold text-slate-700 font-display">Informations de l'Établissement</h2>
                   <InputField label="Nom de l'établissement" name="name" value={info.name} onChange={handleInfoChange} />
                   <InputField label="Adresse" name="address" value={info.address} onChange={handleInfoChange} />
                   <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Téléphone</label>
                        <PhoneInput
                            country={'ht'}
                            value={info.phone || ''}
                            onChange={(phone) => setInfo(prev => ({ ...prev, phone }))}
                            containerClass="mt-1"
                            inputProps={{
                                id: 'phone',
                                name: 'phone',
                            }}
                        />
                    </div>
                   <InputField label="Email" name="email" value={info.email} onChange={handleInfoChange} type="email" />
                   
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Moyenne Générale de Passage (%)</label>
                        <input
                            type="number"
                            name="passing_grade"
                            value={info.passing_grade || ''}
                            onChange={handleInfoChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
                            placeholder="Ex: 60"
                        />
                        <p className="text-xs text-slate-500 mt-1">La moyenne minimale pour être admis en classe supérieure.</p>
                    </div>

                   <div>
                        <label htmlFor="logo_url" className="block text-sm font-medium text-slate-700">Logo de l'école</label>
                        <div className="mt-2 flex items-center gap-4">
                           {info.logo_url && <img src={info.logo_url} alt="Logo" className="h-16 w-16 rounded-lg object-contain bg-slate-100 p-1"/>}
                           <input type="file" id="logo_url" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoChange}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        </div>
                   </div>

                  <div className="flex justify-end pt-2 border-t">
                    <button type="submit" className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Sauvegarder</button>
                  </div>
                </form>
              )}
              {activeTab === 'student_portal' && <StudentPortalManager />}
              {activeTab === 'teachers' && <TeacherManager onAssign={setTeacherToAssign} />}
              {activeTab === 'resources' && <ResourceAdminManager />}
              {activeTab === 'timetable' && <TimetableManager />}
              {activeTab === 'years' && <SchoolYearManager />}
              {activeTab === 'periods' && <PeriodManager />}
              {activeTab === 'subjects' && <SubjectManager />}
              {activeTab === 'curriculum' && <CurriculumManager />}
              {activeTab === 'promotions' && <PromotionManager />}
              {activeTab === 'security' && ( <div><h2 className="text-xl font-semibold mb-4">Sécurité du Compte</h2><ChangePasswordForm /></div> )}
              {activeTab === 'audit' && <AuditLogViewer scope="admin" />}
          </div>

          <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                  <h2 className="text-xl font-semibold text-slate-700 border-b pb-3 mb-4 font-display">Gestion des Utilisateurs</h2>
                  <div className="space-y-3">
                        <ReactRouterDOM.Link to="/admin/users" className="group flex items-center w-full p-4 text-left bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                           <div className="ml-4">
                             <p className="font-semibold text-slate-800">Gérer les utilisateurs</p>
                             <p className="text-sm text-slate-500">Afficher et supprimer</p>
                           </div>
                        </ReactRouterDOM.Link>
                        <ReactRouterDOM.Link to="/admin/add-user" className="group flex items-center w-full p-4 text-left bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                           <div className="ml-4">
                             <p className="font-semibold text-slate-800">Ajouter un utilisateur</p>
                             <p className="text-sm text-slate-500">Créer un nouveau compte</p>
                           </div>
                        </ReactRouterDOM.Link>
                  </div>
              </div>
          </div>
      </div>
       {teacherToAssign && selectedYear && (
          <TeacherAssignmentModal 
              isOpen={!!teacherToAssign}
              onClose={() => setTeacherToAssign(null)}
              teacher={teacherToAssign}
              year={selectedYear}
          />
       )}
    </div>
  );
};
export default AdminPage;