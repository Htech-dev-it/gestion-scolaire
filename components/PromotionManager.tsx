import React, { useState, useCallback, useMemo } from 'react';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import { CLASSES } from '../constants';
import ConfirmationModal from './ConfirmationModal';
import type { SchoolYear } from '../types';

interface PromotionPreview {
    [sourceClass: string]: {
        admitted: number;
        failed: number;
        target: string | null;
    }
}

const PromotionManager: React.FC = () => {
    const { schoolYears } = useSchoolYear();
    const { addNotification } = useNotification();

    const [sourceYear, setSourceYear] = useState<SchoolYear | null>(null);
    const [promotionMap, setPromotionMap] = useState<Record<string, string | null>>({});
    const [previewData, setPreviewData] = useState<PromotionPreview | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirmationOpen, setConfirmationOpen] = useState(false);

    // Auto-generate promotion map when source year changes
    useMemo(() => {
        const newMap: Record<string, string | null> = {};
        CLASSES.forEach((c, index) => {
            newMap[c] = index + 1 < CLASSES.length ? CLASSES[index + 1] : null;
        });
        setPromotionMap(newMap);

        const currentYear = schoolYears.find(y => y.is_current);
        if (currentYear) {
            setSourceYear(currentYear);
        } else if (schoolYears.length > 0) {
            setSourceYear(schoolYears[0]);
        }
    }, [schoolYears]);

    const handlePreview = async () => {
        if (!sourceYear) {
            addNotification({ type: 'error', message: "Veuillez sélectionner une année scolaire source." });
            return;
        }
        setIsLoading(true);
        setPreviewData(null);
        try {
            const data = await apiFetch(`/promotions?preview=true`, {
                method: 'POST',
                body: JSON.stringify({ sourceYearId: sourceYear.id, promotionMap })
            });
            setPreviewData(data);
            addNotification({ type: 'info', message: "Simulation terminée. Vérifiez les résultats avant d'exécuter." });
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecutePromotion = () => {
        if (!previewData) {
            addNotification({ type: 'warning', message: 'Veuillez d\'abord lancer une simulation.' });
            return;
        }
        setConfirmationOpen(true);
    };
    
    const handleConfirmExecute = async () => {
        if (!sourceYear || !previewData) return;
        
        setIsLoading(true);
        setConfirmationOpen(false);
        try {
            const data = await apiFetch(`/promotions`, {
                method: 'POST',
                body: JSON.stringify({ sourceYearId: sourceYear.id, promotionMap })
            });
            addNotification({ type: 'success', message: data.message });
            setPreviewData(null);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-700 font-display">Outil de Promotion des Élèves</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">Cet outil met à jour la "Classe de Référence" des élèves en se basant sur leur moyenne annuelle et la moyenne de passage définie. Cela prépare les élèves pour leur inscription dans la nouvelle année scolaire.</p>
            
            <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">1. Sélectionner l'année scolaire source (celle qui se termine)</label>
                    <select
                        value={sourceYear?.id || ''}
                        onChange={(e) => setSourceYear(schoolYears.find(y => y.id === Number(e.target.value)) || null)}
                        className="mt-1 block w-full md:w-1/2 pl-3 pr-10 py-2 border-slate-300 rounded-md"
                    >
                         {schoolYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                </div>

                <div>
                    <h3 className="block text-sm font-medium text-gray-700 mb-1">2. Vérifier le plan de promotion (pour les élèves admis)</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white text-sm">
                            <thead className="bg-slate-200">
                                <tr>
                                    <th className="p-2 text-left font-semibold">Classe Source</th>
                                    <th className="p-2 text-left font-semibold">Classe de Destination</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(promotionMap).map(([source, target]) => (
                                    <tr key={source} className="border-b">
                                        <td className="p-2">{source}</td>
                                        <td className="p-2">{target || <span className="font-semibold text-green-600 italic">Diplômé (aucune)</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                     <h3 className="block text-sm font-medium text-gray-700 mb-1">3. Lancer la simulation</h3>
                    <button onClick={handlePreview} disabled={isLoading || !sourceYear} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-slate-400">
                        {isLoading ? 'Simulation en cours...' : 'Lancer la simulation'}
                    </button>
                </div>
            </div>

            {previewData && (
                <div className="mt-6 p-4 border-2 border-blue-300 bg-blue-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-800 font-display mb-2">Résultats de la Simulation</h3>
                     <table className="min-w-full bg-white text-sm">
                        <thead className="bg-blue-200">
                            <tr>
                                <th className="p-2 text-left">Classe Source</th>
                                <th className="p-2 text-center text-green-700">Admis</th>
                                <th className="p-2 text-center text-red-700">Ajournés</th>
                                <th className="p-2 text-left">Destination des Admis</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(previewData).map(([sourceClass, data]) => (
                                <tr key={sourceClass} className="border-b">
                                    <td className="p-2 font-semibold">{sourceClass}</td>
                                    <td className="p-2 text-center font-bold text-green-700">{data.admitted}</td>
                                    <td className="p-2 text-center font-bold text-red-700">{data.failed}</td>
                                    <td className="p-2">{data.target || <span className="font-semibold text-green-600 italic">Diplômé</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-4">
                        <h3 className="block text-sm font-medium text-gray-700 mb-2">4. Exécuter la promotion</h3>
                        <p className="text-xs text-red-600 mb-2">ATTENTION: Seuls les élèves admis verront leur classe de référence mise à jour. Les élèves ajournés resteront dans leur classe actuelle en prévision du redoublement. Cette action est irréversible.</p>
                        <button onClick={handleExecutePromotion} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 disabled:bg-slate-400">
                            {isLoading ? 'Exécution...' : 'Exécuter la Promotion'}
                        </button>
                    </div>
                </div>
            )}
            
            <ConfirmationModal 
                isOpen={isConfirmationOpen}
                onClose={() => setConfirmationOpen(false)}
                onConfirm={handleConfirmExecute}
                title="Confirmer la Promotion"
                message="Êtes-vous absolument sûr de vouloir exécuter la promotion ? Les classes de référence des élèves admis seront mises à jour de manière permanente."
            />
        </div>
    );
}

export default PromotionManager;