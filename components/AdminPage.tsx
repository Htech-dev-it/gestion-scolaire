import React, { useState, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import ChangePasswordForm from './ChangePasswordForm';
import { Instance, SchoolYear, Subject, ClassSubject, AcademicPeriod, Teacher, FullTeacherAssignment, Announcement, ClassDefinition, ClassFinancials } from '../types';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import ConfirmationModal from './ConfirmationModal';
import Tooltip from './Tooltip';
import AuditLogViewer from './AuditLogViewer';
import PromotionManager from './PromotionManager';
import AdminResourceManager from './AdminResourceManager';
import PhoneInput from 'react-phone-input-2';
import RolesManager from './RolesManager'; // Import the new component

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
            setPeriodToDelete(null);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-700 font-display">Périodes Académiques</h2>
            <div className="my-4 p-4 border rounded-lg">
                <label className="block text-sm font-medium text-slate-700 mb-1">Année Scolaire</label>
                <select
                    value={selectedYearId || ''}
                    onChange={e => setSelectedYearId(Number(e.target.value))}
                    className="w-full md:w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-md"
                >
                    {schoolYears.map(year => (
                        <option key={year.id} value={year.id}>{year.name}</option>
                    ))}
                </select>
            </div>
            
            <div className="my-4 p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">{formState.id ? 'Modifier la période' : 'Ajouter une période'}</h3>
                <form onSubmit={handleFormSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={formState.name}
                        onChange={e => setFormState(s => ({...s, name: e.target.value}))}
                        placeholder="Ex: Trimestre 1"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                    />
                    <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 whitespace-nowrap">
                        {formState.id ? 'Mettre à jour' : 'Ajouter'}
                    </button>
                    {formState.id && (
                        <button type="button" onClick={() => setFormState({ id: null, name: '' })} className="px-4 py-2 bg-slate-200 rounded-md">
                            Annuler
                        </button>
                    )}
                </form>
            </div>
            
            {isLoading ? <p>Chargement des périodes...</p> : (
                <ul className="space-y-2">
                    {periods.map(period => (
                        <li key={period.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="font-medium">{period.name}</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setFormState({ id: period.id, name: period.name })} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full" title="Modifier">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <button onClick={() => setPeriodToDelete(period)} className="p-2 text-red-500 hover:bg-red-100 rounded-full" title="Supprimer">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {periodToDelete && (
                <ConfirmationModal
                    isOpen={!!periodToDelete}
                    onClose={() => setPeriodToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title={`Supprimer la période ${periodToDelete.name}`}
                    message="Êtes-vous sûr ? Toutes les notes et appréciations associées à cette période seront supprimées."
                />
            )}
        </div>
    );
};

const SubjectManager: React.FC = () => {
    const { addNotification } = useNotification();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(false);
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

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.name.trim()) return;
        const isEditing = formState.id !== null;
        const url = isEditing ? `/subjects/${formState.id}` : '/subjects';
        const method = isEditing ? 'PUT' : 'POST';
        
        try {
            await apiFetch(url, { method, body: JSON.stringify({ name: formState.name }) });
            addNotification({ type: 'success', message: `Matière ${isEditing ? 'mise à jour' : 'ajoutée'}.` });
            setFormState({ id: null, name: '' });
            await fetchSubjects();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleConfirmDelete = async () => {
        if (!subjectToDelete) return;
        try {
            await apiFetch(`/subjects/${subjectToDelete.id}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: 'Matière supprimée.' });
            setSubjectToDelete(null);
            await fetchSubjects();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-700 font-display">Matières</h2>
             <div className="my-4 p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">{formState.id ? 'Modifier la matière' : 'Ajouter une matière'}</h3>
                <form onSubmit={handleFormSubmit} className="flex gap-2">
                    <input type="text" value={formState.name} onChange={e => setFormState(s => ({...s, name: e.target.value}))} placeholder="Ex: Mathématiques" className="w-full p-2 border rounded-md" />
                    <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md whitespace-nowrap">{formState.id ? 'Mettre à jour' : 'Ajouter'}</button>
                    {formState.id && <button type="button" onClick={() => setFormState({ id: null, name: '' })} className="px-4 py-2 bg-slate-200 rounded-md">Annuler</button>}
                </form>
            </div>
            {isLoading ? <p>Chargement...</p> : (
                <ul className="space-y-2">{subjects.map(subject => (
                    <li key={subject.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="font-medium">{subject.name}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setFormState({ id: subject.id, name: subject.name })} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full" title="Modifier">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                            </button>
                             <button onClick={() => setSubjectToDelete(subject)} className="p-2 text-red-500 hover:bg-red-100 rounded-full" title="Supprimer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    </li>))}</ul>
            )}
             {subjectToDelete && <ConfirmationModal isOpen={!!subjectToDelete} onClose={() => setSubjectToDelete(null)} onConfirm={handleConfirmDelete} title="Supprimer la matière" message={`Confirmez-vous la suppression de "${subjectToDelete.name}" ? Toutes les données associées (notes, etc.) seront perdues.`} />}
        </div>
    );
};

const ProgrammeManager: React.FC = () => {
    const { addNotification } = useNotification();
    const { selectedYear, classes } = useSchoolYear();
    const [assignedSubjects, setAssignedSubjects] = useState<ClassSubject[]>([]);
    const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [maxGrades, setMaxGrades] = useState<Record<number, string>>({}); // Local state for inputs

    useEffect(() => {
        if (classes.length > 0 && !selectedClass) {
            setSelectedClass(classes[0].name);
        }
    }, [classes, selectedClass]);

    const fetchCurriculum = useCallback(async () => {
        if (!selectedYear || !selectedClass) return;
        try {
            const data = await apiFetch(`/curriculum?yearId=${selectedYear.id}&className=${selectedClass}`);
            setAssignedSubjects(data.assigned);
            setAvailableSubjects(data.available);

            const gradesMap = data.assigned.reduce((acc: Record<number, string>, cs: ClassSubject) => {
                acc[cs.id] = cs.max_grade.toString();
                return acc;
            }, {});
            setMaxGrades(gradesMap);

        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    }, [selectedYear, selectedClass, addNotification]);

    useEffect(() => {
        fetchCurriculum();
    }, [fetchCurriculum]);
    
    const handleAssign = async (subjectId: number) => {
        await apiFetch('/curriculum/assign', { method: 'POST', body: JSON.stringify({ yearId: selectedYear!.id, className: selectedClass, subjectId }) });
        await fetchCurriculum();
    };
    
    const handleUnassign = async (subjectId: number) => {
        await apiFetch('/curriculum/unassign', { method: 'POST', body: JSON.stringify({ yearId: selectedYear!.id, className: selectedClass, subjectId }) });
        await fetchCurriculum();
    };

    const handleGradeInputChange = (classSubjectId: number, value: string) => {
        setMaxGrades(prev => ({ ...prev, [classSubjectId]: value }));
    };

    const handleMaxGradeSave = async (classSubjectId: number) => {
        const localValue = maxGrades[classSubjectId];
        const originalValue = assignedSubjects.find(cs => cs.id === classSubjectId)?.max_grade.toString();
        
        if (localValue !== originalValue) {
            try {
                const maxGrade = Number(localValue);
                if (isNaN(maxGrade) || maxGrade < 0) {
                     addNotification({ type: 'error', message: "Veuillez entrer un nombre valide." });
                     setMaxGrades(prev => ({...prev, [classSubjectId]: originalValue || '100'}));
                     return;
                }
                await apiFetch(`/curriculum/max-grade/${classSubjectId}`, { method: 'PUT', body: JSON.stringify({ max_grade: maxGrade }) });
                addNotification({ type: 'success', message: 'Coefficient mis à jour.'});
                await fetchCurriculum(); // Refresh to confirm
            } catch (error) {
                 if (error instanceof Error) addNotification({ type: 'error', message: error.message });
                 setMaxGrades(prev => ({...prev, [classSubjectId]: originalValue || '100'}));
            }
        }
    };
    
    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-700 font-display">Gestion du Programme Scolaire</h2>
            <div className="my-4 p-4 border rounded-lg">
                 <label className="block text-sm font-medium text-slate-700 mb-1">Classe</label>
                 <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full md:w-1/2 p-2 border rounded-md">
                     {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                 </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-semibold mb-2">Matières assignées à {selectedClass}</h3>
                    <ul className="space-y-2">
                        {assignedSubjects.map(cs => (
                            <li key={cs.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                <span className="font-medium">{cs.subject_name}</span>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        value={maxGrades[cs.id] || ''} 
                                        onChange={e => handleGradeInputChange(cs.id, e.target.value)} 
                                        onBlur={() => handleMaxGradeSave(cs.id)}
                                        className="w-20 p-1 border rounded text-sm" 
                                    />
                                    <button onClick={() => handleUnassign(cs.subject_id)} className="text-red-500 hover:text-red-700">Retirer</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div>
                    <h3 className="font-semibold mb-2">Matières disponibles</h3>
                    <ul className="space-y-2">{availableSubjects.map(s => (<li key={s.id} className="flex justify-between items-center p-2 bg-slate-50 rounded"><span className="font-medium">{s.name}</span><button onClick={() => handleAssign(s.id)} className="text-green-600 hover:text-green-800">Assigner</button></li>))}</ul>
                </div>
            </div>
        </div>
    );
};

const ClassFinancialsManager: React.FC = () => {
    const { addNotification } = useNotification();
    const { selectedYear, classes } = useSchoolYear();
    // Use undefined to represent an empty/unset field
    const [classFinancials, setClassFinancials] = useState<Record<string, number | undefined>>({});

    const fetchFinancials = useCallback(async () => {
        if (!selectedYear) return;
        try {
            const data: ClassFinancials[] = await apiFetch(`/class-financials?yearId=${selectedYear.id}`);
            const financialsMap = data.reduce((acc, curr) => {
                acc[curr.class_name] = curr.mppa;
                return acc;
            }, {} as Record<string, number>);
            setClassFinancials(financialsMap);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    }, [selectedYear, addNotification]);

    useEffect(() => {
        fetchFinancials();
    }, [fetchFinancials]);

    const handleSaveFinancials = async () => {
        if (!selectedYear) return;
        
        const financialsPayload = classes.map(c => ({
            class_name: c.name,
            mppa: classFinancials[c.name] ?? null, // If undefined, send null
        }));
        
        const payload = {
            yearId: selectedYear.id,
            financials: financialsPayload
        };

        try {
            await apiFetch('/class-financials', { method: 'PUT', body: JSON.stringify(payload) });
            addNotification({ type: 'success', message: 'Frais de scolarité mis à jour.' });
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    return (
        <div>
             <h2 className="text-xl font-semibold text-slate-700 font-display">Frais de Scolarité par Classe</h2>
             <p className="text-sm text-slate-500 mt-1 mb-4">Définissez le montant à payer (MPPA) par défaut pour chaque classe pour l'année {selectedYear?.name}. Ce montant sera utilisé lors des nouvelles inscriptions.</p>
             <div className="space-y-3">
                 {classes.map(c => (
                     <div key={c.id} className="grid grid-cols-2 gap-4 items-center p-2 rounded-md even:bg-slate-50">
                         <label htmlFor={`mppa-${c.id}`} className="font-medium">{c.name}</label>
                         <input
                            id={`mppa-${c.id}`}
                            type="number"
                            value={classFinancials[c.name] ?? ''} // Show empty string if undefined
                            placeholder="Montant"
                            onChange={e => {
                                const value = e.target.value;
                                setClassFinancials(prev => ({...prev, [c.name]: value === '' ? undefined : Number(value)}));
                            }}
                            className="w-full p-2 border rounded-md"
                         />
                     </div>
                 ))}
             </div>
             <div className="text-right mt-6 pt-4 border-t">
                 <button onClick={handleSaveFinancials} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-all">
                     Sauvegarder les Frais
                 </button>
             </div>
        </div>
    );
};


const ClassManager: React.FC = () => {
    const { addNotification } = useNotification();
    const { classes, refreshYears } = useSchoolYear();
    const [newClassName, setNewClassName] = useState('');
    const [editingClass, setEditingClass] = useState<ClassDefinition | null>(null);
    const [classToDelete, setClassToDelete] = useState<ClassDefinition | null>(null);

    const handleAddOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = editingClass ? editingClass.name : newClassName;
        if (!name.trim()) return;

        const isEditing = !!editingClass;
        const url = isEditing ? `/classes/${editingClass!.id}` : '/classes';
        const method = isEditing ? 'PUT' : 'POST';
        
        try {
            await apiFetch(url, { method, body: JSON.stringify({ name }) });
            addNotification({ type: 'success', message: `Classe ${isEditing ? 'mise à jour' : 'ajoutée'}.` });
            setNewClassName('');
            setEditingClass(null);
            refreshYears();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleDeleteRequest = (classDef: ClassDefinition) => {
        setClassToDelete(classDef);
    };
    
    const handleConfirmDelete = async () => {
        if (!classToDelete) return;
        try {
            await apiFetch(`/classes/${classToDelete.id}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: 'Classe supprimée.' });
            refreshYears();
        } catch (error) {
             if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setClassToDelete(null);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-700 font-display">Classes</h2>
             <form onSubmit={handleAddOrUpdate} className="my-4 p-4 border rounded-lg flex gap-2">
                <input type="text" value={editingClass ? editingClass.name : newClassName} onChange={e => editingClass ? setEditingClass({...editingClass, name: e.target.value}) : setNewClassName(e.target.value)} placeholder="Ex: 7AF" className="w-full p-2 border rounded-md" />
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md whitespace-nowrap">{editingClass ? 'Mettre à jour' : 'Ajouter'}</button>
                {editingClass && <button type="button" onClick={() => setEditingClass(null)} className="px-4 py-2 bg-slate-200 rounded-md">Annuler</button>}
            </form>
            <ul className="space-y-2">
                {classes.map(c => (
                    <li key={c.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="font-medium">{c.name}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setEditingClass(c)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                            <button onClick={() => handleDeleteRequest(c)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                        </div>
                    </li>
                ))}
            </ul>
            {classToDelete && (
                <ConfirmationModal
                    isOpen={!!classToDelete}
                    onClose={() => setClassToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title={`Supprimer la classe ${classToDelete.name}`}
                    message="Êtes-vous sûr ? Supprimer une classe est impossible si des élèves y sont ou ont été inscrits."
                />
            )}
        </div>
    );
}

const TabButton: React.FC<{ activeTab: string; tabId: string; onClick: (tabId: string) => void; children: React.ReactNode }> = ({ activeTab, tabId, onClick, children }) => (
    <button
        onClick={() => onClick(tabId)}
        className={`w-full text-left px-4 py-2.5 font-medium text-sm rounded-lg transition-all duration-200 ${activeTab === tabId ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-blue-100 hover:text-blue-700'}`}
    >
        {children}
    </button>
);

const AdminPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const [instanceInfo, setInstanceInfo] = useState<Instance | null>(null);
    const [formState, setFormState] = useState<Instance | null>(null);
    const [activeTab, setActiveTab] = useState('general');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchInstanceInfo = async () => {
            try {
                const data = await apiFetch('/instance/current');
                setInstanceInfo(data);
                setFormState(data);
            } catch (error) {
                if (error instanceof Error) addNotification({ type: 'error', message: error.message });
            }
        };
        fetchInstanceInfo();
    }, [addNotification]);
    
    const handleInfoChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormState(prev => prev ? ({ ...prev, [name]: type === 'number' ? Number(value) : value }) : null);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormState(prev => prev ? ({...prev, logo_url: reader.result as string}) : null);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState) return;
        try {
            await apiFetch('/instance/current', {
                method: 'PUT',
                body: JSON.stringify(formState)
            });
            addNotification({ type: 'success', message: 'Informations mises à jour.' });
            setInstanceInfo(formState);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    if (!instanceInfo || !formState) return <div>Chargement...</div>;
    
    const renderTabContent = () => {
        switch(activeTab) {
            case 'general':
                return (
                    <form onSubmit={handleInfoSubmit} className="space-y-6">
                         <h2 className="text-xl font-semibold text-slate-700 font-display">Informations Générales</h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-sm font-medium">Nom de l'établissement</label><input type="text" name="name" value={formState.name} onChange={handleInfoChange} className="w-full p-2 border rounded-md" /></div>
                            <div><label className="block text-sm font-medium">Email</label><input type="email" name="email" value={formState.email || ''} onChange={handleInfoChange} className="w-full p-2 border rounded-md" /></div>
                            <div><label className="block text-sm font-medium">Adresse</label><input type="text" name="address" value={formState.address || ''} onChange={handleInfoChange} className="w-full p-2 border rounded-md" /></div>
                            <div><label className="block text-sm font-medium">Téléphone</label><PhoneInput country={'ht'} value={formState.phone || ''} onChange={phone => setFormState(s => s ? ({...s, phone}) : null)} /></div>
                            <div><label className="block text-sm font-medium">Moyenne de Passage (%)</label><input type="number" name="passing_grade" value={formState.passing_grade || ''} onChange={handleInfoChange} className="w-full p-2 border rounded-md" /></div>
                            <div className="flex items-end gap-4">
                                {formState.logo_url && <img src={formState.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-md border p-1" />}
                                <div className="flex-grow"><label className="block text-sm font-medium">Logo</label><input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" /></div>
                            </div>
                         </div>
                         <div className="text-right"><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md">Enregistrer</button></div>
                    </form>
                );
            case 'academic_year': return <SchoolYearManager />;
            case 'periods': return <PeriodManager />;
            case 'classes': return <ClassManager />;
            case 'subjects': return <SubjectManager />;
            case 'programme': return <ProgrammeManager />;
            case 'financials': return <ClassFinancialsManager />;
            case 'promotion': return <PromotionManager />;
            case 'resources': return <AdminResourceManager />;
            case 'roles': return hasPermission('role:manage') ? <RolesManager /> : null;
            case 'journal': return <AuditLogViewer scope="admin" />;
            case 'security': return <ChangePasswordForm />;
            default: return null;
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <header className="mb-8">
                <ReactRouterDOM.Link to="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>Retour à l'accueil</ReactRouterDOM.Link>
                <h1 className="text-4xl font-bold text-gray-800 font-display">Panneau d'Administration</h1>
                <p className="text-lg text-slate-500 mt-2">Configuration et gestion globale de votre instance ScolaLink.</p>
            </header>
            
            <SuspensionWarningBanner instance={instanceInfo} />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <aside className="md:col-span-1">
                    <div className="bg-white p-4 rounded-xl shadow-md sticky top-24">
                        <h3 className="text-lg font-semibold text-slate-800 font-display mb-3 px-2">Paramètres</h3>
                        <div className="space-y-1">
                           <TabButton activeTab={activeTab} tabId="general" onClick={setActiveTab}>Général</TabButton>
                           <TabButton activeTab={activeTab} tabId="academic_year" onClick={setActiveTab}>Années Scolaires</TabButton>
                           <TabButton activeTab={activeTab} tabId="periods" onClick={setActiveTab}>Périodes</TabButton>
                           <TabButton activeTab={activeTab} tabId="classes" onClick={setActiveTab}>Classes</TabButton>
                           <TabButton activeTab={activeTab} tabId="subjects" onClick={setActiveTab}>Matières</TabButton>
                           <TabButton activeTab={activeTab} tabId="programme" onClick={setActiveTab}>Programme</TabButton>
                           <TabButton activeTab={activeTab} tabId="financials" onClick={setActiveTab}>Frais Scolaire</TabButton>
                           <TabButton activeTab={activeTab} tabId="promotion" onClick={setActiveTab}>Promotion des Élèves</TabButton>
                           <TabButton activeTab={activeTab} tabId="resources" onClick={setActiveTab}>Ressources Pédagogiques</TabButton>
                           {hasPermission('user:manage') && (
                               <ReactRouterDOM.Link
                                   to="/admin/users"
                                   className="w-full text-left block px-4 py-2.5 font-medium text-sm rounded-lg transition-all duration-200 text-slate-600 hover:bg-blue-100 hover:text-blue-700"
                               >
                                   Utilisateurs
                               </ReactRouterDOM.Link>
                           )}
                           {hasPermission('role:manage') && <TabButton activeTab={activeTab} tabId="roles" onClick={setActiveTab}>Rôles & Permissions</TabButton>}
                           <TabButton activeTab={activeTab} tabId="journal" onClick={setActiveTab}>Journal d'Activité</TabButton>
                           <TabButton activeTab={activeTab} tabId="security" onClick={setActiveTab}>Sécurité</TabButton>
                        </div>
                    </div>
                </aside>
                <main className="md:col-span-3">
                     <div className="bg-white p-6 rounded-xl shadow-md">
                        {renderTabContent()}
                     </div>
                </main>
            </div>
        </div>
    );
};

export default AdminPage;