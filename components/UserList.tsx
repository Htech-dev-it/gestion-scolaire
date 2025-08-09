import React, { useEffect, useState, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import ConfirmationModal from './ConfirmationModal';
import { User, UserRole } from '../types';

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
                <h2 className="text-lg font-bold mb-4">Mot de passe réinitialisé</h2>
                <p className="text-sm text-slate-600 mb-4">Veuillez noter ces informations et les transmettre à l'utilisateur. Le mot de passe est temporaire.</p>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-500">Nom d'utilisateur</label>
                        <p className="p-2 bg-slate-100 rounded font-mono">{credentials.username}</p>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500">Nouveau mot de passe</label>
                        <div className="flex items-center gap-2">
                            <p className="flex-grow p-2 bg-slate-100 rounded font-mono">{credentials.tempPassword}</p>
                            <button onClick={copyToClipboard} className="p-2 text-slate-500 hover:bg-slate-200 rounded" title="Copier">
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

const UserList: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { addNotification } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [credentials, setCredentials] = useState<{ username: string, tempPassword: string } | null>(null);


  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiFetch('/users');
      setUsers(data);
    } catch (err) {
      if (err instanceof Error) {
        addNotification({ type: 'error', message: err.message });
      }
    }
  }, [addNotification]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteRequest = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    
    try {
      const data = await apiFetch(`/delete-user/${userToDelete.id}`, { method: 'DELETE' });
      addNotification({ type: 'success', message: data.message });
      await fetchUsers();
    } catch (err) {
      if (err instanceof Error) {
        addNotification({ type: 'error', message: err.message });
      }
    } finally {
      setDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    try {
      const data = await apiFetch(`/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      addNotification({ type: 'success', message: data.message });
      await fetchUsers();
    } catch (error) {
      if (error instanceof Error) addNotification({ type: 'error', message: error.message });
    }
  };

  const handleResetPasswordRequest = (user: User) => {
    setUserToReset(user);
  };

  const handleResetPasswordConfirm = async () => {
      if (!userToReset) return;
      try {
        const data = await apiFetch(`/users/${userToReset.id}/reset-password`, { method: 'PUT' });
        addNotification({ type: 'success', message: `Le mot de passe pour ${userToReset.username} a été réinitialisé.` });
        setCredentials(data);
      } catch (error) {
        if (error instanceof Error) addNotification({ type: 'error', message: error.message });
      } finally {
        setUserToReset(null);
      }
  };


  return (
    <>
      <div className="max-w-3xl mx-auto mt-10 p-4">
         <ReactRouterDOM.Link to="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
             <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
           </svg>
           Retour à l'administration
         </ReactRouterDOM.Link>
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 font-display">Liste des utilisateurs</h2>
            <ReactRouterDOM.Link
              to="/admin/add-user"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Ajouter
            </ReactRouterDOM.Link>
          </div>

          <ul className="divide-y divide-gray-200">
            {users.map((user) => {
              const isImmutable = user.username === 'admin' || user.id === currentUser?.id;
              
              return (
                <li key={user.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <span className="font-medium text-gray-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    {user.username}
                  </span>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {user.role === 'teacher' ? (
                       <span className="px-3 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full">Professeur</span>
                    ) : (
                      <select 
                        value={user.role} 
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        disabled={isImmutable}
                        className={`text-xs font-semibold border rounded-full appearance-none text-center transition-colors
                          ${user.role === 'admin' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}
                          ${isImmutable ? 'cursor-not-allowed opacity-70' : 'hover:border-slate-400'}`
                        }
                      >
                        <option value="standard">Standard</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                    <button
                        onClick={() => handleResetPasswordRequest(user)}
                        disabled={isImmutable}
                        className="p-2 text-yellow-600 hover:bg-yellow-100 text-sm font-medium rounded-full transition-colors disabled:text-slate-400 disabled:bg-transparent disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        aria-label="Réinitialiser le mot de passe"
                        title="Réinitialiser le mot de passe"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L4.22 19.78a1.5 1.5 0 01-2.12-2.12l6.857-6.857A6 6 0 0118 8z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => handleDeleteRequest(user)}
                        disabled={isImmutable}
                        className="p-2 text-red-600 hover:bg-red-100 text-sm font-medium rounded-full transition-colors disabled:text-slate-400 disabled:bg-transparent disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        aria-label="Supprimer l'utilisateur"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                         </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer l'utilisateur '${userToDelete?.username}' ? Cette action est irréversible.`}
      />

      <ConfirmationModal
        isOpen={!!userToReset}
        onClose={() => setUserToReset(null)}
        onConfirm={handleResetPasswordConfirm}
        title="Réinitialiser le mot de passe"
        message={`Êtes-vous sûr de vouloir réinitialiser le mot de passe pour '${userToReset?.username}' ? Un nouveau mot de passe temporaire sera généré.`}
      />
      
      {credentials && <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />}
    </>
  );
};

export default UserList;