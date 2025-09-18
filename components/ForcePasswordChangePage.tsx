import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

const ForcePasswordChangePage: React.FC = () => {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const validatePassword = () => {
        const criteria = [
            /.{11,}/,
            /[a-z]/,
            /[A-Z]/,
            /[0-9]/,
            /[^A-Za-z0-9]/,
        ];
        return criteria.every(regex => regex.test(newPassword));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            addNotification({ type: 'error', message: "Les mots de passe ne correspondent pas." });
            return;
        }

        if (!validatePassword()) {
            addNotification({ type: 'error', message: "Le mot de passe ne respecte pas les critères de sécurité." });
            return;
        }

        setIsLoading(true);

        const endpoint = user?.role === 'student' ? '/student/force-change-password' : '/user/force-change-password';

        try {
            // Note: Unlike the regular change password form, this one does not send the 'currentPassword'
            // The backend endpoint relies on the JWT token to authorize this specific action.
            const response = await apiFetch(endpoint, {
                method: 'PUT',
                body: JSON.stringify({ newPassword })
            });

            if (response && response.accessToken) {
                // The server returns a new token with the updated status
                login(response.accessToken);
                addNotification({ type: 'success', message: "Mot de passe mis à jour avec succès. Vous pouvez maintenant accéder à l'application." });
                
                const redirectTo = user?.role === 'student' ? '/student' : '/dashboard';
                navigate(redirectTo, { replace: true });
            } else {
                throw new Error("La réponse du serveur est invalide.");
            }

        } catch (err) {
            if (err instanceof Error) {
                addNotification({ type: 'error', message: err.message });
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                 <div className="text-center mb-6">
                    <img src="/scolalink_logo.jpg" alt="Logo ScolaLink" className="h-16 mx-auto mb-2 object-contain" />
                    <h1 className="text-3xl font-bold text-slate-800 font-display">ScolaLink</h1>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 font-display text-center">Mise à jour de Sécurité</h2>
                    <p className="text-center text-slate-600 mt-2">Pour votre sécurité, veuillez créer un nouveau mot de passe personnel. Votre mot de passe actuel est temporaire.</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">Nouveau mot de passe</label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
                            />
                        </div>
                         <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">Confirmer le mot de passe</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
                            />
                        </div>

                        <PasswordStrengthIndicator password={newPassword} />

                         <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-3 px-4 text-sm font-bold rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400"
                            >
                                {isLoading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForcePasswordChangePage;
