import React, { useEffect, useState, useCallback, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import * as db from '../utils/db';
import ConfirmationModal from './ConfirmationModal';
import { User, Role } from '../types';
import Tooltip from './Tooltip';

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

const PRINCIPAL_ADMIN_ROLE = 'Administrateur Principal';
const DIRECTOR_ROLE = 'Directeur des Opérations';
const SECRETARY_ROLE = 'Secrétaire Pédagogique';

const INFERIOR_ROLES = new Set([
    'Comptable / Gestionnaire des Paiements',
    'Responsable des Bulletins',
    'Responsable Vie Scolaire',
    'Gestionnaire des Professeurs',
    'Gestionnaire d\'Emploi du Temps',
    'Gestionnaire du Portail Élève',
]);


const ManageRolesModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: User;
    roles: Role[];
    onSave: (userId: number, roleIds: number[]) => void;
}> = ({ isOpen, onClose, user, roles, onSave }) => {
    const { user: currentUser } = useAuth();
    const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (isOpen) {
            setSelectedRoleIds(new Set(user.roles?.map(r => r.id) || []));
        }
    }, [isOpen, user.roles]);

    const isPrincipalAdminSelected = useMemo(() => {
        const principalAdminRole = roles.find(r => r.name === PRINCIPAL_ADMIN_ROLE);
        return principalAdminRole ? selectedRoleIds.has(principalAdminRole.id) : false;
    }, [roles, selectedRoleIds]);

    const isDirectorSelected = useMemo(() => {
        const directorRole = roles.find(r => r.name === DIRECTOR_ROLE);
        return directorRole ? selectedRoleIds.has(directorRole.id) : false;
    }, [roles, selectedRoleIds]);
    
    const isSecretarySelected = useMemo(() => {
        const secretaryRole = roles.find(r => r.name === SECRETARY_ROLE);
        return secretaryRole ? selectedRoleIds.has(secretaryRole.id) : false;
    }, [roles, selectedRoleIds]);

    const handleToggleRole = (roleId: number) => {
        const clickedRole = roles.find(r => r.id === roleId)!;
        
        setSelectedRoleIds(prev => {
            const newSet = new Set(prev);
            const isAdding = !newSet.has(roleId);

            if (isAdding) {
                newSet.add(roleId);

                if (clickedRole.name === PRINCIPAL_ADMIN_ROLE) {
                    return new Set([roleId]);
                }
                
                const directorRole = roles.find(r => r.name === DIRECTOR_ROLE);
                const secretaryRole = roles.find(r => r.name === SECRETARY_ROLE);

                if (clickedRole.name === DIRECTOR_ROLE) {
                    if (secretaryRole) newSet.delete(secretaryRole.id);
                    roles.forEach(r => { if (INFERIOR_ROLES.has(r.name)) newSet.delete(r.id); });
                } else if (clickedRole.name === SECRETARY_ROLE) {
                    if (directorRole) newSet.delete(directorRole.id);
                    roles.forEach(r => { if (INFERIOR_ROLES.has(r.name)) newSet.delete(r.id); });
                }
                
                if (INFERIOR_ROLES.has(clickedRole.name)) {
                    if (directorRole) newSet.delete(directorRole.id);
                    if (secretaryRole) newSet.delete(secretaryRole.id);
                }

            } else {
                newSet.delete(roleId);
            }
            
            return newSet;
        });
    };

    const handleSave = () => {
        onSave(user.id, Array.from(selectedRoleIds));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4">Gérer les Rôles de {user.username}</h2>
                <div className="space-y-2">
                    {roles.map(role => {
                        const isThisPrincipalAdminRole = role.name === PRINCIPAL_ADMIN_ROLE;
                        const isThisDirectorRole = role.name === DIRECTOR_ROLE;
                        const isThisSecretaryRole = role.name === SECRETARY_ROLE;
                        const isThisInferiorRole = INFERIOR_ROLES.has(role.name);
                        
                        let isDisabled = false;
                        let disabledReason = '';

                        if (user.id === currentUser?.id && isThisPrincipalAdminRole) {
                            isDisabled = true;
                            disabledReason = 'Vous ne pouvez pas retirer votre propre rôle d\'Administrateur Principal.';
                        } else if (isPrincipalAdminSelected && !isThisPrincipalAdminRole) {
                            isDisabled = true;
                            disabledReason = 'Le rôle Administrateur Principal inclut déjà cette permission.';
                        } else if (isDirectorSelected && isThisSecretaryRole) {
                            isDisabled = true;
                            disabledReason = 'Les rôles de Directeur et Secrétaire sont mutuellement exclusifs.';
                        } else if (isSecretarySelected && isThisDirectorRole) {
                            isDisabled = true;
                            disabledReason = 'Les rôles de Directeur et Secrétaire sont mutuellement exclusifs.';
                        } else if ((isDirectorSelected || isSecretarySelected) && isThisInferiorRole) {
                            isDisabled = true;
                            disabledReason = 'Un rôle supérieur inclut déjà cette permission.';
                        }

                        const roleLabel = (
                            <label className={`flex items-center space-x-3 p-2 rounded transition-colors ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-slate-100'}`}>
                                <input
                                    type="checkbox"
                                    checked={selectedRoleIds.has(role.id)}
                                    onChange={() => handleToggleRole(role.id)}
                                    className="h-4 w-4 rounded"
                                    disabled={isDisabled}
                                />
                                <span>{role.name}</span>
                            </label>
                        );
                        
                        if (isDisabled) {
                            return (
                                <Tooltip key={role.id} text={disabledReason}>
                                    <div>{roleLabel}</div>
                                </Tooltip>
                            );
                        }
                        
                        return <div key={role.id}>{roleLabel}</div>;
                    })}
                </div>
                 <div className="mt-4 pt-4 border-t text-xs text-slate-500 space-y-1">
                    {isPrincipalAdminSelected && <p className="p-2 bg-blue-50 text-blue-700 rounded-md">Le rôle "Administrateur Principal" a accès à toutes les fonctionnalités de l'instance.</p>}
                    {isDirectorSelected && <p className="p-2 bg-yellow-50 text-yellow-700 rounded-md">Le rôle "Directeur des Opérations" inclut la gestion des élèves, finances, et bulletins.</p>}
                    {isSecretarySelected && <p className="p-2 bg-yellow-50 text-yellow-700 rounded-md">Le rôle "Secrétaire Pédagogique" inclut la gestion des élèves, finances, et bulletins.</p>}
                </div>
                <div className="flex justify-end space-x-3 pt-4 mt-2">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-md">Annuler</button>
                    <button onClick={handleSave} className="px-4 py-2 text-white bg-blue-600 rounded-md">Sauvegarder</button>
                </div>
            </div>
        </div>
    );
};

const UserList: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { addNotification } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [userToManageRoles, setUserToManageRoles] = useState<User | null>(null);
  const [credentials, setCredentials] = useState<{ username: string, tempPassword: string } | null>(null);
  const cacheKey = '/users';

  const fetchData = useCallback(async () => {
    try {
      const [usersData, rolesData] = await Promise.all([
        apiFetch(cacheKey),
        apiFetch('/roles')
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      if (err instanceof Error) {
        addNotification({ type: 'error', message: err.message });
      }
    }
  }, [addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      const result = await apiFetch(`/delete-user/${userToDelete.id}`, { method: 'DELETE' });
      if (result?.queued) {
          const updatedUsers = users.filter(u => u.id !== userToDelete.id);
          setUsers(updatedUsers);
          await db.saveData(cacheKey, updatedUsers);
          addNotification({ type: 'info', message: 'Suppression en attente de synchronisation.' });
      } else {
          addNotification({ type: 'success', message: 'Utilisateur supprimé.' });
          await fetchData();
      }
    } catch (err) {
      if (err instanceof Error) addNotification({ type: 'error', message: err.message });
    } finally {
      setUserToDelete(null);
    }
  };

  const handleResetPasswordConfirm = async () => {
    if (!userToReset) return;
    try {
      const data = await apiFetch(`/users/${userToReset.id}/reset-password`, { method: 'PUT' });
      if (data?.queued) {
           addNotification({ type: 'info', message: 'Réinitialisation en attente de synchronisation.' });
      } else {
        addNotification({ type: 'success', message: `Mot de passe pour ${userToReset.username} réinitialisé.` });
        setCredentials(data);
      }
    } catch (error) {
      if (error instanceof Error) addNotification({ type: 'error', message: error.message });
    } finally {
      setUserToReset(null);
    }
  };

  const handleSaveRoles = async (userId: number, roleIds: number[]) => {
      try {
          const result = await apiFetch(`/users/${userId}/roles`, {
              method: 'PUT',
              body: JSON.stringify({ roleIds }),
          });
          if (result?.queued) {
                const updatedUsers = users.map(u => {
                    if (u.id === userId) {
                        return { ...u, roles: roles.filter(r => roleIds.includes(r.id)) };
                    }
                    return u;
                });
                setUsers(updatedUsers);
                await db.saveData(cacheKey, updatedUsers);
                addNotification({ type: 'info', message: 'Mise à jour des rôles en attente de synchronisation.'});
          } else {
              addNotification({ type: 'success', message: 'Rôles mis à jour.'});
              await fetchData();
          }
          setUserToManageRoles(null);
      } catch (error) {
          if (error instanceof Error) addNotification({ type: 'error', message: error.message });
      }
  };

  return (
    <>
      <div className="max-w-3xl mx-auto mt-10 p-4">
         <ReactRouterDOM.Link to="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
           Retour à l'administration
         </ReactRouterDOM.Link>
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 font-display">Liste des utilisateurs</h2>
            <ReactRouterDOM.Link to="/admin/add-user" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Ajouter un utilisateur</ReactRouterDOM.Link>
          </div>
          <ul className="divide-y divide-gray-200">
            {users.map((user) => {
              const isImmutable = user.username === 'admin' || user.id === currentUser?.id;
              return (
                <li key={user.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="font-medium text-gray-800">{user.username}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.role === 'admin' && <span className="px-2 py-0.5 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Admin</span>}
                      {user.role === 'teacher' && <span className="px-2 py-0.5 text-xs font-semibold text-purple-800 bg-purple-100 rounded-full">Professeur</span>}
                      {user.roles?.map(role => <span key={role.id} className="px-2 py-0.5 text-xs font-semibold text-slate-700 bg-slate-200 rounded-full">{role.name}</span>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {user.role === 'standard' && (
                        <button onClick={() => setUserToManageRoles(user)} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-full hover:bg-indigo-200">Gérer les Rôles</button>
                    )}
                    <button onClick={() => setUserToReset(user)} disabled={isImmutable} className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed" title="Réinitialiser le mot de passe"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => setUserToDelete(user)} disabled={isImmutable} className="p-2 text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed" title="Supprimer"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <ConfirmationModal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} onConfirm={handleDeleteConfirm} title="Confirmer la suppression" message={`Êtes-vous sûr de vouloir supprimer l'utilisateur '${userToDelete?.username}' ?`} />
      <ConfirmationModal isOpen={!!userToReset} onClose={() => setUserToReset(null)} onConfirm={handleResetPasswordConfirm} title="Réinitialiser le mot de passe" message={`Un nouveau mot de passe temporaire sera généré pour '${userToReset?.username}'.`} />
      {credentials && <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />}
      {userToManageRoles && <ManageRolesModal isOpen={!!userToManageRoles} onClose={() => setUserToManageRoles(null)} user={userToManageRoles} roles={roles} onSave={handleSaveRoles} />}
    </>
  );
};

export default UserList;