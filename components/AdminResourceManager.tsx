import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../utils/api';
import * as db from '../utils/db';
import { useNotification } from '../contexts/NotificationContext';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import { fileToBase64 } from '../utils/fileReader';
import type { Resource, FullTeacherAssignment } from '../types';
import ResourceViewerModal from './ResourceViewerModal';
import ConfirmationModal from './ConfirmationModal';

const AdminResourceManager: React.FC = () => {
    const { addNotification } = useNotification();
    const { selectedYear, classes } = useSchoolYear();
    
    // Data states
    const [resources, setResources] = useState<Resource[]>([]);
    const [assignments, setAssignments] = useState<FullTeacherAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI states
    const [filters, setFilters] = useState({ className: 'all', subjectId: 'all' });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<Resource | null>(null);
    const [formState, setFormState] = useState({
        assignment_id: '',
        resource_type: 'file' as 'file' | 'link',
        title: '',
        url: '',
        file: null as File | null
    });
    const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
    const [viewingResource, setViewingResource] = useState<Resource | null>(null);

    const getCacheKey = useCallback(() => {
        if (!selectedYear) return null;
        return `/admin/resources?yearId=${selectedYear.id}`;
    }, [selectedYear]);

    const fetchData = useCallback(async () => {
        if (!selectedYear) return;
        setIsLoading(true);
        try {
            const [resourcesData, assignmentsData] = await Promise.all([
                apiFetch(getCacheKey()!),
                apiFetch(`/full-assignments?yearId=${selectedYear.id}`)
            ]);
            setResources(resourcesData);
            setAssignments(assignmentsData);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear, addNotification, getCacheKey]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const resetForm = () => {
        setIsFormOpen(false);
        setEditingResource(null);
        setFormState({
            assignment_id: '',
            resource_type: 'file',
            title: '',
            url: '',
            file: null
        });
    };
    
    const handleEdit = (resource: Resource) => {
        setEditingResource(resource);
        setFormState({
            assignment_id: resource.assignment_id.toString(),
            resource_type: resource.resource_type,
            title: resource.title,
            url: resource.url || '',
            file: null,
        });
        setIsFormOpen(true);
    };
    
    const handleView = (resource: Resource) => {
        if (resource.resource_type === 'link' && resource.url) {
            window.open(resource.url, '_blank', 'noopener,noreferrer');
        } else {
            setViewingResource(resource);
        }
    };

    const handleConfirmDelete = async () => {
        if (!resourceToDelete) return;
        const cacheKey = getCacheKey()!;
        try {
            const result = await apiFetch(`/resources/${resourceToDelete.id}`, { method: 'DELETE' });
            if (result?.queued) {
                const updatedResources = resources.filter(r => r.id !== resourceToDelete.id);
                setResources(updatedResources);
                await db.saveData(cacheKey, updatedResources);
                addNotification({ type: 'info', message: 'Suppression en attente de synchronisation.' });
            } else {
                addNotification({ type: 'success', message: 'Ressource supprimée.' });
                await fetchData();
            }
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setResourceToDelete(null);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isEditing = !!editingResource;
        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `/resources/${editingResource!.id}` : '/resources';
        const cacheKey = getCacheKey()!;

        let body: Partial<Resource> & { assignment_id?: number } = {
            title: formState.title,
        };

        if (isEditing) {
             body.assignment_id = editingResource!.assignment_id;
             body.resource_type = editingResource!.resource_type;
        } else {
            if (!formState.assignment_id) {
                addNotification({type: 'error', message: "Veuillez sélectionner une assignation."});
                return;
            }
            body.assignment_id = Number(formState.assignment_id);
            body.resource_type = formState.resource_type;
        }

        try {
            if (body.resource_type === 'file') {
                 if (formState.file) {
                    body.file_name = formState.file.name;
                    body.mime_type = formState.file.type;
                    body.file_content = await fileToBase64(formState.file);
                } else if (!isEditing) {
                    throw new Error("Veuillez sélectionner un fichier.");
                }
            } else if (body.resource_type === 'link') {
                body.url = formState.url;
            }
            
            const result = await apiFetch(url, { method, body: JSON.stringify(body) });
            
            if (result?.queued) {
                addNotification({ type: 'info', message: 'Action en attente de synchronisation.' });
                const assignment = assignments.find(a => a.id === body.assignment_id);
                // FIX: Construct a fully compliant `Resource` object for the optimistic update.
                // This ensures all required properties are present, satisfying TypeScript.
                const optimisticResource: Resource = {
                    // When editing, spread the original. When creating, provide a base object.
                    ...(editingResource || {
                        id: Date.now(),
                        assignment_id: Number(formState.assignment_id),
                        resource_type: formState.resource_type,
                        created_at: new Date().toISOString(),
                        title: '' // Will be overwritten by body
                    }),
                    // Spread the new values from the form state.
                    ...body,
                    // Add joined fields for UI display.
                    class_name: assignment?.class_name,
                    subject_name: assignment?.subject_name,
                    teacher_prenom: assignment?.teacher_prenom,
                    teacher_nom: assignment?.teacher_nom,
                };
                const updatedResources = isEditing
                    ? resources.map(r => r.id === editingResource!.id ? optimisticResource : r)
                    : [optimisticResource, ...resources];
                setResources(updatedResources);
                await db.saveData(cacheKey, updatedResources);

            } else {
                addNotification({ type: 'success', message: `Ressource ${isEditing ? 'mise à jour' : 'ajoutée'}.` });
                await fetchData();
            }
            resetForm();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const filteredResources = useMemo(() => {
        return resources.filter(res => {
            const classMatch = filters.className === 'all' || res.class_name === filters.className;
            const subjectMatch = filters.subjectId === 'all' || res.subject_id?.toString() === filters.subjectId;
            return classMatch && subjectMatch;
        });
    }, [resources, filters]);
    
    const availableSubjects = useMemo(() => {
        const subjects = new Map<number, string>();
        assignments.forEach(assignment => {
            if (assignment.subject_id && assignment.subject_name) {
                subjects.set(assignment.subject_id, assignment.subject_name);
            }
        });
        return Array.from(subjects, ([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [assignments]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-700 font-display">Gestion des Ressources</h2>
                <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">Ajouter une ressource</button>
            </div>
            
            <div className="my-4 p-4 border rounded-lg flex flex-wrap gap-4 items-end bg-slate-50">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Classe</label>
                    <select value={filters.className} onChange={e => setFilters(f => ({...f, className: e.target.value}))} className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md">
                        <option value="all">Toutes les classes</option>
                        {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Matière</label>
                    <select value={filters.subjectId} onChange={e => setFilters(f => ({...f, subjectId: e.target.value}))} className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md">
                        <option value="all">Toutes les matières</option>
                        {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>
            
            {isLoading ? <p>Chargement...</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Titre</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Classe</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Matière</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Professeur</th>
                                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {filteredResources.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-8 text-slate-500 italic">Aucune ressource trouvée.</td></tr>
                            ) : (
                                filteredResources.map(res => (
                                    <tr key={res.id}>
                                        <td className="px-4 py-2 font-medium">{res.title}</td>
                                        <td className="px-4 py-2">{res.class_name}</td>
                                        <td className="px-4 py-2">{res.subject_name}</td>
                                        <td className="px-4 py-2">{res.teacher_prenom} {res.teacher_nom}</td>
                                        <td className="px-4 py-2 text-center space-x-2">
                                            <button onClick={() => handleView(res)} className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">Voir</button>
                                            <button onClick={() => handleEdit(res)} className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">Modifier</button>
                                            <button onClick={() => setResourceToDelete(res)} className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">Supprimer</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={resetForm}>
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <h3 className="font-semibold">{editingResource ? 'Modifier la ressource' : 'Ajouter une ressource'}</h3>
                             {!editingResource && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium">Assignation (Professeur - Matière - Classe)</label>
                                        <select value={formState.assignment_id} onChange={e => setFormState(s => ({...s, assignment_id: e.target.value}))} required className="w-full p-2 border rounded-md">
                                            <option value="" disabled>Sélectionner...</option>
                                            {assignments.map(a => (<option key={a.id} value={a.id}>{a.teacher_prenom} {a.teacher_nom} - {a.subject_name} ({a.class_name})</option>))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 p-1 bg-slate-200 rounded-lg">
                                        {(['file', 'link'] as const).map(type => (<button key={type} type="button" onClick={() => setFormState(s => ({...s, resource_type: type}))} className={`px-3 py-1 text-sm rounded-md capitalize transition-colors flex-grow ${formState.resource_type === type ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-300'}`}>{type}</button>))}
                                    </div>
                                </>
                             )}
                            <div>
                                <label className="block text-sm font-medium">Titre</label>
                                <input type="text" value={formState.title} onChange={e => setFormState(s => ({...s, title: e.target.value}))} required className="w-full p-2 border rounded-md" />
                            </div>
                            {formState.resource_type === 'file' && (
                                <div>
                                    <label className="block text-sm font-medium">Fichier</label>
                                    <input type="file" onChange={e => setFormState(s => ({...s, file: e.target.files?.[0] || null}))} required={!editingResource} className="w-full text-sm" />
                                    {editingResource && <p className="text-xs text-slate-500 mt-1">Laissez vide pour conserver le fichier actuel.</p>}
                                </div>
                            )}
                            {formState.resource_type === 'link' && <div><label className="block text-sm font-medium">URL</label><input type="url" value={formState.url} onChange={e => setFormState(s => ({...s, url: e.target.value}))} required className="w-full p-2 border rounded-md" placeholder="https://example.com" /></div>}
                            <div className="flex justify-end gap-2"><button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-200 rounded-md">Annuler</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{editingResource ? 'Mettre à jour' : 'Ajouter'}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {viewingResource && <ResourceViewerModal isOpen={!!viewingResource} onClose={() => setViewingResource(null)} resourceId={viewingResource.id} />}
            {resourceToDelete && <ConfirmationModal isOpen={!!resourceToDelete} onClose={() => setResourceToDelete(null)} onConfirm={handleConfirmDelete} title="Supprimer la ressource" message={`Confirmez-vous la suppression de "${resourceToDelete.title}" ?`} />}
        </div>
    );
};

export default AdminResourceManager;