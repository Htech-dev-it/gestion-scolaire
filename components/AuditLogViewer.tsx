import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import type { AuditLogEntry, PaginatedAuditLogs, User } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import ConfirmationModal from './ConfirmationModal';

interface AuditLogViewerProps {
    scope: 'admin' | 'superadmin';
    user?: User | null;
}

const formatDetails = (log: AuditLogEntry): React.ReactNode => {
    // If details field exists, it's the primary source of truth.
    if (log.details) {
        let parsedDetails: any;
        // The data from the backend is a JSON string.
        // It could be a JSON string of a string (e.g., '"User logged in."')
        // or a JSON string of an object (e.g., '{"newRole":"admin"}').
        try {
            parsedDetails = JSON.parse(log.details);
        } catch (e) {
            // This shouldn't happen if the backend always stringifies.
            // But as a fallback, we treat the raw value as the detail.
            return <span className="font-medium text-slate-800">{log.details}</span>;
        }

        // If the parsed result is a string, it's our new descriptive format.
        if (typeof parsedDetails === 'string') {
            return <span className="font-medium text-slate-800">{parsedDetails}</span>;
        }
        
        // This handles old logs where 'details' was an object.
        if (parsedDetails && typeof parsedDetails === 'object' && !Array.isArray(parsedDetails)) {
             const parts = Object.entries(parsedDetails).map(([key, value]) => `${key}: ${value}`).join(' | ');
             return (
                <>
                    {log.target_name && <span className="font-medium text-slate-800">{log.target_name}</span>}
                    {parts && <span className="block text-xs text-slate-500">{parts}</span>}
                </>
             );
        }
    }
    
    // Fallback for logs with no details at all.
    if (log.target_name) {
        return <span className="font-medium text-slate-800">{log.target_name}</span>;
    }

    return <span className="text-slate-400 italic">N/A</span>;
};

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ scope, user }) => {
    const { addNotification } = useNotification();
    const isSuperAdminScope = scope === 'superadmin';
    const canDelete = isSuperAdminScope && user?.role === 'superadmin';

    const [data, setData] = useState<PaginatedAuditLogs | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        userId: 'all',
        searchTerm: '',
        startDate: '',
        endDate: '',
        page: 1,
    });
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isDeleteByDateOpen, setDeleteByDateOpen] = useState(false);
    const [isDeleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
    const [dateRangeToDelete, setDateRangeToDelete] = useState({ startDate: '', endDate: '' });

    const apiEndpoints = {
        fetchUsers: isSuperAdminScope ? null : '/users',
        fetchLogs: isSuperAdminScope ? '/superadmin/audit-logs' : '/admin/audit-logs',
    };

    const fetchUsers = useCallback(async () => {
        if (apiEndpoints.fetchUsers) {
            try {
                const usersData = await apiFetch(apiEndpoints.fetchUsers);
                setUsers(usersData);
            } catch (error) {
                if (error instanceof Error) addNotification({ type: 'error', message: error.message });
            }
        }
    }, [addNotification, apiEndpoints.fetchUsers]);

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        const params = new URLSearchParams({ page: filters.page.toString() });
        if (filters.userId !== 'all' && !isSuperAdminScope) params.append('userId', filters.userId);
        if (filters.searchTerm) params.append('searchTerm', filters.searchTerm);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        
        try {
            const responseData = await apiFetch(`${apiEndpoints.fetchLogs}?${params.toString()}`);
            setData(responseData);
            setSelectedIds(new Set()); // Clear selection on new data fetch
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [addNotification, filters, apiEndpoints.fetchLogs, isSuperAdminScope]);
    
    useEffect(() => { fetchUsers(); }, [fetchUsers]);
    useEffect(() => { const timer = setTimeout(fetchLogs, 300); return () => clearTimeout(timer); }, [fetchLogs]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
    const handlePageChange = (newPage: number) => setFilters(prev => ({ ...prev, page: newPage }));
    const formatDate = (isoString: string) => new Date(isoString).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });

    const handleSelectOne = (id: number) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked && data?.logs) {
            setSelectedIds(new Set(data.logs.map(log => log.id)));
        } else {
            setSelectedIds(new Set());
        }
    };
    
    const handleDeleteByDate = async () => {
        if (!dateRangeToDelete.startDate || !dateRangeToDelete.endDate) {
            addNotification({ type: 'error', message: "Les deux dates sont requises." });
            return;
        }
        try {
            const result = await apiFetch('/superadmin/audit-logs/delete-by-date', {
                method: 'DELETE',
                body: JSON.stringify(dateRangeToDelete)
            });
            addNotification({ type: 'success', message: result.message });
            setDeleteByDateOpen(false);
            setDateRangeToDelete({ startDate: '', endDate: '' });
            fetchLogs();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        try {
            const result = await apiFetch('/superadmin/audit-logs/delete-bulk', {
                method: 'DELETE',
                body: JSON.stringify({ ids: Array.from(selectedIds) })
            });
            addNotification({ type: 'success', message: result.message });
            setDeleteSelectedOpen(false);
            setSelectedIds(new Set());
            fetchLogs();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const renderPagination = () => {
        if (!data?.pagination || data.pagination.totalPages <= 1) return null;
        const { page, totalPages } = data.pagination;
        return (
            <div className="flex justify-between items-center mt-4">
                 <span className="text-sm text-slate-600">Page {page} sur {totalPages} ({data.pagination.total} total)</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="px-3 py-1 bg-slate-200 rounded disabled:opacity-50">Précédent</button>
                    <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages} className="px-3 py-1 bg-slate-200 rounded disabled:opacity-50">Suivant</button>
                </div>
            </div>
        );
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-700 font-display">Journal d'Activité</h2>
            
            <div className="p-4 bg-slate-50 rounded-lg my-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {!isSuperAdminScope && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Utilisateur</label>
                        <select name="userId" value={filters.userId} onChange={handleFilterChange} className="w-full px-3 py-2 border border-slate-300 rounded-md"><option value="all">Tous</option>{users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}</select>
                    </div>
                )}
                <div className={isSuperAdminScope ? 'lg:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rechercher</label>
                    <input type="text" name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} placeholder="Action, cible, détails..." className="w-full px-3 py-2 border border-slate-300 rounded-md" />
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Date de début</label><input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full px-3 py-2 border border-slate-300 rounded-md" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Date de fin</label><input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full px-3 py-2 border border-slate-300 rounded-md" /></div>
            </div>

            {canDelete && (
                <div className="flex justify-end items-center gap-4 mb-4 p-4 bg-slate-100 rounded-lg border">
                    <button
                        onClick={() => setDeleteByDateOpen(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                    >
                        Supprimer par période...
                    </button>
                    <button
                        onClick={() => setDeleteSelectedOpen(true)}
                        disabled={selectedIds.size === 0}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        Supprimer la sélection ({selectedIds.size})
                    </button>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-100">
                        <tr>
                            {canDelete && <th className="p-4"><input type="checkbox" disabled={!data?.logs || data.logs.length === 0} onChange={handleSelectAll} checked={data?.logs ? selectedIds.size === data.logs.length && data.logs.length > 0 : false} /></th>}
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-48">Horodatage</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-40">Utilisateur</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-48">Action</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Détails</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {isLoading ? (
                            <tr><td colSpan={canDelete ? 5 : 4} className="text-center py-10 text-slate-500">Chargement...</td></tr>
                        ) : data?.logs && data.logs.length > 0 ? (
                            data.logs.map(log => (
                                <tr key={log.id} className={`hover:bg-slate-50 ${selectedIds.has(log.id) ? 'bg-blue-50' : ''}`}>
                                    {canDelete && <td className="p-4"><input type="checkbox" checked={selectedIds.has(log.id)} onChange={() => handleSelectOne(log.id)} /></td>}
                                    <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{log.username}</td>
                                    <td className="px-4 py-3 text-sm font-mono text-blue-600">{log.action_type}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{formatDetails(log)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={canDelete ? 5 : 4} className="text-center py-10 text-slate-500">Aucun enregistrement trouvé.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {renderPagination()}
            
            {isDeleteByDateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={() => setDeleteByDateOpen(false)}>
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-2">Supprimer les journaux par période</h2>
                        <p className="text-sm text-slate-600 mb-4">Cette action supprimera définitivement tous les journaux d'activité dans la plage de dates sélectionnée (inclusivement).</p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-slate-700">Date de début</label>
                                <input type="date" id="startDate" value={dateRangeToDelete.startDate} onChange={e => setDateRangeToDelete(s => ({...s, startDate: e.target.value}))} className="mt-1 w-full p-2 border rounded-md" />
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-slate-700">Date de fin</label>
                                <input type="date" id="endDate" value={dateRangeToDelete.endDate} onChange={e => setDateRangeToDelete(s => ({...s, endDate: e.target.value}))} className="mt-1 w-full p-2 border rounded-md" />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 pt-6 mt-2 border-t">
                            <button onClick={() => setDeleteByDateOpen(false)} className="px-4 py-2 bg-slate-100 rounded-md">Annuler</button>
                            <button onClick={handleDeleteByDate} className="px-4 py-2 text-white bg-red-600 rounded-md">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isDeleteSelectedOpen}
                onClose={() => setDeleteSelectedOpen(false)}
                onConfirm={handleDeleteSelected}
                title="Confirmer la suppression"
                message={`Êtes-vous sûr de vouloir supprimer les ${selectedIds.size} enregistrements sélectionnés ? Cette action est irréversible.`}
            />
        </div>
    );
};

export default AuditLogViewer;