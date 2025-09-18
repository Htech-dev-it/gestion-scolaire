import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import * as db from '../utils/db';
import type { PlatformSettings, Message } from '../types';
import ConfirmationModal from './ConfirmationModal';

const AdminContactPage: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const cacheKey = '/admin/messages';

    const fetchData = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setIsLoading(true);
        try {
            const [settingsData, messagesData] = await Promise.all([
                apiFetch('/contact-info'),
                apiFetch(cacheKey)
            ]);
            setSettings(settingsData);
            setMessages(messagesData);
        } catch (error) {
            if (error instanceof Error && isInitialLoad) {
                 addNotification({ type: 'error', message: error.message });
            } else if (error instanceof Error) {
                console.error("Failed to poll messages:", error.message);
            }
        } finally {
            if (isInitialLoad) setIsLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        fetchData(true);
        const intervalId = setInterval(() => fetchData(false), 5000); // Poll every 5 seconds
        return () => clearInterval(intervalId);
    }, [fetchData]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const optimisticMessage: Message = {
            id: Date.now(),
            instance_id: user!.instance_id!,
            sender_id: user!.id,
            sender_role: 'admin',
            content: newMessage,
            created_at: new Date().toISOString(),
            is_read_by_superadmin: false,
        };
        
        const updatedMessages = [...messages, optimisticMessage];
        setMessages(updatedMessages);
        setNewMessage('');

        try {
            const result = await apiFetch('/admin/messages', {
                method: 'POST',
                body: JSON.stringify({ content: newMessage }),
            });

            if (result?.queued) {
                await db.saveData(cacheKey, updatedMessages);
            } else {
                const sentMessage = result;
                setMessages(prev => prev.map(msg => msg.id === optimisticMessage.id ? sentMessage : msg));
            }

        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        }
    };
    
    const handleConfirmDelete = async () => {
        if (!messageToDelete) return;
        try {
            const result = await apiFetch(`/messages/${messageToDelete.id}`, { method: 'DELETE' });

            const updatedMessages = messages.filter(m => m.id !== messageToDelete.id);
            setMessages(updatedMessages);

            if (result?.queued) {
                 await db.saveData(cacheKey, updatedMessages);
            }

            addNotification({ type: 'success', message: 'Message supprimé.' });

        } catch(error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setMessageToDelete(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    };

    return (
        <>
            <div className="p-4 md:p-8 max-w-5xl mx-auto">
                <header className="mb-8">
                    <ReactRouterDOM.Link to="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                        Retour à l'administration
                    </ReactRouterDOM.Link>
                    <h1 className="text-4xl font-bold text-gray-800 font-display">Contact & Support</h1>
                    <p className="text-lg text-slate-500 mt-2">Communiquez avec le support de la plateforme.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-semibold text-slate-700 font-display mb-4">Informations de Contact</h2>
                            {isLoading ? <p>Chargement...</p> : (
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                                        <a href={`mailto:${settings?.contact_email}`} className="text-blue-600 hover:underline">{settings?.contact_email || 'Non défini'}</a>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                                        <a href={`tel:${settings?.contact_phone}`} className="text-blue-600 hover:underline">{settings?.contact_phone || 'Non défini'}</a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-md flex flex-col h-[70vh]">
                        <h2 className="text-xl font-semibold text-slate-700 font-display mb-4 flex-shrink-0">Messagerie</h2>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-4 mb-4">
                            {messages.map(msg => (
                                <div key={msg.id} className={`group relative flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.sender_role === 'admin' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-800'}`}>
                                        <p className="text-sm">{msg.content}</p>
                                        <p className={`text-xs mt-1 ${msg.sender_role === 'admin' ? 'text-blue-200' : 'text-slate-500'}`}>{formatDate(msg.created_at)}</p>
                                    </div>
                                    {msg.sender_role === 'admin' && (
                                        <button 
                                            onClick={() => setMessageToDelete(msg)} 
                                            className="absolute top-1/2 -translate-y-1/2 p-1 bg-white/80 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity -left-8" 
                                            title="Supprimer"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={handleSendMessage} className="flex-shrink-0 flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Écrivez votre message..."
                                className="w-full p-2 border rounded-md"
                            />
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Envoyer</button>
                        </form>
                    </div>
                </div>
            </div>
             <ConfirmationModal 
                isOpen={!!messageToDelete}
                onClose={() => setMessageToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Supprimer le message"
                message="Êtes-vous sûr de vouloir supprimer ce message ?"
            />
        </>
    );
};

export default AdminContactPage;
