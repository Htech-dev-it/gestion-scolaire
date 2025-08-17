import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import type { User } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { useAuth } from '../auth/AuthContext';

const CredentialsModal: React.FC<{
    credentials: { username: string; tempPassword: string };
    onClose: () => void;
}> = ({ credentials, onClose }) => {
    const { addNotification } = useNotification();
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addNotification({ type: 'info', message: 'Copié !' });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
                <h2 className="text-lg font-bold mb-4">Mot de Passe Réinitialisé</h2>
                <p className="text-sm text-slate-600 mb-4">Veuillez noter ces informations et les transmettre à l'utilisateur.</p>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-500">Nom d'utilisateur</label>
                        <p className="p-2 bg-slate-100 rounded font-mono">{credentials.username}</p>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500">Nouveau mot de passe</label>
                        <div className="flex items-center gap-2">
                            <p className="flex-grow p-2 bg-slate-100 rounded font-mono">{credentials.tempPassword}</p>
                            <button onClick={() => copyToClipboard(credentials.tempPassword)} className="p-2 text-slate-500 hover:bg-slate-200 rounded" title="Copier">
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

const SuperAdminManager: React.FC = () => {
    const { addNotification } = useNotification();
    const { user: currentUser } = useAuth();
    const [superAdmins, setSuperAdmins] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [formState, setFormState] = useState({ username: '', password: '', email: '', sendEmail: true });
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [userToReset, setUserToReset] = useState<User | null>(null);
    const [credentials, setCredentials] = useState<{ username: string, tempPassword: string } | null>(null);

    const fetchSuperAdmins = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch('/superadmin/superadmins');
            setSuperAdmins(data);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        fetchSuperAdmins();
    }, [fetchSuperAdmins]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = await apiFetch('/superadmin/superadmins', {
                method: 'POST',
                body: JSON.stringify(formState)
            });
            addNotification({ type: 'success', message: data.message || `Super admin délégué '${formState.username}' créé.` });
            setFormState({ username: '', password: '', email: '', sendEmail: true });
            fetchSuperAdmins();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleResetPasswordConfirm = async () => {
        if (!userToReset) return;
        try {
            const data = await apiFetch(`/superadmin/superadmins/${userToReset.id}/reset-password`, { method: 'PUT' });
            if (data.tempPassword) {
                setCredentials(data);
            } else {
                addNotification({ type: 'success', message: data.message });
            }
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setUserToReset(null);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;
        try {
            await apiFetch(`/superadmin/superadmins/${userToDelete.id}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: `Le compte de ${userToDelete.username} a été supprimé.` });
            fetchSuperAdmins();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setUserToDelete(null);
        }
    };

    return (
        <>
            <h2 className="text-xl font-semibold text-slate-700 font-display">Gestion des Super Administrateurs</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">Créez et gérez des comptes administrateurs délégués avec des permissions restreintes.</p>
            
            <form onSubmit={handleCreate} className="space-y-3 p-4 border rounded-lg bg-slate-50 mb-6">
                <h3 className="font-semibold">Ajouter un Super Admin Délégué</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Nom d'utilisateur" value={formState.username} onChange={e => setFormState(s => ({...s, username: e.target.value}))} required className="w-full p-2 border rounded-md" />
                    <input type="password" placeholder="Mot de passe" value={formState.password} onChange={e => setFormState(s => ({...s, password: e.target.value}))} required className="w-full p-2 border rounded-md" />
                </div>
                <div>
                     <input type="email" placeholder="Email (optionnel)" value={formState.email} onChange={e => setFormState(s => ({...s, email: e.target.value}))} className="w-full p-2 border rounded-md" />
                </div>
                <div className="flex items-center">
                    <input id="sendEmailSuperAdmin" type="checkbox" checked={formState.sendEmail} onChange={e => setFormState(s => ({ ...s, sendEmail: e.target.checked }))} className="h-4 w-4 rounded" />
                    <label htmlFor="sendEmailSuperAdmin" className="ml-2 text-sm">Envoyer les identifiants par email</label>
                </div>
                <div className="text-right">
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Ajouter</button>
                </div>
            </form>

            <div className="space-y-2">
                {isLoading ? <p>Chargement...</p> : superAdmins.map(user => (
                    <div key={user.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                            <p className="font-medium">{user.username}</p>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${user.role === 'superadmin' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{user.role === 'superadmin' ? 'Principal' : 'Délégué'}</span>
                        </div>
                        {user.id !== currentUser?.id && (
                             <div className="flex items-center gap-2">
                                <button onClick={() => setUserToReset(user)} className="px-3 py-1 text-xs text-yellow-800 bg-yellow-200 rounded-full hover:bg-yellow-300">Réinitialiser MDP</button>
                                <button onClick={() => setUserToDelete(user)} className="px-3 py-1 text-xs text-white bg-red-600 rounded-full hover:bg-red-700">Supprimer</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <ConfirmationModal 
                isOpen={!!userToReset}
                onClose={() => setUserToReset(null)}
                onConfirm={handleResetPasswordConfirm}
                title="Réinitialiser le mot de passe"
                message={`Un nouveau mot de passe temporaire sera généré pour ${userToReset?.username}. Confirmez-vous ?`}
            />

             <ConfirmationModal 
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Supprimer le Super Admin"
                message={`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${userToDelete?.username} ?`}
            />

            {credentials && <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />}
        </>
    );
};

export default SuperAdminManager;
