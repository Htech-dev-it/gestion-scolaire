import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import type { Role } from '../types';
import Tooltip from './Tooltip';

const PermissionsInfoModal: React.FC<{ role: Role; onClose: () => void }> = ({ role, onClose }) => {
  const renderPermissions = () => {
    if (!role.permissions || role.permissions.length === 0) {
      return <p className="text-sm text-slate-500">Aucune permission spécifique.</p>;
    }
    const permsByCategory = role.permissions.reduce((acc, p) => {
      const category = p.category.replace('_', ' ');
      if (!acc[category]) acc[category] = [];
      acc[category].push(p.description);
      return acc;
    }, {} as Record<string, string[]>);
    
    return (
      <div className="text-left space-y-4">
        {Object.entries(permsByCategory).map(([category, descriptions]) => (
          <div key={category}>
            <h4 className="font-semibold capitalize text-slate-800">{category}</h4>
            <ul className="list-disc list-inside text-slate-600 mt-1 space-y-1 text-sm">
              {descriptions.map((desc, i) => <li key={i}>{desc}</li>)}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 my-8 h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex-shrink-0 flex justify-between items-start mb-4 border-b pb-4">
            <h2 className="text-2xl font-bold font-display text-slate-800">Permissions pour: {role.name}</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        <div className="flex-grow overflow-y-auto pr-2">
            {renderPermissions()}
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
    'Gestionnaire des Professeurs',
    'Gestionnaire d\'Emploi du Temps',
    'Gestionnaire du Portail Élève',
]);


const AddUserForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const { addNotification } = useNotification();
  const navigate = ReactRouterDOM.useNavigate();
  const [viewingRole, setViewingRole] = useState<Role | null>(null);

  useEffect(() => {
    apiFetch('/roles')
      .then(setRoles)
      .catch(err => addNotification({ type: 'error', message: err.message }));
  }, [addNotification]);


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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await apiFetch('/register', {
        method: 'POST',
        body: JSON.stringify({ 
          username, 
          password,
          roleIds: Array.from(selectedRoleIds) 
        }),
      });
      
      addNotification({ type: 'success', message: data.message });
      setUsername('');
      setPassword('');
      setSelectedRoleIds(new Set());
      navigate('/admin/users');

    } catch (err) {
      if (err instanceof Error) {
        addNotification({ type: 'error', message: err.message });
      }
    } finally {
        setIsLoading(false);
    }
  };
  
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


  return (
    <>
      <div className="max-w-xl mx-auto mt-10 p-4">
        <ReactRouterDOM.Link to="/admin/users" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Retour à la liste
        </ReactRouterDOM.Link>
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 font-display">Ajouter un nouvel utilisateur</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom d'utilisateur</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <fieldset>
                <legend className="block text-sm font-medium text-slate-700 mb-2">Assigner des Rôles</legend>
                <div className="space-y-2 p-3 bg-slate-50 border rounded-md">
                    {roles.map(role => {
                        const isThisPrincipalAdminRole = role.name === PRINCIPAL_ADMIN_ROLE;
                        const isThisDirectorRole = role.name === DIRECTOR_ROLE;
                        const isThisSecretaryRole = role.name === SECRETARY_ROLE;
                        const isThisInferiorRole = INFERIOR_ROLES.has(role.name);
                        
                        let isDisabled = false;
                        let disabledReason = '';

                        if (isPrincipalAdminSelected && !isThisPrincipalAdminRole) {
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

                        const roleRow = (
                            <div className="flex items-center justify-between">
                                <label className={`flex items-center space-x-2 ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        checked={selectedRoleIds.has(role.id)}
                                        onChange={() => handleToggleRole(role.id)}
                                        className="h-4 w-4 rounded"
                                        disabled={isDisabled}
                                    />
                                    <span>{role.name}</span>
                                </label>
                                <button
                                type="button"
                                onClick={() => setViewingRole(role)}
                                className="p-1 text-slate-400 hover:bg-slate-200 rounded-full"
                                aria-label={`Voir les permissions pour ${role.name}`}
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                </button>
                            </div>
                        );
                        
                        if (isDisabled) {
                            return (
                                <Tooltip key={role.id} text={disabledReason}>
                                    <div>{roleRow}</div>
                                </Tooltip>
                            );
                        }
                        
                        return <div key={role.id}>{roleRow}</div>;
                    })}
                </div>
            </fieldset>
            
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
              >
                {isLoading ? 'Ajout en cours...' : 'Ajouter l\'utilisateur'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {viewingRole && <PermissionsInfoModal role={viewingRole} onClose={() => setViewingRole(null)} />}
    </>
  );
};

export default AddUserForm;