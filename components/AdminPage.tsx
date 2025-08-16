import React, { useState, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import ChangePasswordForm from './ChangePasswordForm';
import { Instance, SchoolYear, Subject, ClassSubject, AcademicPeriod, Teacher, FullTeacherAssignment, Announcement, ClassDefinition } from '../types';
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

const ClassManager: React.FC = () => {
    const { classes, refreshYears } = useSchoolYear();
    const { addNotification } = useNotification();
    const [classItems, setClassItems] = useState<ClassDefinition[]>([]);
    const [newClassName, setNewClassName] = useState('');
    const [editingClass, setEditingClass] = useState<{ id: number; name: string } | null>(null);
    const [classToDelete, setClassToDelete] = useState<ClassDefinition | null>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        setClassItems(classes);
    }, [classes]);

    const handleAddClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClassName.trim()) return;
        try {
            await apiFetch('/classes', { method: 'POST', body: JSON.stringify({ name: newClassName.trim() }) });
            addNotification({ type: 'success', message: 'Classe ajoutée.' });
            setNewClassName('');
            refreshYears();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleUpdateClass = async () => {
        if (!editingClass || !editingClass.name.trim()) return;
        try {
            await apiFetch(`/classes/${editingClass.id}`, { method: 'PUT', body: JSON.stringify({ name: editingClass.name.trim() }) });
            addNotification({ type: 'success', message: 'Classe mise à jour.' });
            setEditingClass(null);
            refreshYears();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleConfirmDelete = async () => {
        if (!classToDelete) return;
        try {
            await apiFetch(`/classes/${classToDelete.id}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: `Classe '${classToDelete.name}' supprimée.` });
            setClassToDelete(null);
            refreshYears();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
            setClassToDelete(null);
        }
    };

    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
        dragItem.current = index;
        e.currentTarget.style.opacity = '0.5';
    };

    const handleDragEnter = (index: number) => {
        dragOverItem.current = index;
    };

    const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
        e.currentTarget.style.opacity = '1';
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            const newClassItems = [...classItems];
            const draggedItemContent = newClassItems.splice(dragItem.current, 1)[0];
            newClassItems.splice(dragOverItem.current, 0, draggedItemContent);
            setClassItems(newClassItems); // Optimistic update for UI feel

            const newOrderedIds = newClassItems.map(c => c.id);
            apiFetch('/classes/order', { method: 'PUT', body: JSON.stringify({ orderedIds: newOrderedIds }) })
                .then(() => {
                    addNotification({ type: 'success', message: 'Ordre des classes mis à jour.' });
                    refreshYears(); // Re-fetch from server to ensure consistency
                })
                .catch(error => {
                    if (error instanceof Error) addNotification({ type: 'error', message: error.message });
                    setClassItems(classes); // Revert on error
                });
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-700 font-display">Gestion des Classes</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">Ajoutez, modifiez, supprimez et réorganisez les classes de votre établissement. L'ordre défini ici sera utilisé dans toute l'application.</p>
            <div className="my-4 p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Ajouter une classe</h3>
                <form onSubmit={handleAddClass} className="flex gap-2">
                    <input type="text" value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="Ex: NSI" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md" />
                    <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 whitespace-nowrap">Ajouter</button>
                </form>
            </div>
            <ul className="space-y-2">
                {classItems.map((c, index) => (
                    <li
                        key={c.id}
                        className="flex justify-between items-center p-3 bg-slate-50 rounded-lg group"
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={e => e.preventDefault()}
                    >
                        <div className="flex items-center gap-3">
                            <Tooltip text="Glisser-déposer pour réorganiser">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 cursor-grab" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                            </Tooltip>
                            {editingClass?.id === c.id ? (
                                <input
                                    type="text"
                                    value={editingClass.name}
                                    onChange={e => setEditingClass({ ...editingClass, name: e.target.value })}
                                    className="px-2 py-1 border rounded-md"
                                    autoFocus
                                    onBlur={handleUpdateClass}
                                    onKeyDown={e => e.key === 'Enter' && handleUpdateClass()}
                                />
                            ) : (
                                <span className="font-medium">{c.name}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {editingClass?.id === c.id ? (
                                <>
                                    <button onClick={handleUpdateClass} className="p-2 text-green-500 hover:bg-green-100 rounded-full" title="Sauvegarder"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                                    <button onClick={() => setEditingClass(null)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" title="Annuler"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                </>
                            ) : (
                                <button onClick={() => setEditingClass({ id: c.id, name: c.name })} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Modifier"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                            )}
                            <button onClick={() => setClassToDelete(c)} className="p-2 text-red-500 hover:bg-red-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Supprimer"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                        </div>
                    </li>
                ))}
            </ul>
            {classToDelete && <ConfirmationModal isOpen={!!classToDelete} onClose={() => setClassToDelete(null)} onConfirm={handleConfirmDelete} title="Supprimer la Classe" message={`Confirmez-vous la suppression de '${classToDelete.name}' ? Cette action est irréversible et ne fonctionnera que si aucun élève n'est ou n'a été inscrit dans cette classe.`} />}
        </div>
    );
};

const CurriculumManager: React.FC<{ classes: ClassDefinition[] }> = ({ classes }) => {
    const { addNotification } = useNotification();
    const { selectedYear } = useSchoolYear();
    const [selectedClass, setSelectedClass] = useState('');
    const [curriculum, setCurriculum] = useState<{ assigned: ClassSubject[], available: Subject[] }>({ assigned: [], available: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (classes.length > 0 && !selectedClass) {
            setSelectedClass(classes[0].name);
        }
    }, [classes, selectedClass]);

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
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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

const AdminPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const [instanceInfo, setInstanceInfo] = useState<Instance | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [formState, setFormState] = useState<Instance | null>(null);
    const { classes } = useSchoolYear();
    
    type AdminTab = 'general' | 'years' | 'classes' | 'periods' | 'subjects' | 'curriculum' | 'roles' | 'promotions' | 'resources' | 'journal' | 'security';
    const [activeTab, setActiveTab] = useState<AdminTab>('general');

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [instanceData, announcementsData] = await Promise.all([
                    apiFetch('/instance/current'),
                    apiFetch('/announcements/active')
                ]);
                setInstanceInfo(instanceData);
                setFormState(instanceData);
                setAnnouncements(announcementsData);
            } catch (error) {
                if (error instanceof Error) addNotification({ type: 'error', message: error.message });
            }
        };
        fetchInitialData();
    }, [addNotification]);

    const handleFormChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormState(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormState(prev => prev ? { ...prev, logo_url: reader.result as string } : null);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState) return;
        try {
            await apiFetch('/instance/current', {
                method: 'PUT',
                body: JSON.stringify(formState)
            });
            addNotification({ type: 'success', message: "Informations de l'école mises à jour." });
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const TabButton: React.FC<{ tabId: AdminTab; children: React.ReactNode }> = ({ tabId, children }) => (
        <button
          onClick={() => setActiveTab(tabId)}
          className={`w-full text-left px-4 py-2.5 font-medium text-sm rounded-lg transition-all duration-200 ${activeTab === tabId ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-blue-100 hover:text-blue-700'}`}
        >
          {children}
        </button>
    );

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-4xl font-bold text-gray-800 font-display">Panneau d'Administration</h1>
                <p className="text-lg text-slate-500 mt-2">Gérez les paramètres de l'application et les données académiques.</p>
            </header>
            
            <SuspensionWarningBanner instance={instanceInfo} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-4 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-slate-800 font-display mb-3 px-2">Configuration Académique</h3>
                    <div className="space-y-1">
                        <TabButton tabId="years">Années</TabButton>
                        <TabButton tabId="periods">Périodes</TabButton>
                        <TabButton tabId="classes">Classes</TabButton>
                        <TabButton tabId="subjects">Matières</TabButton>
                        <TabButton tabId="curriculum">Programme</TabButton>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-slate-800 font-display mb-3 px-2">Gestion des Opérations</h3>
                    <div className="space-y-1">
                        <TabButton tabId="promotions">Promotions</TabButton>
                        <TabButton tabId="resources">Ressources</TabButton>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-slate-800 font-display mb-3 px-2">Administration & Sécurité</h3>
                    <div className="space-y-1">
                        <TabButton tabId="general">Général</TabButton>
                        <TabButton tabId="journal">Journal</TabButton>
                        <TabButton tabId="security">Sécurité</TabButton>
                    </div>
                    <div className="pt-3 mt-3 border-t">
                        <h4 className="text-base font-semibold text-slate-700 font-display mb-2 px-2">Gestion des Utilisateurs</h4>
                        <div className="space-y-1">
                            {hasPermission('user:manage') &&
                                <ReactRouterDOM.Link
                                    to="/admin/users"
                                    className="w-full text-left block p-3 rounded-lg transition-all duration-200 text-slate-600 hover:bg-slate-100"
                                >
                                    <span className="font-medium text-sm">Gérer les utilisateurs</span>
                                    <span className="block text-xs text-slate-500">Comptes et rôles du personnel</span>
                                </ReactRouterDOM.Link>
                            }
                            {hasPermission('role:manage') && <TabButton tabId="roles">Rôles & Permissions</TabButton> }
                        </div>
                    </div>
                </div>
            </div>

            <main>
                {activeTab === 'general' && formState && (
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-semibold text-slate-700 font-display mb-4">Informations sur l'établissement</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input name="name" value={formState.name} onChange={handleFormChange} placeholder="Nom de l'école" className="w-full p-2 border rounded" />
                            <input name="address" value={formState.address || ''} onChange={handleFormChange} placeholder="Adresse" className="w-full p-2 border rounded" />
                            <PhoneInput country={'ht'} value={formState.phone || ''} onChange={phone => setFormState(s => s ? {...s, phone} : null)} />
                            <input type="email" name="email" value={formState.email || ''} onChange={handleFormChange} placeholder="Email" className="w-full p-2 border rounded" />
                            <input type="number" name="passing_grade" value={formState.passing_grade || ''} onChange={handleFormChange} placeholder="Moyenne de passage (ex: 60)" className="w-full p-2 border rounded" />
                            <div className="flex items-center gap-4">{formState.logo_url && <img src={formState.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-full" />}<input type="file" accept="image/*" onChange={handlePhotoChange} /></div>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Sauvegarder les informations</button>
                        </form>
                    </div>
                )}
                {activeTab === 'years' && <div className="bg-white p-6 rounded-xl shadow-md"><SchoolYearManager /></div>}
                {activeTab === 'classes' && <div className="bg-white p-6 rounded-xl shadow-md"><ClassManager /></div>}
                {activeTab === 'periods' && <div className="bg-white p-6 rounded-xl shadow-md"><PeriodManager /></div>}
                {activeTab === 'subjects' && <div className="bg-white p-6 rounded-xl shadow-md"><SubjectManager /></div>}
                {activeTab === 'curriculum' && <div className="bg-white p-6 rounded-xl shadow-md"><CurriculumManager classes={classes} /></div>}
                {activeTab === 'roles' && hasPermission('role:manage') && <div className="bg-white p-6 rounded-xl shadow-md"><RolesManager /></div>}
                {activeTab === 'promotions' && <div className="bg-white p-6 rounded-xl shadow-md"><PromotionManager /></div>}
                {activeTab === 'resources' && <div className="bg-white p-6 rounded-xl shadow-md"><AdminResourceManager /></div>}
                {activeTab === 'journal' && <div className="bg-white p-6 rounded-xl shadow-md"><AuditLogViewer scope="admin" /></div>}
                {activeTab === 'security' && (
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-semibold text-slate-700 font-display mb-4">Changer mon mot de passe</h2>
                        <ChangePasswordForm />
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminPage;