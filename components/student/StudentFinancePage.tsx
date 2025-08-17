import React, { useState, useEffect, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useSchoolYear } from '../../contexts/SchoolYearContext';
import { useNotification } from '../../contexts/NotificationContext';
import type { StudentFinanceData } from '../../types';

const SummaryCard: React.FC<{ title: string; value: string; color: string; icon: React.ReactNode }> = ({ title, value, color, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-start gap-4">
        <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
    <div className="w-full bg-slate-200 rounded-full h-4 relative overflow-hidden">
        <div 
            className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${Math.min(value, 100)}%` }}
        />
    </div>
);


const StudentFinancePage: React.FC = () => {
    const { selectedYear } = useSchoolYear();
    const { addNotification } = useNotification();
    const [financeData, setFinanceData] = useState<StudentFinanceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFinanceData = useCallback(async () => {
        if (!selectedYear) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await apiFetch(`/student/finances?yearId=${selectedYear.id}`);
            setFinanceData(data);
        } catch (error) {
            if (error instanceof Error) {
                addNotification({ type: 'error', message: error.message });
            }
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear, addNotification]);

    useEffect(() => {
        fetchFinanceData();
    }, [fetchFinanceData]);

    const renderContent = () => {
        if (isLoading) return <div className="text-center p-10 text-slate-500">Chargement des informations financières...</div>;
        if (!financeData || financeData.mppa === 0) return <div className="text-center p-10 bg-white rounded-lg shadow-md italic">Aucune information financière trouvée pour cette année scolaire.</div>;

        const { mppa, payments, totalPaid, balance } = financeData;
        const paidPercentage = mppa > 0 ? (totalPaid / mppa) * 100 : 0;
        
        return (
            <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <SummaryCard title="Montant Total à Payer" value={`${mppa.toFixed(2)}$`} color="bg-blue-100 text-blue-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                    <SummaryCard title="Total Versé" value={`${totalPaid.toFixed(2)}$`} color="bg-green-100 text-green-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    <SummaryCard title="Balance Restante" value={`${balance.toFixed(2)}$`} color={balance > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>} />
                </div>

                <div className="p-6 bg-white rounded-xl shadow-md mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg font-semibold text-slate-700">Progression des Paiements</h2>
                        <span className="font-bold text-slate-800">{paidPercentage.toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={paidPercentage} />
                </div>

                <div className="p-6 bg-white rounded-xl shadow-md">
                    <h2 className="text-xl font-bold text-slate-800 font-display mb-4">Historique des Versements</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Versement</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Montant</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date du Paiement</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {payments.map((payment, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">Versement {index + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">{payment.amount.toFixed(2)}$</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">{payment.date ? new Date(payment.date).toLocaleDateString('fr-FR') : 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {payment.amount > 0 ? (
                                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Payé</span>
                                            ) : (
                                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-600">En attente</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-slate-500 mt-4 italic">Pour toute question ou pour effectuer un paiement, veuillez vous présenter au service de la comptabilité.</p>
                </div>
            </>
        );
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <header className="mb-8">
                <ReactRouterDOM.Link to="/student" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>Retour</ReactRouterDOM.Link>
                <h1 className="text-4xl font-bold text-gray-800 font-display">Mes Finances</h1>
                <p className="text-lg text-slate-500 mt-2">Votre situation financière pour l'année {selectedYear?.name}</p>
            </header>
            {renderContent()}
        </div>
    );
};

export default StudentFinancePage;