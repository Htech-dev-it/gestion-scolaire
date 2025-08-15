import React, { useState, useCallback, useEffect } from 'react';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import type { Instance, StudentWithAccountStatus, ClassDefinition } from '../types';
import ConfirmationModal from './ConfirmationModal';

interface GeneratedCredential {
    prenom: string;
    nom: string;
    username: string;
    temp_password: string;
}

const CredentialModal: React.FC<{ credential: GeneratedCredential, onClose: () => void, title: string }> = ({ credential, onClose, title }) => {
     const { addNotification } = useNotification();
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addNotification({ type: 'info', message: 'Copié !' });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
                <h2 className="text-lg font-bold mb-4">{title}</h2>
                <p className="text-sm text-slate-600 mb-2">Pour {credential.prenom} {credential.nom}</p>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-500">Nom d'utilisateur</label>
                        <div className="flex items-center gap-2">
                            <p className="flex-grow p-2 bg-slate-100 rounded font-mono">{credential.username}</p>
                            <button onClick={() => copyToClipboard(credential.username)} className="p-2 text-slate-500 hover:bg-slate-200 rounded">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2-2H9a2 2 0 01-2-2V9z" /><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H4z" /></svg>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500">Mot de passe temporaire</label>
                        <div className="flex items-center gap-2">
                             <p className="flex-grow p-2 bg-slate-100 rounded font-mono">{credential.temp_password}</p>
                             <button onClick={() => copyToClipboard(credential.temp_password)} className="p-2 text-slate-500 hover:bg-slate-200 rounded">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2-2H9a2 2 0 01-2-2V9z" /><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H4z" /></svg>
                             </button>
                        </div>
                    </div>
                </div>
                <div className="mt-6 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md">Fermer</button>
                </div>
            </div>
        </div>
    );
};


const StudentPortalManager: React.FC = () => {
    const { selectedYear, classes } = useSchoolYear();
    const { addNotification } = useNotification();
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListLoading, setIsListLoading] = useState(false);
    const [generatedData, setGeneratedData] = useState<GeneratedCredential[] | null>(null);
    const [individualCredential, setIndividualCredential] = useState<{ credential: GeneratedCredential, title: string } | null>(null);
    const [schoolInfo, setSchoolInfo] = useState<Instance | null>(null);
    const [studentsWithStatus, setStudentsWithStatus] = useState<StudentWithAccountStatus[]>([]);
    const [studentToDelete, setStudentToDelete] = useState<StudentWithAccountStatus | null>(null);

    useEffect(() => {
        if (classes.length > 0 && !selectedClass) {
            setSelectedClass(classes[0].name);
        }
    }, [classes, selectedClass]);

    useEffect(() => {
        apiFetch('/instance/current').then(setSchoolInfo).catch(console.error);
    }, []);
    
    const fetchStudentsWithStatus = useCallback(async () => {
        if (!selectedYear || !selectedClass) return;
        setIsListLoading(true);
        try {
            const data = await apiFetch(`/classes/${selectedClass}/students-with-account-status?yearId=${selectedYear.id}`);
            setStudentsWithStatus(data);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsListLoading(false);
        }
    }, [selectedClass, selectedYear, addNotification]);

    useEffect(() => {
        fetchStudentsWithStatus();
    }, [fetchStudentsWithStatus]);

    const handleCreateAccounts = async () => {
        if (!selectedYear) return;
        setIsLoading(true);
        setGeneratedData(null);
        try {
            const data = await apiFetch('/students/create-accounts', {
                method: 'POST',
                body: JSON.stringify({ yearId: selectedYear.id, className: selectedClass })
            });
            setGeneratedData(data.credentials);
            addNotification({ type: 'success', message: data.message });
            fetchStudentsWithStatus(); // Refresh list
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCreateIndividualAccount = async (studentId: string) => {
        try {
            const data = await apiFetch(`/students/${studentId}/create-account`, { method: 'POST' });
            setIndividualCredential({ credential: data, title: "Compte créé avec succès" });
            fetchStudentsWithStatus();
        } catch (error) {
             if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleResetPassword = async (studentId: string) => {
        try {
            const data = await apiFetch(`/students/${studentId}/reset-password`, { method: 'PUT' });
            setIndividualCredential({ credential: data, title: "Mot de passe réinitialisé" });
        } catch (error) {
             if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleDeleteAccountRequest = (student: StudentWithAccountStatus) => {
        setStudentToDelete(student);
    };

    const handleConfirmDeleteAccount = async () => {
        if (!studentToDelete) return;
        try {
            await apiFetch(`/students/${studentToDelete.student_id}/account`, { method: 'DELETE' });
            addNotification({ type: 'success', message: 'Compte élève supprimé.'});
            fetchStudentsWithStatus();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setStudentToDelete(null);
        }
    };
    
    const handlePrint = () => {
        if (!generatedData || !schoolInfo) return;
        
        const printContent = `
            <html>
                <head>
                    <title>Identifiants Élèves - ${selectedClass}</title>
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 10pt; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .credential-slip { page-break-inside: avoid; border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; border-radius: 5px; width: 100%; box-sizing: border-box; }
                        .grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                         @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { size: portrait; margin: 0.75in; } }
                    </style>
                </head>
                <body>
                    <div class="header"><h1>${schoolInfo.name}</h1><h2>Identifiants de Connexion - Classe ${selectedClass} - ${selectedYear?.name}</h2></div>
                    <div class="grid-container">
                        ${generatedData.map(cred => `<div class="credential-slip"><p><strong>Élève:</strong> ${cred.prenom} ${cred.nom}</p><p><strong>Nom d'utilisateur:</strong> ${cred.username}</p><p><strong>Mot de passe:</strong> ${cred.temp_password}</p></div>`).join('')}
                    </div>
                </body>
            </html>`;
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
        }
    };


    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-700 font-display">Gestion des Comptes Élèves</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">Créez automatiquement les comptes pour que les élèves puissent se connecter à leur portail.</p>
            
            <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Création en Masse</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">1. Sélectionner une classe</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => {
                            setSelectedClass(e.target.value);
                            setGeneratedData(null);
                        }}
                        className="mt-1 block w-full md:w-1/2 pl-3 pr-10 py-2 border-slate-300 rounded-md"
                    >
                        {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <h3 className="block text-sm font-medium text-gray-700 mb-1">2. Lancer la création des comptes</h3>
                    <p className="text-xs text-slate-500 mb-2">Le système créera des comptes uniquement pour les élèves de la classe sélectionnée qui n'en ont pas déjà un. Cette action est sûre et peut être répétée.</p>
                    <button onClick={handleCreateAccounts} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-slate-400">
                        {isLoading ? 'Création en cours...' : `Créer les comptes pour ${selectedClass}`}
                    </button>
                </div>
            </div>

            {generatedData && (
                <div className="mt-6 p-4 border-2 border-green-300 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center"><h3 className="text-lg font-semibold text-green-800 font-display mb-2">Comptes Créés / Fiche d'Identifiants</h3><button onClick={handlePrint} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700">Imprimer la Fiche</button></div>
                    <p className="text-xs text-green-700 mb-2">Imprimez cette fiche et distribuez les identifiants aux élèves. Ils seront invités à changer leur mot de passe à la première connexion.</p>
                    <div className="overflow-x-auto"><table className="min-w-full bg-white text-sm"><thead className="bg-green-200"><tr><th className="p-2 text-left">Nom Complet</th><th className="p-2 text-left">Nom d'utilisateur</th><th className="p-2 text-left">Mot de Passe Temporaire</th></tr></thead><tbody>{generatedData.map(cred => (<tr key={cred.username} className="border-b"><td className="p-2">{cred.prenom} {cred.nom}</td><td className="p-2 font-mono">{cred.username}</td><td className="p-2 font-mono">{cred.temp_password}</td></tr>))}</tbody></table></div>
                </div>
            )}
            
            <div className="mt-6 bg-slate-50 p-4 rounded-lg border space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Gestion Individuelle</h3>
                {isListLoading ? <p>Chargement de la liste...</p> : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white text-sm">
                            <thead className="bg-slate-200">
                                <tr>
                                    <th className="p-2 text-left font-semibold">Élève</th>
                                    <th className="p-2 text-center font-semibold">Statut du Compte</th>
                                    <th className="p-2 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {studentsWithStatus.map(student => (
                                    <tr key={student.student_id}>
                                        <td className="p-2 font-medium">{student.prenom} {student.nom}</td>
                                        <td className="p-2 text-center">
                                            {student.account_id 
                                                ? <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">Actif</span>
                                                : <span className="px-2 py-1 text-xs font-semibold text-slate-600 bg-slate-200 rounded-full">Inactif</span>
                                            }
                                        </td>
                                        <td className="p-2 text-right space-x-2">
                                            {student.account_id ? (
                                                <>
                                                    <button onClick={() => handleResetPassword(student.student_id)} className="px-3 py-1 text-xs font-medium text-black bg-yellow-400 rounded-md hover:bg-yellow-500">Réinitialiser MDP</button>
                                                    <button onClick={() => handleDeleteAccountRequest(student)} className="px-3 py-1 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600">Supprimer</button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleCreateIndividualAccount(student.student_id)} className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Créer le compte</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {individualCredential && <CredentialModal credential={individualCredential.credential} title={individualCredential.title} onClose={() => setIndividualCredential(null)} />}
            {studentToDelete && (
                <ConfirmationModal
                    isOpen={!!studentToDelete}
                    onClose={() => setStudentToDelete(null)}
                    onConfirm={handleConfirmDeleteAccount}
                    title="Supprimer le Compte Élève"
                    message={`Êtes-vous sûr de vouloir supprimer définitivement le compte de connexion pour ${studentToDelete.prenom} ${studentToDelete.nom} ? Son profil et ses notes ne seront pas affectés.`}
                />
            )}
        </div>
    );
};

export default StudentPortalManager;
