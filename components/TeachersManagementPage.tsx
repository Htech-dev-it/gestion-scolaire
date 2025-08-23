import React, { useState, useEffect, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import type { Teacher } from '../types';
import ConfirmationModal from './ConfirmationModal';
import TeacherAssignmentModal from './TeacherAssignmentModal';
import PhoneInput from 'react-phone-input-2';
import { useSchoolYear } from '../contexts/SchoolYearContext';

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
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [formState, setFormState] = useState({ nom: '', prenom: '', email: '', phone: '', nif: '', sendEmail: true });
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
        setFormState({ nom: '', prenom: '', email: '', phone: '', nif: '', sendEmail: true });
        setShowForm(false);
        setEditingTeacher(null);
    };

    const handleEditRequest = (teacher: Teacher) => {
        setEditingTeacher(teacher);
        setFormState({
            prenom: teacher.prenom,
            nom: teacher.nom,
            email: teacher.email || '',
            phone: teacher.phone || '',
            nif: teacher.nif || '',
            sendEmail: true
        });
        setShowForm(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isEditing = !!editingTeacher;
        const url = isEditing ? `/teachers/${editingTeacher!.id}` : '/teachers';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const data = await apiFetch(url, { method, body: JSON.stringify(formState) });
            addNotification({ type: 'success', message: `Le professeur ${formState.prenom} a été ${isEditing ? 'mis à jour' : 'ajouté'}.` });
            if (!isEditing && data.username && data.tempPassword) {
                setCredentials({ username: data.username, tempPassword: data.tempPassword });
            }
            resetForm();
            await fetchTeachers();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleResetPassword = async (teacher: Teacher) => {
        try {
            const data = await apiFetch(`/teachers/${teacher.id}/reset-password`, { method: 'PUT' });
            
            if (data.tempPassword) {
                // Case 1: API returned credentials because no email is available. Show the modal.
                addNotification({ type: 'info', message: `Mot de passe pour ${teacher.prenom} réinitialisé. Veuillez le noter.` });
                setCredentials({ username: teacher.username, tempPassword: data.tempPassword });
            } else {
                // Case 2: API sent an email and returned a confirmation message. Show a notification.
                addNotification({ type: 'success', message: data.message || `Le mot de passe pour ${teacher.prenom} a été réinitialisé et envoyé par email.` });
            }
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
            {showForm ? (
                <div className="my-4 p-4 border rounded-lg bg-slate-50">
                    <h3 className="font-semibold mb-2">{editingTeacher ? `Modifier le profil de ${editingTeacher.prenom} ${editingTeacher.nom}` : 'Ajouter un nouveau professeur'}</h3>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" value={formState.prenom} onChange={e => setFormState(s => ({...s, prenom: e.target.value}))} placeholder="Prénom" required className="px-3 py-2 border rounded-md" />
                            <input type="text" value={formState.nom} onChange={e => setFormState(s => ({...s, nom: e.target.value}))} placeholder="Nom" required className="px-3 py-2 border rounded-md" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="email" value={formState.email} onChange={e => setFormState(s => ({...s, email: e.target.value}))} placeholder="Email" required className="px-3 py-2 border rounded-md" />
                             <PhoneInput
                                country={'ht'}
                                value={formState.phone}
                                onChange={phone => setFormState(s => ({...s, phone}))}
                                containerClass="mt-0"
                                inputProps={{
                                    name: 'phone',
                                    placeholder: 'Téléphone',
                                    required: true,
                                }}
                            />
                        </div>
                         <div>
                            <input 
                                type="text" 
                                inputMode="numeric" 
                                value={formState.nif} 
                                onChange={e => {
                                    const value = e.target.value;
                                    // Allow only numeric input by stripping non-digit characters
                                    if (/^\d*$/.test(value)) {
                                        setFormState(s => ({...s, nif: value}));
                                    }
                                }}
                                placeholder="Numéro Identification Unique / NIF" 
                                required 
                                className="px-3 py-2 border rounded-md w-full" 
                            />
                        </div>
                        {!editingTeacher && (
                            <div className="flex items-center">
                                <input
                                    id="sendEmailTeacher"
                                    type="checkbox"
                                    checked={formState.sendEmail}
                                    onChange={e => setFormState(s => ({ ...s, sendEmail: e.target.checked }))}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="sendEmailTeacher" className="ml-2 block text-sm text-slate-700">
                                    Envoyer les identifiants par email au professeur
                                </label>
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-100 rounded-md">Annuler</button>
                            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md">{editingTeacher ? 'Mettre à jour' : 'Enregistrer'}</button>
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
                            <div className="flex gap-2 flex-wrap items-center">
                                <button onClick={() => handleEditRequest(teacher)} className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200">Modifier</button>
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


const TeachersManagementPage: React.FC = () => {
    const { hasPermission } = useAuth();
    const navigate = ReactRouterDOM.useNavigate();
    const { selectedYear } = useSchoolYear();
    const [teacherToAssign, setTeacherToAssign] = useState<Teacher | null>(null);

    React.useEffect(() => {
        if (!hasPermission('settings:manage_teachers')) {
            navigate('/dashboard', { replace: true });
        }
    }, [hasPermission, navigate]);

    if (!hasPermission('settings:manage_teachers')) {
        return null;
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <header className="mb-8">
                <ReactRouterDOM.Link to="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                    Retour à l'accueil
                </ReactRouterDOM.Link>
                <h1 className="text-4xl font-bold text-gray-800 font-display">Gestion des Professeurs</h1>
                <p className="text-lg text-slate-500 mt-2">Gérez les profils, comptes et assignations des professeurs.</p>
            </header>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <TeacherManager onAssign={setTeacherToAssign} />
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

export default TeachersManagementPage;