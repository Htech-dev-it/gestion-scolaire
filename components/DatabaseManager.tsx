import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../auth/AuthContext';

type BackupType = 'sql' | 'files' | 'full';
type BackupColor = 'blue' | 'green' | 'orange';

interface ModalInfo {
    type: BackupType;
    title: string;
    message: string;
    color: BackupColor;
    confirmText: string;
}

const BackupConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    modalInfo: ModalInfo | null;
}> = ({ isOpen, onClose, onConfirm, modalInfo }) => {
    if (!isOpen || !modalInfo) return null;

    const colorClasses: Record<BackupColor, string> = {
        'blue': 'bg-[#4A90E2] hover:bg-[#357ABD]',
        'green': 'bg-teal-500 hover:bg-teal-600',
        'orange': 'bg-[#F5A623] hover:bg-[#E49B20]'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold font-display text-gray-800">{modalInfo.title}</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <p className="text-sm text-slate-600 mb-2">{modalInfo.message}</p>
                <p className="text-sm font-semibold text-slate-700">Cette opération peut prendre quelques instants.</p>
                <div className="flex justify-end space-x-3 pt-6 mt-4 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Annuler</button>
                    <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${colorClasses[modalInfo.color] || 'bg-gray-600'}`}>
                        {modalInfo.confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};


const BackupCard: React.FC<{
    title: string;
    description: React.ReactNode;
    icon: React.ReactNode;
    buttonText: string;
    onButtonClick: () => void;
    isLoading: boolean;
    color: BackupColor;
}> = ({ title, description, icon, buttonText, onButtonClick, isLoading, color }) => {

    const borderColors: Record<BackupColor, string> = { blue: 'border-blue-300', green: 'border-teal-300', orange: 'border-amber-300' };
    const buttonColors: Record<BackupColor, string> = { 
        blue: 'bg-[#4A90E2] hover:bg-[#357ABD] disabled:bg-blue-300', 
        green: 'bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300',
        orange: 'bg-[#F5A623] hover:bg-[#E49B20] disabled:bg-amber-300'
    };
    
    return (
        <div className={`bg-white p-6 rounded-xl shadow-md border ${borderColors[color]}`}>
            <h3 className="text-xl font-bold text-slate-800 font-display">{title}</h3>
            <div className="text-sm text-slate-500 mt-2 mb-4 min-h-[40px]">{description}</div>
            <button onClick={onButtonClick} disabled={isLoading} className={`w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${buttonColors[color]}`}>
                {isLoading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : icon}
                {isLoading ? 'En cours...' : buttonText}
            </button>
        </div>
    );
};

const BackupManager: React.FC = () => {
    const { addNotification } = useNotification();
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState<BackupType | null>(null);
    const [modalInfo, setModalInfo] = useState<ModalInfo | null>(null);

    const handleBackupRequest = (type: BackupType) => {
        const infoMap: Record<BackupType, ModalInfo> = {
            sql: {
                type: 'sql',
                title: 'Confirmation de Sauvegarde SQL',
                message: "Vous allez générer une sauvegarde de la structure et des données de la base de données au format SQL.",
                color: 'blue',
                confirmText: 'Confirmer et Télécharger'
            },
            files: {
                type: 'files',
                title: 'Confirmation de Sauvegarde Fichiers',
                message: "Vous allez générer une archive .zip contenant uniquement les fichiers téléversés (images, documents, etc.).",
                color: 'green',
                confirmText: 'Confirmer et Télécharger'
            },
            full: {
                type: 'full',
                title: 'Confirmation de Sauvegarde Complète',
                message: "Vous allez générer une archive .zip contenant la base de données AINSI que tous les fichiers téléversés.",
                color: 'orange',
                confirmText: 'Confirmer et Télécharger'
            }
        };
        setModalInfo(infoMap[type]);
    };

    const handleConfirmBackup = async () => {
        if (!modalInfo) return;

        const { type } = modalInfo;
        setIsLoading(type);
        setModalInfo(null);
        addNotification({ type: 'info', message: 'La création de la sauvegarde a commencé. Le téléchargement démarrera bientôt...' });

        try {
            const response = await fetch(`/api/superadmin/backups/${type}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `La création de la sauvegarde a échoué (statut ${response.status})` }));
                throw new Error(errorData.message);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;

            const disposition = response.headers.get('content-disposition');
            let filename = `backup.${type === 'sql' ? 'sql' : 'zip'}`;
            if (disposition?.includes('attachment')) {
                const filenameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                if (filenameMatch?.[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            a.remove();

            addNotification({ type: 'success', message: 'Sauvegarde téléchargée avec succès.' });
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(null);
        }
    };
    
    return (
        <div className="space-y-6">
             <h2 className="text-xl font-semibold text-slate-700 font-display">Sauvegarde de la Plateforme</h2>
            <BackupCard 
                title="Sauvegarde de la Base de Données (SQL)"
                description={<>Générez et téléchargez une sauvegarde de la structure et des données de la base de données au format SQL. Ceci n'inclut pas les fichiers uploadés (images, documents).</>}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" /><path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" /><path d="M10 2C6.134 2 3 3.343 3 5v3c0-1.657 3.134-3 7-3s7 1.343 7 3V5c0-1.657-3.134-3-7-3z" /></svg>}
                buttonText="Télécharger la Sauvegarde SQL"
                onButtonClick={() => handleBackupRequest('sql')}
                isLoading={isLoading === 'sql'}
                color="blue"
            />
            <BackupCard 
                title="Sauvegarde des Fichiers Uniquement (.zip)"
                description={<>Générez et téléchargez une archive <strong>.zip</strong> contenant uniquement les fichiers téléversés (images, documents, etc.) du dossier <strong>/uploads</strong>. Utile pour des sauvegardes légères et ciblées des médias.</>}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>}
                buttonText="Télécharger la Sauvegarde des Fichiers (.zip)"
                onButtonClick={() => handleBackupRequest('files')}
                isLoading={isLoading === 'files'}
                color="green"
            />
             <BackupCard 
                title="Sauvegarde Complète (Base de données + Fichiers)"
                description={<>Générez et téléchargez une archive <strong>.zip</strong> contenant une sauvegarde de la base de données AINSI que tous les fichiers du dossier <strong>/uploads</strong>. C'est la méthode recommandée pour une sauvegarde complète.</>}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM7.707 9.293a1 1 0 00-1.414 1.414L8.586 13l-2.293 2.293a1 1 0 101.414 1.414L10 14.414l2.293 2.293a1 1 0 001.414-1.414L11.414 13l2.293-2.293a1 1 0 00-1.414-1.414L10 11.586 7.707 9.293z" clipRule="evenodd" /></svg>}
                buttonText="Télécharger la Sauvegarde Complète (.zip)"
                onButtonClick={() => handleBackupRequest('full')}
                isLoading={isLoading === 'full'}
                color="orange"
            />

            <BackupConfirmationModal
                isOpen={!!modalInfo}
                onClose={() => setModalInfo(null)}
                onConfirm={handleConfirmBackup}
                modalInfo={modalInfo}
            />
        </div>
    );
};

const RestoreManager: React.FC = () => {
    const { addNotification } = useNotification();
    const { token } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [stagedInfo, setStagedInfo] = useState<{ fileName: string, command: string } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleStageBackup = async () => {
        if (!file) {
            addNotification({ type: 'warning', message: 'Veuillez sélectionner un fichier de sauvegarde.' });
            return;
        }
        setIsLoading(true);
        setStagedInfo(null);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64File = (reader.result as string).split(',')[1];
            try {
                const data = await apiFetch('/superadmin/restore/stage-backup', {
                    method: 'POST',
                    body: JSON.stringify({ fileName: file.name, fileContent: base64File }),
                });
                setStagedInfo({ fileName: file.name, command: data.command });
                addNotification({ type: 'success', message: 'Fichier préparé sur le serveur. Suivez les instructions.' });
            } catch (error) {
                if (error instanceof Error) addNotification({ type: 'error', message: error.message });
            } finally {
                setIsLoading(false);
            }
        };
    };

    const copyCommand = () => {
        if (stagedInfo) {
            navigator.clipboard.writeText(stagedInfo.command);
            addNotification({ type: 'info', message: 'Commande copiée dans le presse-papiers.' });
        }
    };
    
    return (
        <div className="border-t-2 border-red-300 pt-6 mt-8">
            <h2 className="text-xl font-semibold text-red-700 font-display">Restauration des Données (Action Destructive)</h2>
            <p className="text-sm text-slate-600 mt-2 mb-4">Cette action écrasera les données actuelles. Elle doit être effectuée manuellement sur le serveur pour des raisons de sécurité. La limite de téléversement est de 10Mo.</p>

            <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">1. Préparer le fichier de sauvegarde</label>
                    <input type="file" onChange={handleFileChange} className="w-full text-sm" accept=".sql,.dump,.zip" />
                </div>
                <div>
                    <button onClick={handleStageBackup} disabled={isLoading || !file} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 disabled:bg-slate-400">
                        {isLoading ? 'Préparation...' : 'Préparer le Fichier sur le Serveur'}
                    </button>
                </div>
            </div>

            {stagedInfo && (
                <div className="mt-6 p-4 border-2 border-green-300 bg-green-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-800 font-display mb-2">2. Exécuter la Restauration</h3>
                    <p className="text-sm text-slate-700 mb-2">Connectez-vous au terminal de votre serveur et exécutez la commande suivante :</p>
                    <div className="bg-slate-800 text-white font-mono text-sm p-3 rounded-md flex justify-between items-center">
                        <code>{stagedInfo.command}</code>
                        <button onClick={copyCommand} className="p-2 text-slate-300 hover:bg-slate-600 rounded-md">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2-2H9a2 2 0 01-2-2V9z" /><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H4z" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const DatabaseManager: React.FC<{ canRestore: boolean }> = ({ canRestore }) => {
    return (
        <div className="space-y-8">
            <BackupManager />
            {canRestore && <RestoreManager />}
        </div>
    );
};

export default DatabaseManager;