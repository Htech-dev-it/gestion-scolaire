import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiFetch } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import type { Instance, User, DashboardStats, Announcement, PlatformSettings, Message, MessageSummary } from '../types';
import { useAuth } from '../auth/AuthContext';
import ConfirmationModal from './ConfirmationModal';
import AuditLogViewer from './AuditLogViewer';
import SuperAdminManager from './SuperAdminManager';
import ChangePasswordForm from './ChangePasswordForm';

// --- TYPE DEFINITIONS ---
interface InstanceWithAdmins extends Instance {
    admins: User[];
}

type BackupType = 'sql' | 'files' | 'full';
type BackupColor = 'blue' | 'green' | 'orange';
type SuperAdminTab = 'instances' | 'announcements' | 'support' | 'backup' | 'journal' | 'superadmins' | 'security';

interface ModalInfo {
    type: BackupType;
    title: string;
    message: string;
    color: BackupColor;
    confirmText: string;
}

// --- MODAL COMPONENTS ---

const PasswordConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (password: string) => Promise<void>;
    instanceName: string;
}> = ({ isOpen, onClose, onConfirm, instanceName }) => {
    const [password, setPassword] = useState('');
    useEffect(() => { if (!isOpen) setPassword(''); }, [isOpen]);
    if (!isOpen) return null;
    const handleConfirm = () => { onConfirm(password); };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-2">Confirmer la Suppression</h2>
                <p className="text-sm text-slate-600 mb-4">Pour supprimer l'instance <strong className="font-semibold">{instanceName}</strong>, veuillez entrer votre mot de passe de Super Administrateur.</p>
                <div>
                    <label htmlFor="delete_password" className="block text-sm font-medium text-slate-700">Mot de passe</label>
                    <input type="password" id="delete_password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full p-2 border rounded-md" autoFocus />
                </div>
                <div className="flex justify-end space-x-3 pt-6 mt-2 border-t">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-md">Annuler</button>
                    <button onClick={handleConfirm} disabled={!password} className="px-4 py-2 text-white bg-red-600 rounded-md disabled:bg-red-300">Confirmer la Suppression</button>
                </div>
            </div>
        </div>
    );
};

const ScheduleModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (date: string | null) => Promise<void>;
    instance: Instance | null;
}> = ({ isOpen, onClose, onSave, instance }) => {
    const [selectedDate, setSelectedDate] = useState('');

    useEffect(() => {
        if (instance?.expires_at) {
            setSelectedDate(new Date(instance.expires_at).toISOString().slice(0, 16));
        } else {
            setSelectedDate('');
        }
    }, [instance]);

    if (!isOpen || !instance) return null;

    const handleSave = () => {
        onSave(selectedDate ? new Date(selectedDate).toISOString() : null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-2">Planifier la Suspension</h2>
                <p className="text-sm text-slate-600 mb-4">Pour {instance.name}</p>
                <div>
                    <label htmlFor="expires_at" className="block text-sm font-medium text-slate-700">Date et heure d'expiration</label>
                    <input type="datetime-local" id="expires_at" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                     <p className="text-xs text-slate-500 mt-1">Laissez vide pour annuler la suspension planifiée.</p>
                </div>
                <div className="flex justify-end space-x-3 pt-6 mt-2 border-t">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-md">Annuler</button>
                    <button onClick={handleSave} className="px-4 py-2 text-white bg-blue-600 rounded-md">Sauvegarder</button>
                </div>
            </div>
        </div>
    );
};

const DeleteInstanceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    instance: Instance | null;
}> = ({ isOpen, onClose, onConfirm, instance }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const confirmationPhrase = 'SUPPRIMER DÉFINITIVEMENT';
    const isConfirmed = confirmationText === confirmationPhrase;

    const handleCloseAndReset = () => { setConfirmationText(''); onClose(); };
    useEffect(() => { if (!isOpen) setConfirmationText(''); }, [isOpen]);

    if (!isOpen || !instance) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={handleCloseAndReset}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div className="mt-0 ml-4 text-left">
                        <h2 className="text-lg font-bold">Supprimer l'instance {instance.name} ?</h2>
                        <p className="text-sm text-slate-600 my-2">Cette action est **irréversible**. Toutes les données associées (élèves, notes, professeurs, paiements, fichiers) seront définitivement effacées.</p>
                        <p className="text-sm font-medium">Pour confirmer, veuillez taper : <strong className="font-mono text-red-700">{confirmationPhrase}</strong></p>
                        <input type="text" value={confirmationText} onChange={e => setConfirmationText(e.target.value)} className="w-full p-2 border rounded-md mt-2" />
                    </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4 mt-4 bg-slate-50 -mx-6 -mb-6 px-6 py-3 rounded-b-lg">
                    <button onClick={handleCloseAndReset} className="px-4 py-2 bg-slate-200 rounded-md">Annuler</button>
                    <button onClick={onConfirm} disabled={!isConfirmed} className="px-4 py-2 text-white bg-red-600 rounded-md disabled:bg-red-300 disabled:cursor-not-allowed">Je comprends, supprimer</button>
                </div>
            </div>
        </div>
    );
};

const BackupConfirmationModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; modalInfo: ModalInfo | null; }> = ({ isOpen, onClose, onConfirm, modalInfo }) => {
    if (!isOpen || !modalInfo) return null;
    const colorClasses: Record<BackupColor, string> = { 'blue': 'bg-blue-600 hover:bg-blue-700', 'green': 'bg-green-600 hover:bg-green-700', 'orange': 'bg-orange-500 hover:bg-orange-600' };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold font-display text-gray-800">{modalInfo.title}</h2><button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                <p className="text-sm text-slate-600 mb-2">{modalInfo.message}</p>
                <p className="text-sm font-semibold text-slate-700">Cette opération peut prendre quelques instants.</p>
                <div className="flex justify-end space-x-3 pt-6 mt-4 border-t"><button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Annuler</button><button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${colorClasses[modalInfo.color] || 'bg-gray-600'}`}>{modalInfo.confirmText}</button></div>
            </div>
        </div>
    );
};

const CredentialsModal: React.FC<{ credentials: { username: string; tempPassword: string }; onClose: () => void; title: string; }> = ({ credentials, onClose, title }) => {
    const { addNotification } = useNotification();
    const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); addNotification({ type: 'info', message: 'Copié !' }); };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
                <h2 className="text-lg font-bold mb-4">{title}</h2>
                <p className="text-sm text-slate-600 mb-4">Veuillez noter ces informations et les transmettre à l'administrateur de l'école.</p>
                <div className="space-y-3">
                    <div><label className="text-xs font-semibold text-slate-500">Nom d'utilisateur Admin</label><div className="flex items-center gap-2"><p className="flex-grow p-2 bg-slate-100 rounded font-mono">{credentials.username}</p><button onClick={() => copyToClipboard(credentials.username)} className="p-2 text-slate-500 hover:bg-slate-200 rounded" title="Copier"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2-2H9a2 2 0 01-2-2V9z" /><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H4z" /></svg></button></div></div>
                    <div><label className="text-xs font-semibold text-slate-500">Mot de passe temporaire</label><div className="flex items-center gap-2"><p className="flex-grow p-2 bg-slate-100 rounded font-mono">{credentials.tempPassword}</p><button onClick={() => copyToClipboard(credentials.tempPassword)} className="p-2 text-slate-500 hover:bg-slate-200 rounded" title="Copier"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2-2H9a2 2 0 01-2-2V9z" /><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H4z" /></svg></button></div></div>
                </div>
                <div className="mt-6 text-right"><button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md">J'ai noté</button></div>
            </div>
        </div>
    );
};

const ChatModal: React.FC<{ isOpen: boolean; onClose: () => void; instance: MessageSummary | null; user: User | null; onChatUpdate: () => void; }> = ({ isOpen, onClose, instance, user, onChatUpdate }) => {
    const { addNotification } = useNotification();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
    const [isClearing, setIsClearing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const canDeleteMessages = user?.role === 'superadmin';

    const fetchMessages = useCallback(async (isInitial = false) => {
        if (instance) {
            try {
                const data = await apiFetch(`/superadmin/messages/${instance.instance_id}`);
                setMessages(data);
                if (isInitial) onChatUpdate();
            } catch (err) {
                console.error("Polling for messages failed:", err);
            }
        }
    }, [instance, onChatUpdate]);

    useEffect(() => {
        if (isOpen && instance) {
            fetchMessages(true);
            const intervalId = setInterval(() => fetchMessages(false), 5000);
            return () => clearInterval(intervalId);
        }
    }, [isOpen, instance, fetchMessages]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    
    if (!isOpen || !instance) return null;

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        const optimisticMessage: Message = { id: Date.now(), instance_id: instance.instance_id, sender_id: user!.id, sender_role: 'superadmin', content: newMessage, created_at: new Date().toISOString(), is_read_by_superadmin: true };
        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
        try {
            const sentMessage = await apiFetch(`/superadmin/messages/${instance.instance_id}`, { method: 'POST', body: JSON.stringify({ content: newMessage }) });
            setMessages(prev => prev.map(msg => msg.id === optimisticMessage.id ? sentMessage : msg));
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        }
    };

    const handleConfirmDelete = async () => {
        if (!messageToDelete) return;
        try {
            await apiFetch(`/messages/${messageToDelete.id}`, { method: 'DELETE' });
            setMessages(prev => prev.filter(m => m.id !== messageToDelete.id));
        } catch (err) {
            if(err instanceof Error) addNotification({ type: 'error', message: err.message });
        } finally {
            setMessageToDelete(null);
        }
    };

    const handleConfirmClear = async () => {
        if (!instance) return;
        try {
            await apiFetch(`/superadmin/messages/${instance.instance_id}/clear`, { method: 'DELETE' });
            setMessages([]);
        } catch (err) {
            if(err instanceof Error) addNotification({ type: 'error', message: err.message });
        } finally {
            setIsClearing(false);
        }
    };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 my-8 h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex-shrink-0 flex justify-between items-start mb-4 border-b pb-4">
                        <h2 className="text-xl font-bold font-display text-slate-800">Conversation avec {instance.instance_name}</h2>
                        <div className="flex items-center gap-2">
                            {canDeleteMessages && <button onClick={() => setIsClearing(true)} className="p-2 text-red-500 hover:bg-red-100 rounded-full" title="Effacer la conversation"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>}
                            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-2 space-y-4 mb-4">{messages.map(msg => (<div key={msg.id} className={`group relative flex ${msg.sender_role === 'superadmin' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.sender_role === 'superadmin' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-800'}`}><p className="text-sm">{msg.content}</p><p className={`text-xs mt-1 ${msg.sender_role === 'superadmin' ? 'text-blue-200' : 'text-slate-500'}`}>{formatDate(msg.created_at)}</p></div>{canDeleteMessages && <button onClick={() => setMessageToDelete(msg)} className="absolute top-1/2 -translate-y-1/2 p-1 bg-white/80 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity -left-8" title="Supprimer"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>}</div>))}<div ref={messagesEndRef} /></div>
                    <form onSubmit={handleSendMessage} className="flex-shrink-0 flex gap-2"><input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Répondre..." className="w-full p-2 border rounded-md" /><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Envoyer</button></form>
                </div>
            </div>
            <ConfirmationModal isOpen={!!messageToDelete} onClose={() => setMessageToDelete(null)} onConfirm={handleConfirmDelete} title="Supprimer le message" message="Êtes-vous sûr de vouloir supprimer ce message ?" />
            <ConfirmationModal isOpen={isClearing} onClose={() => setIsClearing(false)} onConfirm={handleConfirmClear} title="Effacer la conversation" message="Êtes-vous sûr de vouloir supprimer définitivement tous les messages de cette conversation ?" />
        </>
    );
};

// --- VIEW COMPONENTS ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-center gap-4"><div className="bg-blue-100 text-blue-600 p-3 rounded-lg">{icon}</div><div><p className="text-sm text-slate-500">{title}</p><p className="text-2xl font-bold text-slate-800">{value}</p></div></div>
);

const BackupCard: React.FC<{ title: string; description: React.ReactNode; icon: React.ReactNode; buttonText: string; onButtonClick: () => void; isLoading: boolean; color: BackupColor; }> = ({ title, description, icon, buttonText, onButtonClick, isLoading, color }) => {
    const borderColors: Record<BackupColor, string> = { blue: 'border-blue-200', green: 'border-green-200', orange: 'border-orange-200' };
    const buttonColors: Record<BackupColor, string> = { blue: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400', green: 'bg-green-600 hover:bg-green-700 disabled:bg-green-400', orange: 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300' };
    return (
        <div className={`bg-white p-6 rounded-xl shadow-md border-l-4 ${borderColors[color]}`}><h3 className="text-xl font-bold text-slate-800 font-display">{title}</h3><div className="text-sm text-slate-500 mt-2 mb-4 min-h-[40px]">{description}</div><button onClick={onButtonClick} disabled={isLoading} className={`w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${buttonColors[color]}`}>{isLoading ? (<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : icon}{isLoading ? 'En cours...' : buttonText}</button></div>
    );
};

// --- Child Components for Tabs ---

const SupportManager: React.FC<{
    messageSummaries: MessageSummary[];
    onSelectInstance: (instance: MessageSummary) => void;
}> = ({ messageSummaries, onSelectInstance }) => {
    const { addNotification } = useNotification();
    const [settings, setSettings] = useState<PlatformSettings>({ contact_email: '', contact_phone: '' });

    useEffect(() => {
        apiFetch('/superadmin/settings')
            .then(setSettings)
            .catch(err => addNotification({ type: 'error', message: err.message }));
    }, [addNotification]);
    
    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => setSettings(prev => ({...prev, [e.target.name]: e.target.value }));

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiFetch('/superadmin/settings', { method: 'PUT', body: JSON.stringify(settings) });
            addNotification({ type: 'success', message: 'Informations de contact mises à jour.' });
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold text-slate-700 font-display mb-4">Informations de Contact du Support</h2>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                    <div><label className="block text-sm font-medium">Email de contact</label><input type="email" name="contact_email" value={settings.contact_email || ''} onChange={handleSettingsChange} className="w-full p-2 border rounded-md" /></div>
                     <div><label className="block text-sm font-medium">Téléphone de contact</label><input type="tel" name="contact_phone" value={settings.contact_phone || ''} onChange={handleSettingsChange} className="w-full p-2 border rounded-md" /></div>
                    <div className="text-right"><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Sauvegarder les Informations</button></div>
                </form>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold text-slate-700 font-display mb-4">Messages des Instances</h2>
                <div className="space-y-2">{messageSummaries.map(summary => (<button key={summary.instance_id} onClick={() => onSelectInstance(summary)} className="w-full flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-blue-100 transition-colors text-left"><span className="font-semibold text-slate-800">{summary.instance_name}</span>{summary.unread_count > 0 && <span className="flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6">{summary.unread_count}</span>}</button>))}</div>
            </div>
        </div>
    );
};

const PlatformBackupManager: React.FC<{ user: User | null }> = ({ user }) => {
    const { addNotification } = useNotification();
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState<BackupType | null>(null);
    const [modalInfo, setModalInfo] = useState<ModalInfo | null>(null);

    const handleBackupRequest = (type: BackupType) => {
        const infoMap: Record<BackupType, ModalInfo> = {
            sql: { type: 'sql', title: 'Confirmation de Sauvegarde SQL', message: "Vous allez générer une sauvegarde de la structure et des données de la base de données au format SQL.", color: 'blue', confirmText: 'Confirmer et Télécharger' },
            files: { type: 'files', title: 'Confirmation de Sauvegarde Fichiers', message: "Vous allez générer une archive .zip contenant uniquement les fichiers téléversés.", color: 'green', confirmText: 'Confirmer et Télécharger' },
            full: { type: 'full', title: 'Confirmation de Sauvegarde Complète', message: "Vous allez générer une archive .zip contenant la BDD complète ET tous les fichiers.", color: 'orange', confirmText: 'Confirmer et Télécharger' }
        };
        setModalInfo(infoMap[type]);
    };

    const handleConfirmBackup = async () => {
        if (!modalInfo) return;
        const { type } = modalInfo;
        setIsLoading(type);
        setModalInfo(null);
        addNotification({ type: 'info', message: 'La création de la sauvegarde a commencé...' });
        try {
            const response = await fetch(`/api/superadmin/backups/${type}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(await response.json().then(d => d.message || 'La sauvegarde a échoué'));
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            let filename = `backup.${type === 'sql' ? 'sql' : 'zip'}`;
            const disposition = response.headers.get('content-disposition');
            if (disposition?.includes('attachment')) { const filenameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition); if (filenameMatch?.[1]) filename = filenameMatch[1].replace(/['"]/g, ''); }
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            addNotification({ type: 'success', message: 'Sauvegarde téléchargée.' });
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(null);
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
            <h2 className="text-xl font-semibold text-slate-700 font-display">Sauvegarde de la Plateforme</h2>
            <BackupCard title="Sauvegarde de la Base de Données (SQL)" description="Générez une sauvegarde complète (toutes instances) au format SQL." icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" /><path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" /><path d="M10 2C6.134 2 3 3.343 3 5v3c0-1.657 3.134-3 7-3s7 1.343 7 3V5c0-1.657-3.134-3-7-3z" /></svg>} buttonText="Télécharger Sauvegarde SQL" onButtonClick={() => handleBackupRequest('sql')} isLoading={isLoading === 'sql'} color="blue" />
            <BackupCard title="Sauvegarde des Fichiers (.zip)" description={<>Générez une archive <strong>.zip</strong> contenant tous les fichiers téléversés.</>} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>} buttonText="Télécharger Sauvegarde Fichiers" onButtonClick={() => handleBackupRequest('files')} isLoading={isLoading === 'files'} color="green" />
            <BackupCard title="Sauvegarde Complète" description={<>Générez une archive <strong>.zip</strong> contenant la BDD complète ET tous les fichiers.</>} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM7.707 9.293a1 1 0 00-1.414 1.414L8.586 13l-2.293 2.293a1 1 0 101.414 1.414L10 14.414l2.293 2.293a1 1 0 001.414-1.414L11.414 13l2.293-2.293a1 1 0 00-1.414-1.414L10 11.586 7.707 9.293z" clipRule="evenodd" /></svg>} buttonText="Télécharger Sauvegarde Complète" onButtonClick={() => handleBackupRequest('full')} isLoading={isLoading === 'full'} color="orange" />
            <BackupConfirmationModal isOpen={!!modalInfo} onClose={() => setModalInfo(null)} onConfirm={handleConfirmBackup} modalInfo={modalInfo} />
        </div>
    );
};


// --- MAIN PAGE ---

const SuperAdminPage: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [instances, setInstances] = useState<InstanceWithAdmins[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [formState, setFormState] = useState({ name: '', admin_email: '', address: '', phone: '' });
    const [credentials, setCredentials] = useState<{ username: string, tempPassword: string } | null>(null);
    const [modalTitle, setModalTitle] = useState('');
    const [announcementForm, setAnnouncementForm] = useState<{ id: number | null, title: string, content: string, is_active: boolean, instance_id: number | null }>({ id: null, title: '', content: '', is_active: true, instance_id: null });
    const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
    const [instanceToSchedule, setInstanceToSchedule] = useState<InstanceWithAdmins | null>(null);
    const [instanceToDelete, setInstanceToDelete] = useState<InstanceWithAdmins | null>(null);
    const [passwordConfirmInstance, setPasswordConfirmInstance] = useState<InstanceWithAdmins | null>(null);
    const [currentTime, setCurrentTime] = useState(() => new Date());
    const [activeTab, setActiveTab] = useState<SuperAdminTab>('instances');
    const [messageSummaries, setMessageSummaries] = useState<MessageSummary[]>([]);
    const [selectedInstanceForChat, setSelectedInstanceForChat] = useState<MessageSummary | null>(null);
    const [editingInstanceId, setEditingInstanceId] = useState<number | null>(null);
    const [editFormState, setEditFormState] = useState<{ name: string; address: string | null; phone: string | null; email: string | null; }>({ name: '', address: '', phone: '', email: '' });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const [statsData, instancesData, announcementsData, summaryData] = await Promise.all([
                apiFetch('/superadmin/dashboard-stats'),
                apiFetch('/superadmin/instances'),
                apiFetch('/superadmin/announcements'),
                apiFetch('/superadmin/messages/summary')
            ]);
            setStats(statsData);
            setInstances(instancesData);
            setAnnouncements(announcementsData);
            setMessageSummaries(summaryData);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        setIsLoading(true);
        fetchData();
        const intervalId = setInterval(fetchData, 5000); // Poll all data every 5 seconds
        return () => clearInterval(intervalId);
    }, [fetchData]);

    const totalUnreadCount = useMemo(() => 
        messageSummaries.reduce((acc, summary) => acc + summary.unread_count, 0),
    [messageSummaries]);

    const handleCreateInstance = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = await apiFetch('/superadmin/instances', { method: 'POST', body: JSON.stringify(formState) });
            addNotification({ type: 'success', message: `L'instance '${data.instance.name}' a été créée.` });
            setCredentials(data.credentials);
            setModalTitle("Nouvelle Instance Créée");
            setFormState({ name: '', admin_email: '', address: '', phone: '' });
            fetchData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleStartEdit = (instance: InstanceWithAdmins) => {
        setEditingInstanceId(instance.id);
        setEditFormState({
            name: instance.name,
            address: instance.address,
            phone: instance.phone,
            email: instance.email,
        });
    };

    const handleCancelEdit = () => {
        setEditingInstanceId(null);
    };

    const handleUpdateInstanceDetails = async () => {
        if (!editingInstanceId) return;
        try {
            await apiFetch(`/superadmin/instances/${editingInstanceId}/details`, {
                method: 'PUT',
                body: JSON.stringify(editFormState)
            });
            addNotification({ type: 'success', message: 'Informations de l\'instance mises à jour.' });
            setEditingInstanceId(null);
            fetchData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleToggleStatus = async (instance: InstanceWithAdmins, displayStatus: 'active' | 'suspended') => {
        const newStatus = displayStatus === 'active' ? 'suspended' : 'active';
        try {
            await apiFetch(`/superadmin/instances/${instance.id}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
            addNotification({ type: 'success', message: 'Statut mis à jour.' });
            fetchData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleSaveExpiration = async (date: string | null) => {
        if (!instanceToSchedule) return;
        try {
            await apiFetch(`/superadmin/instances/${instanceToSchedule.id}/expires`, { method: 'PUT', body: JSON.stringify({ expires_at: date }) });
            addNotification({ type: 'success', message: "Date d'expiration mise à jour." });
            fetchData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setInstanceToSchedule(null);
        }
    };
    
    const handleDeleteRequest = (instance: InstanceWithAdmins) => setInstanceToDelete(instance);
    const handleConfirmDeleteText = () => { if (instanceToDelete) { setPasswordConfirmInstance(instanceToDelete); setInstanceToDelete(null); } };
    
    const handleConfirmDeleteWithPassword = async (password: string) => {
        if (!passwordConfirmInstance) return;
        try {
            await apiFetch(`/superadmin/instances/${passwordConfirmInstance.id}`, { method: 'DELETE', body: JSON.stringify({ password }) });
            addNotification({ type: 'success', message: `L'instance '${passwordConfirmInstance.name}' a été supprimée.` });
            fetchData();
        } catch (error) {
             if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setPasswordConfirmInstance(null);
        }
    };

    const handleResetPassword = async (userId: number) => {
        try {
            const data = await apiFetch(`/superadmin/users/${userId}/reset-password`, { method: 'PUT' });
            addNotification({ type: 'success', message: `Mot de passe réinitialisé pour ${data.username}.` });
            setCredentials(data);
            setModalTitle("Mot de Passe Réinitialisé");
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleAnnouncementSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isEditing = announcementForm.id !== null;
        const url = isEditing ? `/superadmin/announcements/${announcementForm.id}` : '/superadmin/announcements';
        const method = isEditing ? 'PUT' : 'POST';
        const body = { ...announcementForm, instance_id: announcementForm.instance_id || null };
        try {
            await apiFetch(url, { method, body: JSON.stringify(body) });
            addNotification({ type: 'success', message: `Annonce ${isEditing ? 'mise à jour' : 'créée'}.` });
            setAnnouncementForm({ id: null, title: '', content: '', is_active: true, instance_id: null });
            fetchData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleToggleAnnouncement = async (announcement: Announcement) => {
        try {
            await apiFetch(`/superadmin/announcements/${announcement.id}`, { method: 'PUT', body: JSON.stringify({ ...announcement, is_active: !announcement.is_active, instance_id: announcement.instance_id || null }) });
            addNotification({ type: 'success', message: `Annonce ${!announcement.is_active ? 'activée' : 'désactivée'}.` });
            fetchData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleConfirmDeleteAnnouncement = async () => {
        if (!announcementToDelete) return;
        try {
            await apiFetch(`/superadmin/announcements/${announcementToDelete.id}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: 'Annonce supprimée.' });
            fetchData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setAnnouncementToDelete(null);
        }
    };
    
    const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : null;

    const TabButton: React.FC<{ tabId: SuperAdminTab; children: React.ReactNode }> = ({ tabId, children }) => (
        <button onClick={() => setActiveTab(tabId)} className={`relative px-4 py-2 font-medium text-sm rounded-md transition-colors whitespace-nowrap ${activeTab === tabId ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
            {children}
            {tabId === 'support' && totalUnreadCount > 0 && (
                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                    {totalUnreadCount}
                </span>
            )}
        </button>
    );

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <header className="mb-10"><h1 className="text-4xl font-bold text-gray-800 font-display">Portail Super Admin</h1><p className="text-lg text-slate-500 mt-2">Gestion centrale des instances de l'application.</p></header>
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Instances Totales" value={stats?.totalInstances ?? '...'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} />
                <StatCard title="Instances Actives" value={stats?.activeInstances ?? '...'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <StatCard title="Utilisateurs" value={stats?.totalUsers ?? '...'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-1.78-4.125" /></svg>} />
                <StatCard title="Élèves Actifs" value={stats?.totalStudents ?? '...'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>} />
            </div>

            <div className="mb-6 border-b border-slate-200"><div className="flex items-center space-x-2 p-1 bg-slate-50 rounded-lg flex-wrap gap-1"><TabButton tabId="instances">Instances</TabButton><TabButton tabId="announcements">Annonces</TabButton><TabButton tabId="support">Support</TabButton>{user?.role === 'superadmin' && <TabButton tabId="superadmins">Super Admins</TabButton>}{(user?.role === 'superadmin' || user?.role === 'superadmin_delegate') && <TabButton tabId="security">Sécurité</TabButton>}<TabButton tabId="backup">Sauvegarde</TabButton><TabButton tabId="journal">Journal</TabButton></div></div>
            
            <main>
                {activeTab === 'instances' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md"><h2 className="text-xl font-semibold text-slate-700 font-display mb-4">Gestion des Instances ({instances.length})</h2>{isLoading ? <p>Chargement...</p> : (<div className="space-y-4">{instances.map((instance, index) => { const isExpired = instance.expires_at && currentTime > new Date(instance.expires_at); const displayStatus = isExpired ? 'suspended' : instance.status; return (<React.Fragment key={instance.id}><div className="border rounded-lg p-4 bg-slate-50"><div className="flex justify-between items-start flex-wrap gap-2"><div><h3 className="font-bold text-lg text-blue-800">{instance.name}</h3><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${displayStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{displayStatus === 'active' ? 'Actif' : 'Suspendu'}</span>{instance.expires_at && <p className="text-xs text-slate-500 mt-1">Expire le: {formatDate(instance.expires_at)}</p>}</div><div className="flex items-center gap-4"><div className="flex items-center gap-2"><span className="text-sm">Statut:</span><button onClick={() => handleToggleStatus(instance, displayStatus)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${displayStatus === 'active' ? 'bg-green-600' : 'bg-gray-300'}`}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${displayStatus === 'active' ? 'translate-x-6' : 'translate-x-1'}`} /></button></div><button onClick={() => setInstanceToSchedule(instance)} className="px-2 py-1 text-xs text-blue-800 bg-blue-200 rounded-md hover:bg-blue-300">Planifier</button>{user?.role === 'superadmin' && <button onClick={() => handleDeleteRequest(instance)} className="px-2 py-1 text-xs text-white bg-red-600 rounded-md hover:bg-red-700">Supprimer</button>}</div></div><div className="mt-4 border-t pt-2"><h4 className="text-sm font-semibold text-slate-600">Détails de l'Instance</h4> {editingInstanceId === instance.id ? (<div className="text-sm space-y-2 mt-2"><input value={editFormState.name} onChange={e => setEditFormState(s => ({...s, name: e.target.value}))} placeholder="Nom" className="w-full p-1 border rounded-md" /><input value={editFormState.address || ''} onChange={e => setEditFormState(s => ({...s, address: e.target.value}))} placeholder="Adresse" className="w-full p-1 border rounded-md" /><input value={editFormState.phone || ''} onChange={e => setEditFormState(s => ({...s, phone: e.target.value}))} placeholder="Téléphone" className="w-full p-1 border rounded-md" /><input value={editFormState.email || ''} onChange={e => setEditFormState(s => ({...s, email: e.target.value}))} placeholder="Email" className="w-full p-1 border rounded-md" /><div className="flex justify-end gap-2"><button onClick={handleCancelEdit} className="px-3 py-1 text-xs bg-slate-200 rounded">Annuler</button><button onClick={handleUpdateInstanceDetails} className="px-3 py-1 text-xs bg-blue-600 text-white rounded">Sauvegarder</button></div></div>) : (<div className="text-sm space-y-1 mt-1"><p><strong>Adresse:</strong> {instance.address || 'N/A'}</p><p><strong>Téléphone:</strong> {instance.phone || 'N/A'}</p><p><strong>Email:</strong> {instance.email || 'N/A'}</p><button onClick={() => handleStartEdit(instance)} className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded-md hover:bg-blue-200 mt-1">Modifier</button></div>)}</div><div className="mt-4 border-t pt-2"><h4 className="text-sm font-semibold text-slate-600">Administrateurs</h4>{instance.admins.length > 0 ? (<ul className="text-sm space-y-1 mt-1">{instance.admins.map(admin => (<li key={admin.id} className="flex justify-between items-center"><span>{admin.username}</span><button onClick={() => handleResetPassword(admin.id)} className="px-2 py-1 text-xs text-yellow-800 bg-yellow-200 rounded-md hover:bg-yellow-300">Réinitialiser MDP</button></li>))}</ul>) : <p className="text-sm italic text-slate-500">Aucun admin.</p>}</div></div>{index < instances.length - 1 && <hr className="my-4 border-t-2 border-amber-400" />}</React.Fragment>)})}</div>)}</div>
                        <div className="lg:col-span-1"><div className="bg-white p-6 rounded-xl shadow-md sticky top-24"><h2 className="text-xl font-semibold text-slate-700 font-display mb-4">Créer une Nouvelle Instance</h2><form onSubmit={handleCreateInstance} className="space-y-4"><div><label htmlFor="name" className="block text-sm font-medium text-slate-700">Nom de l'école</label><input id="name" type="text" value={formState.name} onChange={e => setFormState(s => ({...s, name: e.target.value}))} required className="mt-1 w-full p-2 border rounded-md" /></div><div><label htmlFor="admin_email" className="block text-sm font-medium text-slate-700">Email de l'Admin Principal</label><input id="admin_email" type="email" value={formState.admin_email} onChange={e => setFormState(s => ({...s, admin_email: e.target.value}))} required className="mt-1 w-full p-2 border rounded-md" /></div><div><label htmlFor="address" className="block text-sm font-medium text-slate-700">Adresse</label><input id="address" type="text" value={formState.address} onChange={e => setFormState(s => ({...s, address: e.target.value}))} className="mt-1 w-full p-2 border rounded-md" /></div><div><label htmlFor="phone" className="block text-sm font-medium text-slate-700">Téléphone</label><input id="phone" type="tel" value={formState.phone} onChange={e => setFormState(s => ({...s, phone: e.target.value}))} className="mt-1 w-full p-2 border rounded-md" /></div><button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Créer l'Instance</button></form></div></div>
                    </div>
                )}
                {activeTab === 'announcements' && (
                    <div className="bg-white p-6 rounded-xl shadow-md"><h2 className="text-xl font-semibold text-slate-700 font-display mb-4">Gestion des Annonces</h2><form onSubmit={handleAnnouncementSubmit} className="space-y-3 p-4 border rounded-lg bg-slate-50 mb-6"><h3 className="font-semibold">{announcementForm.id ? 'Modifier' : 'Nouvelle'} Annonce</h3><input type="text" placeholder="Titre" value={announcementForm.title} onChange={e => setAnnouncementForm(f => ({...f, title: e.target.value}))} required className="w-full p-2 border rounded-md" /><textarea placeholder="Contenu..." value={announcementForm.content} onChange={e => setAnnouncementForm(f => ({...f, content: e.target.value}))} required className="w-full p-2 border rounded-md" rows={3}></textarea><div><label className="block text-sm font-medium text-slate-700">Cibler une instance (optionnel)</label><select value={announcementForm.instance_id || ''} onChange={e => setAnnouncementForm(f => ({...f, instance_id: e.target.value ? Number(e.target.value) : null}))} className="w-full p-2 border rounded-md bg-white"><option value="">Annonce Globale (toutes les instances)</option>{instances.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div><div className="flex justify-end gap-2">{announcementForm.id && <button type="button" onClick={() => setAnnouncementForm({id: null, title: '', content: '', is_active: true, instance_id: null})} className="px-4 py-2 bg-slate-200 rounded-md">Annuler</button>}<button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{announcementForm.id ? 'Mettre à jour' : 'Publier'}</button></div></form><div className="space-y-2">{announcements.map(announcement => (<div key={announcement.id} className="flex justify-between items-center p-2 border-b"><div><p className={`font-semibold ${announcement.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{announcement.title}</p><p className="text-xs text-slate-500">{new Date(announcement.created_at).toLocaleDateString('fr-FR')}</p><p className="text-xs text-blue-600 font-semibold">Cible: {instances.find(i => i.id === announcement.instance_id)?.name || 'Globale'}</p></div><div className="flex items-center gap-2"><button onClick={() => handleToggleAnnouncement(announcement)} className={`px-2 py-1 text-xs rounded-md ${announcement.is_active ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>{announcement.is_active ? 'Désactiver' : 'Activer'}</button><button onClick={() => setAnnouncementForm({id: announcement.id, title: announcement.title, content: announcement.content, is_active: announcement.is_active, instance_id: announcement.instance_id || null})} className="p-1 text-blue-600 hover:bg-blue-100 rounded-full" title="Modifier"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button><button onClick={() => setAnnouncementToDelete(announcement)} className="p-1 text-red-600 hover:bg-red-100 rounded-full" title="Supprimer"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button></div></div>))}</div></div>
                )}
                 {activeTab === 'support' && <SupportManager messageSummaries={messageSummaries} onSelectInstance={setSelectedInstanceForChat} />}
                 {activeTab === 'superadmins' && user?.role === 'superadmin' && <div className="bg-white p-6 rounded-xl shadow-md"><SuperAdminManager /></div>}
                 {activeTab === 'backup' && <PlatformBackupManager user={user} />}
                 {activeTab === 'journal' && <div className="bg-white p-6 rounded-xl shadow-md"><AuditLogViewer scope="superadmin" canDelete={user?.role === 'superadmin'} /></div>}
                 {activeTab === 'security' && (user?.role === 'superadmin' || user?.role === 'superadmin_delegate') && (
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-semibold text-slate-700 font-display mb-4">Changer mon mot de passe</h2>
                        <ChangePasswordForm />
                    </div>
                 )}
            </main>

            {credentials && <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} title={modalTitle} />}
            <ScheduleModal isOpen={!!instanceToSchedule} onClose={() => setInstanceToSchedule(null)} onSave={handleSaveExpiration} instance={instanceToSchedule} />
            <DeleteInstanceModal isOpen={!!instanceToDelete} onClose={() => setInstanceToDelete(null)} onConfirm={handleConfirmDeleteText} instance={instanceToDelete} />
            <PasswordConfirmationModal isOpen={!!passwordConfirmInstance} onClose={() => setPasswordConfirmInstance(null)} onConfirm={handleConfirmDeleteWithPassword} instanceName={passwordConfirmInstance?.name || ''} />
            <ConfirmationModal isOpen={!!announcementToDelete} onClose={() => setAnnouncementToDelete(null)} onConfirm={handleConfirmDeleteAnnouncement} title="Supprimer l'Annonce" message={`Êtes-vous sûr de vouloir supprimer l'annonce : "${announcementToDelete?.title}" ? Cette action est irréversible.`} />
            <ChatModal isOpen={!!selectedInstanceForChat} onClose={() => setSelectedInstanceForChat(null)} instance={selectedInstanceForChat} user={user} onChatUpdate={fetchData} />
        </div>
    );
};

export default SuperAdminPage;
