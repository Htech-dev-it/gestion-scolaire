import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import { fileToBase64 } from '../utils/fileReader';
import type { Resource } from '../types';

interface ResourceManagerProps {
    assignmentId: number;
}

const ResourceManager: React.FC<ResourceManagerProps> = ({ assignmentId }) => {
    const { addNotification } = useNotification();
    const [resources, setResources] = useState<Resource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'add' | 'list'>('list');
    const [addType, setAddType] = useState<'file' | 'link'>('file');
    const [formState, setFormState] = useState({ title: '', url: '', file: null as File | null });

    const fetchResources = useCallback(async () => {
        if (!assignmentId) return;
        setIsLoading(true);
        try {
            const data = await apiFetch(`/resources?assignmentId=${assignmentId}`);
            setResources(data);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [assignmentId, addNotification]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    const resetForm = () => {
        setFormState({ title: '', url: '', file: null });
        setActiveTab('list');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        let body: Partial<Resource> = {
            assignment_id: assignmentId,
            resource_type: addType,
            title: formState.title,
        };

        try {
            if (addType === 'file' && formState.file) {
                body.file_name = formState.file.name;
                body.mime_type = formState.file.type;
                body.file_content = await fileToBase64(formState.file);
            } else if (addType === 'link') {
                body.url = formState.url;
            } else {
                throw new Error("Type de ressource ou données invalides.");
            }

            await apiFetch('/resources', { method: 'POST', body: JSON.stringify(body) });
            addNotification({ type: 'success', message: 'Ressource ajoutée avec succès.' });
            resetForm();
            await fetchResources();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDelete = async (resourceId: number) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette ressource ?")) return;
        
        try {
            await apiFetch(`/resources/${resourceId}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: 'Ressource supprimée.' });
            await fetchResources();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const renderAddForm = () => (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 p-1 bg-slate-200 rounded-lg">
                {(['file', 'link'] as const).map(type => (
                    <button key={type} type="button" onClick={() => setAddType(type)} className={`px-3 py-1 text-sm rounded-md capitalize transition-colors flex-grow ${addType === type ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-300'}`}>{type}</button>
                ))}
            </div>
            <div>
                <label className="block text-sm font-medium">Titre</label>
                <input type="text" value={formState.title} onChange={e => setFormState(s => ({...s, title: e.target.value}))} required className="w-full p-2 border rounded-md" />
            </div>
            {addType === 'file' && <div><label className="block text-sm font-medium">Fichier</label><input type="file" onChange={e => setFormState(s => ({...s, file: e.target.files?.[0] || null}))} required className="w-full text-sm" /></div>}
            {addType === 'link' && <div><label className="block text-sm font-medium">URL</label><input type="url" value={formState.url} onChange={e => setFormState(s => ({...s, url: e.target.value}))} required className="w-full p-2 border rounded-md" placeholder="https://example.com" /></div>}
            <div className="flex justify-end gap-2"><button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-200 rounded-md">Annuler</button><button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-slate-400">Ajouter</button></div>
        </form>
    );

    const renderResourceList = () => (
        <div>
            <button onClick={() => setActiveTab('add')} className="w-full py-2 mb-4 bg-blue-600 text-white rounded-md hover:bg-blue-700">Ajouter une nouvelle ressource</button>
            {isLoading ? <p>Chargement...</p> : resources.length === 0 ? <p className="italic text-center text-slate-500">Aucune ressource pour ce cours.</p> : (
                <ul className="space-y-2">
                    {resources.map(res => (
                        <li key={res.id} className="flex justify-between items-center p-2 bg-white rounded-md shadow-sm">
                            <div>
                                <p className="font-medium text-sm">{res.title}</p>
                                <p className="text-xs text-slate-500 capitalize">{res.resource_type} {res.file_name && `(${res.file_name})`}</p>
                            </div>
                            <button onClick={() => handleDelete(res.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
    
    return activeTab === 'add' ? renderAddForm() : renderResourceList();
};

export default ResourceManager;