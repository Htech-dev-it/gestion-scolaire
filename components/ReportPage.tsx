import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import type { Enrollment, Instance, PaginationInfo } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import { useSchoolYear } from '../contexts/SchoolYearContext';

// Define local types that match the API response for this specific page
type ReportEnrollment = Enrollment & {
    prenom: string;
    nom: string;
};

interface PaginatedReportData {
    enrollments: ReportEnrollment[];
    pagination: PaginationInfo;
}


const SummaryCard: React.FC<{ title: string; value: string; icon: React.ReactNode; colorClass: string; }> = ({ title, value, icon, colorClass }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center gap-4">
        <div className={`h-12 w-12 rounded-lg flex-shrink-0 flex items-center justify-center ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);


const ReportPage: React.FC = () => {
    const { addNotification } = useNotification();
    const { classes } = useSchoolYear();
    const [allEnrollments, setAllEnrollments] = useState<ReportEnrollment[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [instanceInfo, setInstanceInfo] = useState<Instance | null>(null);

    // Filter states
    const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [balanceFilter, setBalanceFilter] = useState('all'); // 'all', 'zero', 'nonzero'
    const [mppaFilter, setMppaFilter] = useState('');
    const { selectedYear } = useSchoolYear();

    useEffect(() => {
        if (classes.length > 0) {
            setSelectedClasses(new Set(classes.map(c => c.name)));
        }
    }, [classes]);
    
    const fetchReportData = useCallback(async (page: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '25',
                selectedClasses: Array.from(selectedClasses).join(','),
                balanceFilter,
                mppaFilter,
                searchTerm,
            });
            if (selectedYear) {
                params.append('yearId', selectedYear.id.toString());
            }

            if (!instanceInfo) {
                const info = await apiFetch('/instance/current');
                setInstanceInfo(info);
            }

            const data: PaginatedReportData = await apiFetch(`/enrollments/all?${params.toString()}`);
            setAllEnrollments(data.enrollments);
            setPagination(data.pagination);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
            setError(errorMessage);
            addNotification({ type: 'error', message: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }, [addNotification, selectedClasses, balanceFilter, mppaFilter, searchTerm, selectedYear, instanceInfo]);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchReportData(currentPage);
        }, 300); // Debounce
        return () => clearTimeout(timer);
    }, [fetchReportData, currentPage]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedClasses, balanceFilter, mppaFilter, searchTerm, selectedYear]);

    const summaryData = useMemo(() => {
        const data = { totalAdjustedMPPA: 0, totalPaid: 0, balance: 0 };
        for (const enrollment of allEnrollments) {
            const totalAdjustments = (enrollment.adjustments || []).reduce((acc, adj) => acc + Number(adj.amount), 0);
            const adjustedMppa = Number(enrollment.mppa) + totalAdjustments;
            const totalPaid = (enrollment.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
            
            data.totalAdjustedMPPA += adjustedMppa;
            data.totalPaid += totalPaid;
        }
        data.balance = data.totalAdjustedMPPA - data.totalPaid;
        return data;
    }, [allEnrollments]);

    const handleClassToggle = (className: string) => {
        setSelectedClasses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(className)) newSet.delete(className);
            else newSet.add(className);
            return newSet;
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-screen-2xl mx-auto">
            <header className="mb-8 no-print flex justify-between items-start">
                <div>
                    <ReactRouterDOM.Link to="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                        Retour à l'accueil
                    </ReactRouterDOM.Link>
                    <h1 className="text-4xl font-bold text-gray-800 font-display">Rapport Financier</h1>
                    <p className="text-lg text-slate-500 mt-2">Données pour l'année scolaire : <span className="font-semibold text-slate-700">{selectedYear?.name || 'Toutes'}</span></p>
                </div>
            </header>

            <div className="p-6 bg-white rounded-xl shadow-md mb-8 no-print">
                <h3 className="text-lg font-semibold text-gray-800 font-display mb-4">Filtres Avancés</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Rechercher</label>
                        <input type="text" placeholder="Nom de l'élève..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Statut du Solde</label>
                        <select value={balanceFilter} onChange={e => setBalanceFilter(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md">
                            <option value="all">Tous</option>
                            <option value="zero">Solde Nul</option>
                            <option value="nonzero">Solde Restant</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Filtrer par MPPA de Base</label>
                        <input type="number" placeholder="Montant exact" value={mppaFilter} onChange={e => setMppaFilter(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"/>
                    </div>
                     <div className="lg:col-span-3">
                         <label className="block text-sm font-medium text-slate-700 mb-2">Filtrer par Classe</label>
                         <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {classes.map(c => <label key={c.id} className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={selectedClasses.has(c.name)} onChange={() => handleClassToggle(c.name)} className="h-4 w-4 rounded text-blue-600"/><span>{c.name}</span></label>)}
                        </div>
                    </div>
                </div>
            </div>

            {isLoading && <div className="text-center p-10 text-slate-500">Chargement des données...</div>}
            {error && <div className="text-center p-10 text-red-500 bg-red-50 rounded-lg">Erreur: {error}</div>}

            {!isLoading && !error && (
            <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 no-print">
                    <SummaryCard title="Total Attendu (MPPA Ajusté)" value={summaryData.totalAdjustedMPPA.toLocaleString('fr-FR', {style: 'currency', currency: 'USD'})} colorClass="bg-blue-100" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>} />
                    <SummaryCard title="Total Versé" value={summaryData.totalPaid.toLocaleString('fr-FR', {style: 'currency', currency: 'USD'})} colorClass="bg-green-100" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                    <SummaryCard title="Balance Restante" value={summaryData.balance.toLocaleString('fr-FR', {style: 'currency', currency: 'USD'})} colorClass="bg-red-100" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                </div>
                
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg printable-content overflow-x-auto">
                    <p className="mb-4 text-slate-600">Affichage de <span className="font-bold text-slate-800">{allEnrollments.length}</span> sur <span className="font-bold text-slate-800">{pagination?.total || 0}</span> inscriptions.</p>
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase">Élève</th>
                                <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase">Année</th>
                                <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase">Classe</th>
                                <th className="px-3 py-3 text-right font-semibold text-slate-600 uppercase">MPPA Base</th>
                                <th className="px-3 py-3 text-right font-semibold text-slate-600 uppercase">Ajustements</th>
                                <th className="px-3 py-3 text-right font-semibold text-slate-600 uppercase">MPPA Ajusté</th>
                                <th className="px-3 py-3 text-right font-semibold text-slate-600 uppercase">Total Versé</th>
                                <th className="px-3 py-3 text-right font-semibold text-slate-600 uppercase">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                           {allEnrollments.length > 0 ? allEnrollments.map(enrollment => {
                               const totalPaid = (enrollment.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
                               const totalAdjustments = (enrollment.adjustments || []).reduce((acc, adj) => acc + Number(adj.amount), 0);
                               const adjustedMppa = Number(enrollment.mppa) + totalAdjustments;
                               const balance = adjustedMppa - totalPaid;

                               return (
                                   <tr key={enrollment.id} className="even:bg-gray-50">
                                       <td className="px-3 py-3 font-medium whitespace-nowrap">{enrollment.prenom} {enrollment.nom}</td>
                                       <td className="px-3 py-3 whitespace-nowrap">{enrollment.year_name}</td>
                                       <td className="px-3 py-3 whitespace-nowrap">{enrollment.className}</td>
                                       <td className="px-3 py-3 text-right">{Number(enrollment.mppa).toFixed(2)}$</td>
                                       <td className="px-3 py-3 text-right">{totalAdjustments.toFixed(2)}$</td>
                                       <td className="px-3 py-3 text-right font-medium">{adjustedMppa.toFixed(2)}$</td>
                                       <td className="px-3 py-3 text-right font-semibold text-slate-800">{totalPaid.toFixed(2)}$</td>
                                       <td className={`px-3 py-3 text-right font-bold ${balance > 0 ? 'text-red-600' : 'text-green-700'}`}>{balance.toFixed(2)}$</td>
                                   </tr>
                               );
                           }) : (
                               <tr>
                                   <td colSpan={8} className="text-center py-10 text-slate-500">Aucune inscription ne correspond à vos critères.</td>
                               </tr>
                           )}
                        </tbody>
                    </table>
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex justify-between items-center mt-4 no-print">
                            <span className="text-sm text-slate-600">
                                Page <span className="font-bold">{pagination.page}</span> sur <span className="font-bold">{pagination.totalPages}</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCurrentPage(p => p - 1)} disabled={pagination.page <= 1} className="px-3 py-1 bg-slate-200 rounded disabled:opacity-50 text-sm">Précédent</button>
                                <button onClick={() => setCurrentPage(p => p + 1)} disabled={pagination.page >= pagination.totalPages} className="px-3 py-1 bg-slate-200 rounded disabled:opacity-50 text-sm">Suivant</button>
                            </div>
                        </div>
                    )}
                </div>
            </>
            )}
        </div>
    );
};

export default ReportPage;