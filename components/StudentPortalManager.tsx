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

            if (data.emailSent) {
                addNotification({
                    type: 'info',
                    message: `Les identifiants ont aussi été envoyés par email au tuteur.`
                });
            }

            fetchStudentsWithStatus();
        } catch (error) {
             if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleResetPassword = async (studentId: string) => {
        try {
            const data = await apiFetch(`/students/${studentId}/reset-password`, { method: 'PUT' });
            setIndividualCredential({ credential: data, title: "Mot de passe réinitialisé" });

            if (data.emailSent) {
                addNotification({
                    type: 'info',
                    message: `Un email avec les nouveaux identifiants a également été envoyé au tuteur.`
                });
            }
            fetchStudentsWithStatus();
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
            <p className="text-sm text-slate-500 mt-1 mb-4">
                Créez les comptes pour les élèves n'en ayant pas encore, ou réinitialisez les mots de passe individuellement.
            </p>

            <div className="my-4 p-4 border rounded-lg flex flex-wrap gap-4 items-end bg-slate-50">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Classe</label>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md">
                        {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                 <button
                    onClick={handleCreateAccounts}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-slate-400"
                >
                    {isLoading ? 'Création en cours...' : `Créer les comptes manquants pour ${selectedClass}`}
                </button>
            </div>
            
             {generatedData && generatedData.length > 0 && (
                <div className="my-4 p-4 border rounded-lg bg-green-50">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-green-800">Identifiants Générés</h3>
                        <button onClick={handlePrint} className="px-3 py-1 text-sm text-white bg-green-600 rounded-md">Imprimer</button>
                    </div>
                    <div className="max-h-60 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {generatedData.map(cred => (
                            <div key={cred.username} className="p-2 bg-white rounded border">
                                <p className="font-medium">{cred.prenom} {cred.nom}</p>
                                <p>User: <span className="font-mono">{cred.username}</span></p>
                                <p>Pass: <span className="font-mono">{cred.temp_password}</span></p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="overflow-x-auto mt-4">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Élève</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase">Statut du Compte</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                         {isListLoading ? (
                             <tr><td colSpan={3} className="text-center py-8 text-slate-500 italic">Chargement de la liste...</td></tr>
                         ) : studentsWithStatus.length === 0 ? (
                             <tr><td colSpan={3} className="text-center py-8 text-slate-500 italic">Aucun élève dans cette classe.</td></tr>
                         ) : (
                            studentsWithStatus.map(student => (
                                <tr key={student.student_id}>
                                    <td className="px-4 py-2 font-medium">{student.prenom} {student.nom}</td>
                                    <td className="px-4 py-2 text-center">
                                        {student.account_id ? 
                                            <span className="px-2 py-0.5 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Actif</span> : 
                                            <span className="px-2 py-0.5 text-xs font-semibold text-slate-700 bg-slate-200 rounded-full">Inexistant</span>
                                        }
                                    </td>
                                    <td className="px-4 py-2 text-center space-x-2">
                                        {student.account_id ? (
                                            <>
                                                <button onClick={() => handleResetPassword(student.student_id)} className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-200 rounded-full hover:bg-yellow-300">Réinitialiser MDP</button>
                                                <button onClick={() => handleDeleteAccountRequest(student)} className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200">Supprimer</button>
                                            </>
                                        ) : (
                                            <button onClick={() => handleCreateIndividualAccount(student.student_id)} className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200">Créer le Compte</button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {individualCredential && (
                <CredentialModal
                    credential={individualCredential.credential}
                    onClose={() => setIndividualCredential(null)}
                    title={individualCredential.title}
                />
            )}

            <ConfirmationModal 
                isOpen={!!studentToDelete}
                onClose={() => setStudentToDelete(null)}
                onConfirm={handleConfirmDeleteAccount}
                title="Supprimer le Compte Élève"
                message={`Êtes-vous sûr de vouloir supprimer le compte de connexion de ${studentToDelete?.prenom} ${studentToDelete?.nom} ? L'élève ne pourra plus se connecter. Son profil ne sera pas affecté.`}
            />

        </div>
    );
};

export default StudentPortalManager;