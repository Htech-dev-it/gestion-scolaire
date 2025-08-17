import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import type { AuditLogEntry, PaginatedAuditLogs, User } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../auth/AuthContext';
import ConfirmationModal from './ConfirmationModal';

interface AuditLogViewerProps {
    scope: 'admin' | 'superadmin';
    canDelete?: boolean;
}

const DateRangeDeleteModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (startDate: string, endDate: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (startDate && endDate) {
            onConfirm(startDate, endDate);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-bold mb-4">Supprimer les journaux par période</h2>
                <p className="text-sm text-slate-600 mb-4">
                    Cette action supprimera définitivement tous les journaux d'activité dans la plage de dates sélectionnée (inclusivement).
                </p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Date de début</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Date de fin</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
                    </div>
                </div>
                <div className="flex justify-end space-x-3 pt-6 mt-2 border-t">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-md">Annuler</button>
                    <button onClick={handleConfirm} disabled={!startDate || !endDate} className="px-4 py-2 text-white bg-red-600 rounded-md disabled:bg-red-300">Supprimer</button>
                </div>
            </div>
        </div>
    );
};

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

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ scope, canDelete = true }) => {
    const { addNotification } = useNotification();
    const { user } = useAuth();
    const isSuperAdminScope = scope === 'superadmin';

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
    const [selectedLogIds, setSelectedLogIds] = useState(new Set<number>());
    const [isSelectionDeleteModalOpen, setSelectionDeleteModalOpen] = useState(false);
    const [isDateDeleteModalOpen, setDateDeleteModalOpen] = useState(false);

    const apiEndpoints = {
        fetchUsers: isSuperAdminScope ? null : '/users',
        fetchLogs: isSuperAdminScope ? '/superadmin/audit-logs' : '/admin/audit-logs',
        deleteBulk: isSuperAdminScope ? '/superadmin/audit-logs/delete-bulk' : '/admin/audit-logs/delete-bulk',
        deleteByDate: isSuperAdminScope ? '/superadmin/audit-logs/delete-by-date' : '/admin/audit-logs/delete-by-date',
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
            setSelectedLogIds(new Set());
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

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked && data?.logs) setSelectedLogIds(new Set(data.logs.map(log => log.id)));
        else setSelectedLogIds(new Set());
    };
    const handleSelectOne = (id: number) => setSelectedLogIds(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; });
    
    const handleConfirmSelectionDelete = async () => {
        try {
            const res = await apiFetch(apiEndpoints.deleteBulk, { method: 'POST', body: JSON.stringify({ ids: Array.from(selectedLogIds) }) });
            addNotification({ type: 'success', message: res.message });
            setSelectionDeleteModalOpen(false);
            fetchLogs();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleConfirmDateRangeDelete = async (startDate: string, endDate: string) => {
        try {
            const res = await apiFetch(apiEndpoints.deleteByDate, { method: 'POST', body: JSON.stringify({ startDate, endDate }) });
            addNotification({ type: 'success', message: res.message });
            setDateDeleteModalOpen(false);
            fetchLogs();
        } catch(error) {
             if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const formatDate = (isoString: string) => new Date(isoString).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });
    
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
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-700 font-display">Journal d'Activité</h2>
                {canDelete && (
                    <button onClick={() => setDateDeleteModalOpen(true)} className="px-3 py-2 text-sm text-white bg-red-700 rounded-md shadow-sm hover:bg-red-800">Supprimer par période...</button>
                )}
            </div>
            
            <div className="p-4 bg-slate-50 rounded-lg mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            
            {canDelete && selectedLogIds.size > 0 && (
                <div className="bg-blue-100 border border-blue-300 p-3 rounded-md mb-4 flex justify-between items-center"><span className="font-semibold text-blue-800">{selectedLogIds.size} enregistrement(s) sélectionné(s)</span><button onClick={() => setSelectionDeleteModalOpen(true)} className="px-4 py-2 text-sm text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700">Supprimer la sélection</button></div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-100"><tr>{canDelete && <th className="p-4 w-12"><input type="checkbox" onChange={handleSelectAll} checked={!!(data?.logs && data.logs.length > 0 && selectedLogIds.size === data.logs.length)} /></th>}<th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-48">Horodatage</th><th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-40">Utilisateur</th><th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-48">Action</th><th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Détails</th></tr></thead>
                    <tbody className="bg-white divide-y divide-slate-200">{isLoading ? (<tr><td colSpan={5} className="text-center py-10 text-slate-500">Chargement...</td></tr>) : data?.logs && data.logs.length > 0 ? (data.logs.map(log => (<tr key={log.id} className={`hover:bg-slate-50 ${selectedLogIds.has(log.id) ? 'bg-blue-50' : ''}`}>{canDelete && <td className="p-4"><input type="checkbox" checked={selectedLogIds.has(log.id)} onChange={() => handleSelectOne(log.id)} /></td>}<td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{formatDate(log.timestamp)}</td><td className="px-4 py-3 text-sm font-medium text-slate-800">{log.username}</td><td className="px-4 py-3 text-sm font-mono text-blue-600">{log.action_type}</td><td className="px-4 py-3 text-sm text-slate-600">{formatDetails(log)}</td></tr>))) : (<tr><td colSpan={5} className="text-center py-10 text-slate-500">Aucun enregistrement trouvé.</td></tr>)}</tbody>
                </table>
            </div>
            {renderPagination()}

            <ConfirmationModal isOpen={isSelectionDeleteModalOpen} onClose={() => setSelectionDeleteModalOpen(false)} onConfirm={handleConfirmSelectionDelete} title="Confirmer la suppression" message={`Êtes-vous sûr de vouloir supprimer les ${selectedLogIds.size} enregistrements sélectionnés ? Cette action est irréversible.`} />
            <DateRangeDeleteModal isOpen={isDateDeleteModalOpen} onClose={() => setDateDeleteModalOpen(false)} onConfirm={handleConfirmDateRangeDelete} />
        </div>
    );
};

export default AuditLogViewer;