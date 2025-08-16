import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import type { Role, Permission } from '../types';
import ConfirmationModal from './ConfirmationModal';

const ROLE_TEMPLATES = [
    {
        name: 'Administrateur Principal',
        description: 'Accès total à toutes les fonctionnalités, y compris l\'onglet Administration. Destiné au directeur ou responsable technique.',
        permissionKeys: ['student:read', 'student:create', 'student:update', 'student:delete', 'student:archive', 'enrollment:create', 'enrollment:update_class', 'enrollment:update_payment', 'report:financial', 'report:attendance', 'report_card:generate', 'grade:read', 'grade:create', 'appreciation:create', 'student_portal:manage_access', 'student_portal:manage_accounts', 'settings:manage_academic', 'settings:manage_teachers', 'settings:manage_timetable', 'user:manage', 'role:manage']
    },
    {
        name: 'Directeur des Opérations',
        description: 'Peut tout gérer (élèves, paiements, bulletins) mais n\'a pas accès à l\'onglet Administration. Idéal pour un directeur pédagogique.',
        permissionKeys: ['student:read', 'student:create', 'student:update', 'student:delete', 'student:archive', 'enrollment:create', 'enrollment:update_class', 'enrollment:update_payment', 'report:financial', 'report:attendance', 'report_card:generate', 'grade:read', 'grade:create', 'appreciation:create', 'student_portal:manage_access', 'student_portal:manage_accounts', 'settings:manage_teachers']
    },
    {
        name: 'Secrétaire Pédagogique',
        description: 'Rôle puissant pour la gestion quotidienne. Accès identique au Directeur des Opérations, sans accès à l\'onglet Administration.',
        permissionKeys: ['student:read', 'student:create', 'student:update', 'student:delete', 'student:archive', 'enrollment:create', 'enrollment:update_class', 'enrollment:update_payment', 'report:financial', 'report:attendance', 'report_card:generate', 'grade:read', 'grade:create', 'appreciation:create', 'student_portal:manage_access', 'student_portal:manage_accounts', 'settings:manage_teachers']
    },
    {
        name: 'Comptable / Gestionnaire des Paiements',
        description: 'Peut gérer les fiches de paiement, consulter les rapports financiers, et restreindre l\'accès des élèves aux notes en cas de non-paiement.',
        permissionKeys: ['student:read', 'enrollment:update_payment', 'report:financial', 'student_portal:manage_access']
    },
    {
        name: 'Responsable des Bulletins',
        description: 'Peut consulter les élèves, gérer toutes les notes, les appréciations et générer les bulletins. Contrôle aussi l\'accès des élèves à leurs notes.',
        permissionKeys: ['student:read', 'grade:read', 'grade:create', 'appreciation:create', 'report_card:generate', 'student_portal:manage_access']
    },
    {
        name: 'Responsable Vie Scolaire',
        description: 'Rôle focalisé sur le suivi de l\'assiduité des élèves. Peut consulter les élèves et les rapports de présence.',
        permissionKeys: ['student:read', 'report:attendance']
    },
    {
        name: 'Gestionnaire des Professeurs',
        description: 'Gère les profils, comptes et assignations des professeurs. N\'a pas accès aux autres paramètres administratifs.',
        permissionKeys: ['settings:manage_teachers']
    },
    {
        name: 'Gestionnaire d\'Emploi du Temps',
        description: 'Accès dédié uniquement à la construction et à la modification de l\'emploi du temps global de l\'école.',
        permissionKeys: ['settings:manage_timetable']
    },
    {
        name: 'Gestionnaire du Portail Élève',
        description: 'Rôle technique pour la gestion des comptes de connexion des élèves (création, réinitialisation de mot de passe).',
        permissionKeys: ['student:read', 'student_portal:manage_accounts']
    },
];


const RolesManager: React.FC = () => {
    const { addNotification } = useNotification();
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formState, setFormState] = useState<{ name: string; permissionIds: Set<number> }>({ name: '', permissionIds: new Set() });
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [rolesData, permissionsData] = await Promise.all([
                apiFetch('/roles'),
                apiFetch('/permissions')
            ]);
            setRoles(rolesData);
            setPermissions(permissionsData);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEditRequest = (role: Role) => {
        setEditingRole(role);
        setFormState({
            name: role.name,
            permissionIds: new Set(role.permissions?.map(p => p.id) || [])
        });
        setSelectedTemplate('');
    };

    const resetForm = () => {
        setEditingRole(null);
        setFormState({ name: '', permissionIds: new Set() });
        setSelectedTemplate('');
    };

    const handlePermissionToggle = (permissionId: number) => {
        setFormState(prev => {
            const newIds = new Set(prev.permissionIds);
            if (newIds.has(permissionId)) {
                newIds.delete(permissionId);
            } else {
                newIds.add(permissionId);
            }
            return { ...prev, permissionIds: newIds };
        });
    };

    const handleTemplateChange = (templateName: string) => {
        setSelectedTemplate(templateName);
        if (!templateName) {
            resetForm();
            return;
        }

        const template = ROLE_TEMPLATES.find(t => t.name === templateName);
        if (template && permissions.length > 0) {
            const permissionMap = new Map(permissions.map(p => [p.key, p.id]));
            const permissionIds = new Set(
                template.permissionKeys.map(key => permissionMap.get(key)).filter((id): id is number => id !== undefined)
            );
            setFormState({
                name: template.name,
                permissionIds: permissionIds,
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const isEditing = !!editingRole;
        const url = isEditing ? `/roles/${editingRole!.id}` : '/roles';
        const method = isEditing ? 'PUT' : 'POST';
        
        try {
            await apiFetch(url, {
                method,
                body: JSON.stringify({ name: formState.name, permissionIds: Array.from(formState.permissionIds) })
            });
            addNotification({ type: 'success', message: `Rôle ${isEditing ? 'mis à jour' : 'créé'}.` });
            resetForm();
            await fetchData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!roleToDelete) return;
        try {
            await apiFetch(`/roles/${roleToDelete.id}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: 'Rôle supprimé.' });
            setRoleToDelete(null);
            await fetchData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const permissionsByCategory = permissions.reduce((acc, p) => {
        const category = p.category.replace('_', ' ');
        if (!acc[category]) acc[category] = [];
        acc[category].push(p);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <div>
             <h2 className="text-xl font-semibold text-slate-700 font-display">Rôles & Permissions</h2>
             <p className="text-sm text-slate-500 mt-1 mb-4">Créez des rôles personnalisés (ex: Secrétaire, Comptable) et assignez-leur des permissions spécifiques pour un contrôle d'accès granulaire.</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-slate-50 p-4 rounded-lg sticky top-24">
                        <h3 className="text-lg font-semibold mb-4">{editingRole ? `Modifier le rôle "${editingRole.name}"` : 'Créer un nouveau Rôle'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!editingRole && (
                                <div>
                                    <label htmlFor="template-select" className="block text-sm font-medium">Commencer à partir d'un modèle (recommandé)</label>
                                    <select 
                                        id="template-select" 
                                        value={selectedTemplate}
                                        onChange={e => handleTemplateChange(e.target.value)}
                                        className="w-full p-2 border rounded-md mt-1"
                                    >
                                        <option value="">Rôle personnalisé</option>
                                        {ROLE_TEMPLATES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                    </select>
                                    {selectedTemplate && (
                                        <p className="text-xs text-slate-600 mt-2 p-2 bg-blue-100 border-l-4 border-blue-400 rounded-r-md">
                                            {ROLE_TEMPLATES.find(t => t.name === selectedTemplate)?.description}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label htmlFor="role-name" className="block text-sm font-medium">Nom du Rôle</label>
                                <input id="role-name" type="text" value={formState.name} onChange={e => setFormState(s => ({...s, name: e.target.value}))} required className="w-full p-2 border rounded-md mt-1" />
                            </div>
                            <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-2 border-t pt-4">
                                <h4 className="text-sm font-semibold text-slate-600">Permissions détaillées</h4>
                                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                                    <fieldset key={category}>
                                        <legend className="font-semibold text-sm capitalize mb-2">{category}</legend>
                                        <div className="space-y-1">
                                            {perms.map(p => (
                                                <label key={p.id} className="flex items-center space-x-2 text-sm p-1 rounded hover:bg-slate-200 cursor-pointer">
                                                    <input type="checkbox" checked={formState.permissionIds.has(p.id)} onChange={() => handlePermissionToggle(p.id)} className="rounded" />
                                                    <span>{p.description}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                {editingRole && <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-200 rounded-md">Annuler</button>}
                                <button type="submit" disabled={isSubmitting || !formState.name} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-slate-400 disabled:cursor-not-allowed">{isSubmitting ? '...' : (editingRole ? 'Mettre à jour' : 'Créer le Rôle')}</button>
                            </div>
                        </form>
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-4">Rôles Existants</h3>
                    {isLoading ? <p>Chargement...</p> : (
                        <div className="space-y-2">
                            {roles.map(role => (
                                <div key={role.id} className="bg-white p-3 rounded-md shadow-sm flex justify-between items-center">
                                    <span className="font-medium">{role.name}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditRequest(role)} className="px-3 py-1 text-xs text-blue-700 bg-blue-100 rounded-full">Modifier</button>
                                        <button onClick={() => setRoleToDelete(role)} className="px-3 py-1 text-xs text-red-700 bg-red-100 rounded-full">Supprimer</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {roleToDelete && <ConfirmationModal isOpen={!!roleToDelete} onClose={() => setRoleToDelete(null)} onConfirm={handleConfirmDelete} title="Supprimer le Rôle" message={`Êtes-vous sûr de vouloir supprimer le rôle "${roleToDelete.name}" ? Les utilisateurs avec ce rôle perdront les permissions associées.`} />}
        </div>
    );
};

export default RolesManager;