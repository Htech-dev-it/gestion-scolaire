import React, { useState, useCallback, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import type { Enrollment, Payment, Instance, Adjustment } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import * as db from '../utils/db';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import GradebookModal from './GradebookModal';
import ConfirmationModal from './ConfirmationModal';
import { v4 as uuidv4 } from 'uuid';
import { useCurrency } from '../contexts/CurrencyContext';


const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
    <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-lg shadow-md col-span-full">
        <div className="flex">
            <div className="py-1">
                <svg className="h-6 w-6 text-red-400 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
            </div>
            <div>
                <p className="font-bold text-red-800">Erreur de configuration</p>
                <p className="text-sm text-red-700">{message}</p>
                <ReactRouterDOM.Link to="/admin" className="mt-2 inline-block text-sm font-medium text-red-800 hover:text-red-900 underline">
                    Aller à l'administration →
                </ReactRouterDOM.Link>
            </div>
        </div>
    </div>
);

const PaymentDetailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    enrollment: Enrollment | null;
    instanceInfo: Instance | null;
}> = ({ isOpen, onClose, enrollment, instanceInfo }) => {
    const { formatCurrency } = useCurrency();
    if (!isOpen || !enrollment) return null;

    const totalPaid = enrollment.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const totalAdjustments = enrollment.adjustments.reduce((acc, adj) => acc + Number(adj.amount), 0);
    const adjustedMppa = Number(enrollment.mppa) + totalAdjustments;
    const balance = adjustedMppa - totalPaid;

    const handlePrint = () => {
        const printContent = document.getElementById('payment-details-printable');
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title></title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @page { 
                            size: A4 portrait; 
                            margin: 0; 
                        }
                        body { 
                            font-family: 'Inter', sans-serif; 
                            -webkit-print-color-adjust: exact !important; 
                            print-color-adjust: exact !important; 
                            margin: 20mm;
                        }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 no-print" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 my-8 h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex-shrink-0 flex justify-between items-start mb-4 border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold font-display text-slate-800">Détails Financiers</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700">Imprimer</button>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                </div>
                <div id="payment-details-printable" className="flex-grow overflow-y-auto pr-2">
                    <div className="text-center mb-6">
                        {instanceInfo?.logo_url && <img src={instanceInfo.logo_url} alt="Logo" className="h-16 mx-auto mb-2" />}
                        <h3 className="text-xl font-bold font-display">{instanceInfo?.name}</h3>
                        <p className="text-xs text-slate-500">{instanceInfo?.address}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border my-2">
                        <p><strong>Élève:</strong> {enrollment.student?.prenom} {enrollment.student?.nom}</p>
                        <p><strong>Classe:</strong> {enrollment.className}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 my-4">
                         <div className="bg-blue-50 p-3 rounded-lg text-center"><p className="text-xs text-blue-700">MPPA AJUSTÉ</p><p className="font-bold text-lg text-blue-800">{formatCurrency(adjustedMppa)}</p></div>
                         <div className="bg-green-50 p-3 rounded-lg text-center"><p className="text-xs text-green-700">TOTAL VERSÉ</p><p className="font-bold text-lg text-green-800">{formatCurrency(totalPaid)}</p></div>
                         <div className="bg-red-50 p-3 rounded-lg text-center"><p className="text-xs text-red-700">BALANCE</p><p className="font-bold text-lg text-red-800">{formatCurrency(balance)}</p></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div>
                            <h4 className="font-semibold text-slate-700 mb-2">Versements</h4>
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Libellé</th><th className="p-2 text-right">Montant</th></tr></thead>
                                <tbody>{enrollment.payments.map(p => <tr key={p.id} className="border-b"><td className="p-2">{p.date ? new Date(p.date).toLocaleDateString('fr-FR') : '-'}</td><td className="p-2">{p.label}</td><td className="p-2 text-right font-mono">{formatCurrency(p.amount)}</td></tr>)}</tbody>
                            </table>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-700 mb-2">Ajustements</h4>
                             <table className="w-full text-sm">
                                <thead className="bg-slate-100"><tr><th className="p-2 text-left">Libellé</th><th className="p-2 text-right">Montant</th></tr></thead>
                                <tbody>{enrollment.adjustments.map(adj => <tr key={adj.id} className="border-b"><td className="p-2">{adj.label}</td><td className={`p-2 text-right font-mono ${adj.amount < 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(adj.amount)}</td></tr>)}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const PaymentForm: React.FC<{
    formState: Enrollment;
    onPaymentChange: (index: number, field: 'label' | 'amount', value: string | number) => void;
    onAddPayment: () => void;
    onRemovePayment: (index: number) => void;
    onAdjustmentChange: (index: number, field: 'label' | 'amount', value: string | number) => void;
    onAddAdjustment: () => void;
    onRemoveAdjustment: (index: number) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
}> = ({ formState, onPaymentChange, onAddPayment, onRemovePayment, onAdjustmentChange, onAddAdjustment, onRemoveAdjustment, onSubmit, onCancel }) => {
    const { formatCurrency } = useCurrency();
    const totalPaid = useMemo(() => formState.payments.reduce((acc, p) => acc + Number(p.amount), 0), [formState.payments]);
    const totalAdjustments = useMemo(() => formState.adjustments.reduce((acc, adj) => acc + Number(adj.amount), 0), [formState.adjustments]);
    const adjustedMppa = useMemo(() => Number(formState.mppa) + totalAdjustments, [formState.mppa, totalAdjustments]);
    const balance = useMemo(() => adjustedMppa - totalPaid, [adjustedMppa, totalPaid]);
    const { selectedYear } = useSchoolYear();
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg sticky top-24">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 font-display">Fiche Financière</h2>
                    <p className="text-lg font-semibold text-slate-700">{formState.student?.prenom} {formState.student?.nom}</p>
                    <p className="text-sm text-slate-500">Année: {selectedYear?.name}</p>
                </div>
            </div>
             <form onSubmit={onSubmit} className="space-y-4">
                <fieldset>
                    <legend className="text-base font-semibold text-slate-500 mb-2 -ml-1">Montant de Base (MPPA)</legend>
                    <div className="mt-1 block w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md shadow-sm font-bold text-slate-700">
                        {formatCurrency(formState.mppa)}
                    </div>
                </fieldset>

                <fieldset>
                    <legend className="text-base font-semibold text-slate-500 mb-2 -ml-1">Ajustements (Bourses, Frais, etc.)</legend>
                    <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                        {formState.adjustments.map((adj, index) => (
                             <div key={adj.id} className="grid grid-cols-12 gap-2 items-center">
                                <input type="text" placeholder="Libellé (ex: Bourse)" value={adj.label} onChange={(e) => onAdjustmentChange(index, 'label', e.target.value)} className="col-span-6 px-2 py-1.5 border rounded-md text-sm"/>
                                <input type="number" placeholder="Montant" value={adj.amount || ''} onChange={(e) => onAdjustmentChange(index, 'amount', Number(e.target.value))} className="col-span-4 px-2 py-1.5 border rounded-md text-sm"/>
                                <button type="button" onClick={() => onRemoveAdjustment(index)} className="col-span-2 p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors" title="Supprimer"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-auto" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={onAddAdjustment} className="mt-3 w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition">+ Ajouter un ajustement</button>
                </fieldset>

                <fieldset>
                    <legend className="text-base font-semibold text-slate-500 mb-2 -ml-1">Versements Enregistrés</legend>
                    <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                    {formState.payments.map((payment, index) => (
                        <div key={payment.id} className="grid grid-cols-12 gap-2 items-center">
                            <input type="text" placeholder="Libellé" value={payment.label} onChange={(e) => onPaymentChange(index, 'label', e.target.value)} className="col-span-6 px-2 py-1.5 border rounded-md text-sm"/>
                            <input type="number" placeholder="Montant" value={payment.amount || ''} onChange={(e) => onPaymentChange(index, 'amount', Number(e.target.value))} className="col-span-4 px-2 py-1.5 border rounded-md text-sm"/>
                            <button type="button" onClick={() => onRemovePayment(index)} className="col-span-2 p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors" title="Supprimer"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-auto" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                        </div>
                    ))}
                    </div>
                    <button type="button" onClick={onAddPayment} className="mt-3 w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition">+ Ajouter un versement</button>
                </fieldset>
                
                <div className="border-t border-slate-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-slate-500">MPPA de Base:</span><span className="font-semibold">{formatCurrency(formState.mppa)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Total Ajustements:</span><span className="font-semibold">{formatCurrency(totalAdjustments)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500 font-bold">MPPA Ajusté:</span><span className="font-bold">{formatCurrency(adjustedMppa)}</span></div>
                    <hr className="my-1"/>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Total Versé:</span><span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span></div>
                    <div className="flex justify-between text-lg"><span className="font-bold text-slate-700">Balance:</span><span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(balance)}</span></div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">Annuler</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">Mettre à jour</button>
                </div>
            </form>
        </div>
    );
};

const ToggleSwitch: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ enabled, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
      enabled ? 'bg-green-600' : 'bg-gray-300'
    }`}
    aria-checked={enabled}
  >
    <span
      className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);


const ClassPage: React.FC = () => {
  const { className } = ReactRouterDOM.useParams<{ className: string }>();
  const { addNotification } = useNotification();
  const { selectedYear, isLoading: isYearLoading, error: yearError } = useSchoolYear();
  const { formatCurrency } = useCurrency();
  
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);
  const [formState, setFormState] = useState<Enrollment | null>(null);
  const [instanceInfo, setInstanceInfo] = useState<Instance | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: 'nom' | 'prenom'; direction: 'ascending' | 'descending' }>({ key: 'nom', direction: 'ascending' });
  const [gradebookEnrollment, setGradebookEnrollment] = useState<Enrollment | null>(null);
  const [bulkAction, setBulkAction] = useState<{ type: 'enable' | 'disable' } | null>(null);
  const [detailsEnrollment, setDetailsEnrollment] = useState<Enrollment | null>(null);

  const fetchEnrollments = useCallback(async () => {
    if (!className || !selectedYear) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
        const data = await apiFetch(`/enrollments?className=${className}&yearId=${selectedYear.id}`);
        const enrollmentsWithValidatedData = data.map((e: any) => ({
            ...e,
            payments: (e.payments || []).map((p: any) => ({
                id: p.id || uuidv4(),
                label: p.label || '',
                amount: p.amount || 0,
                date: p.date || null
            })),
            adjustments: (e.adjustments || []).map((adj: any) => ({
                id: adj.id || uuidv4(),
                label: adj.label || '',
                amount: adj.amount || 0
            }))
        }));
        setEnrollments(enrollmentsWithValidatedData);
    } catch (error) {
        if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        setEnrollments([]);
    } finally {
        setIsLoading(false);
    }
  }, [className, selectedYear, addNotification]);

  useEffect(() => {
    const fetchInstanceInfo = async () => {
        try {
            setInstanceInfo(await apiFetch('/instance/current'));
        } catch (error) {
           if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    fetchInstanceInfo();
    fetchEnrollments();
  }, [className, fetchEnrollments, addNotification]);
  
  const handleOpenGradebook = (enrollment: Enrollment) => {
    setGradebookEnrollment(enrollment);
  };

  const handleOpenDetails = (enrollment: Enrollment) => {
    setDetailsEnrollment(enrollment);
  };

  const handlePaymentChange = useCallback((index: number, field: 'label' | 'amount', value: string | number) => {
      setFormState(prevState => {
          if (!prevState) return null;
          const newPayments = [...prevState.payments];
          const oldPayment = newPayments[index];
          let updatedPayment: Payment;
          if (field === 'amount') {
              const oldAmount = oldPayment.amount;
              const newAmount = Number(value) || 0;
              updatedPayment = { 
                  ...oldPayment,
                  amount: newAmount, 
                  date: newAmount > 0 && oldAmount === 0 ? new Date().toISOString() : (newAmount === 0 ? null : oldPayment.date) 
              };
          } else {
              updatedPayment = { ...oldPayment, label: String(value) };
          }
          newPayments[index] = updatedPayment;
          return { ...prevState, payments: newPayments };
      });
  }, []);

  const handleAddPayment = useCallback(() => {
      setFormState(prevState => {
          if (!prevState) return null;
          const newPayment: Payment = { id: uuidv4(), label: '', amount: 0, date: null };
          return { ...prevState, payments: [...prevState.payments, newPayment] };
      });
  }, []);

  const handleRemovePayment = useCallback((index: number) => {
      setFormState(prevState => {
          if (!prevState) return null;
          const newPayments = prevState.payments.filter((_, i) => i !== index);
          return { ...prevState, payments: newPayments };
      });
  }, []);

  const handleAdjustmentChange = useCallback((index: number, field: 'label' | 'amount', value: string | number) => {
    setFormState(prevState => {
        if (!prevState) return null;
        const newAdjustments = [...prevState.adjustments];
        const updatedAdjustment = { ...newAdjustments[index], [field]: value };
        newAdjustments[index] = updatedAdjustment;
        return { ...prevState, adjustments: newAdjustments };
    });
  }, []);
  
  const handleAddAdjustment = useCallback(() => {
      setFormState(prevState => {
          if (!prevState) return null;
          const newAdjustment: Adjustment = { id: uuidv4(), label: '', amount: 0 };
          return { ...prevState, adjustments: [...prevState.adjustments, newAdjustment] };
      });
  }, []);

  const handleRemoveAdjustment = useCallback((index: number) => {
      setFormState(prevState => {
          if (!prevState) return null;
          const newAdjustments = prevState.adjustments.filter((_, i) => i !== index);
          return { ...prevState, adjustments: newAdjustments };
      });
  }, []);


  const resetForm = useCallback(() => setEditingEnrollment(null), []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnrollment || !formState) return;
    
    try {
        const result = await apiFetch(`/enrollments/${editingEnrollment.id}/payments`, {
            method: 'PUT',
            body: JSON.stringify({ payments: formState.payments, adjustments: formState.adjustments }),
        });

        if (result?.queued) {
            // Optimistic Update
            const updatedEnrollments = enrollments.map(en => 
                en.id === editingEnrollment.id ? formState : en
            );
            setEnrollments(updatedEnrollments);

            // Save the optimistic update to the cache
            if (selectedYear) {
                const cacheKey = `/enrollments?className=${className}&yearId=${selectedYear.id}`;
                await db.saveData(cacheKey, updatedEnrollments);
            }
            
            addNotification({ type: 'success', message: 'Fiche financière mise à jour et en attente de synchronisation.' });
            resetForm();
        } else {
            // Online success, data is fresh from server
            addNotification({ type: 'success', message: 'Fiche financière mise à jour.' });
            resetForm();
            await fetchEnrollments();
        }
    } catch (error) {
        if (error instanceof Error) addNotification({ type: 'error', message: error.message });
    }
  }, [editingEnrollment, formState, resetForm, fetchEnrollments, addNotification, enrollments, selectedYear, className]);

  const handleEdit = useCallback((enrollment: Enrollment) => {
    setEditingEnrollment(enrollment);
    setFormState(JSON.parse(JSON.stringify(enrollment))); // Deep copy
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleToggleGradesAccess = async (enrollmentId: number, enabled: boolean) => {
    setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, grades_access_enabled: enabled } : e));
    try {
        await apiFetch(`/enrollments/${enrollmentId}/toggle-grades-access`, {
            method: 'PUT',
            body: JSON.stringify({ enabled }),
        });
        addNotification({ type: 'success', message: `Accès aux notes ${enabled ? 'activé' : 'restreint'}.` });
    } catch (error) {
        if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        fetchEnrollments();
    }
  };

  const handleBulkToggleGradesAccess = async () => {
    if (!bulkAction || !selectedYear || !className) return;
    const enabled = bulkAction.type === 'enable';
    try {
        await apiFetch(`/classes/${className}/toggle-grades-access`, {
            method: 'PUT',
            body: JSON.stringify({ yearId: selectedYear.id, enabled }),
        });
        addNotification({ type: 'success', message: `Accès aux notes ${enabled ? 'activé' : 'restreint'} pour toute la classe.` });
        fetchEnrollments();
    } catch (error) {
        if (error instanceof Error) addNotification({ type: 'error', message: error.message });
    } finally {
        setBulkAction(null);
    }
  };

  const handleSort = (key: 'nom' | 'prenom') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedEnrollments = useMemo(() => {
    let processableEnrollments = [...enrollments];
    processableEnrollments.sort((a, b) => {
        const valA = a.student?.[sortConfig.key]?.toLowerCase() || '';
        const valB = b.student?.[sortConfig.key]?.toLowerCase() || '';
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });
    if (searchTerm) {
        return processableEnrollments.filter(enrollment =>
            `${enrollment.student?.prenom} ${enrollment.student?.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    return processableEnrollments;
  }, [enrollments, searchTerm, sortConfig]);

  const renderContent = () => {
    if (isYearLoading) return <div className="text-center text-slate-500 py-10 col-span-full">Chargement de l'année scolaire...</div>;
    if (yearError) return <ErrorDisplay message={yearError} />;
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
               {editingEnrollment && formState ? (
                 <PaymentForm 
                    formState={formState} 
                    onPaymentChange={handlePaymentChange}
                    onAddPayment={handleAddPayment}
                    onRemovePayment={handleRemovePayment}
                    onAdjustmentChange={handleAdjustmentChange}
                    onAddAdjustment={handleAddAdjustment}
                    onRemoveAdjustment={handleRemoveAdjustment}
                    onSubmit={handleSubmit} 
                    onCancel={resetForm} 
                 />
               ) : (
                <div className="bg-white p-6 rounded-xl shadow-lg sticky top-24 text-center h-full flex flex-col justify-center items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                    <h3 className="text-lg font-semibold text-slate-700">Modifier la Fiche Financière</h3>
                    <p className="text-sm text-slate-500 mt-1">Cliquez sur l'icône de modification d'un élève dans la liste pour modifier sa fiche.</p>
                </div>
               )}
            </div>
            <div className="lg:col-span-3">
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-2xl font-bold text-slate-800 font-display">Liste des Élèves Inscrits</h2>
                        <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
                            <div className="relative flex-grow sm:flex-grow-0"><input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg"/><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg></div>
                            <div className="flex gap-2"><button onClick={() => setBulkAction({ type: 'disable' })} className="px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-lg">Restreindre Tout</button><button onClick={() => setBulkAction({ type: 'enable' })} className="px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg">Activer Tout</button></div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                              <th className="px-2 py-3"></th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nom</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Prénom</th>
                              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Accès Notes</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">MPPA Ajusté</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total Versé</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Balance</th>
                              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {isLoading ? (
                                <tr><td colSpan={8} className="text-center py-10">Chargement...</td></tr>
                            ) : filteredAndSortedEnrollments.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-10">{searchTerm ? "Aucun élève trouvé." : "Aucun élève inscrit."}</td></tr>
                            ) : filteredAndSortedEnrollments.map((enrollment) => {
                                const totalPaid = enrollment.payments.reduce((acc, p) => acc + Number(p.amount), 0);
                                const totalAdjustments = enrollment.adjustments.reduce((acc, adj) => acc + Number(adj.amount), 0);
                                const adjustedMppa = Number(enrollment.mppa) + totalAdjustments;
                                const balance = adjustedMppa - totalPaid;
                                const hasScholarship = enrollment.adjustments.some(adj => adj.amount < 0);

                                return (
                                    <tr key={enrollment.id} className={`hover:bg-blue-50 ${editingEnrollment?.id === enrollment.id ? 'bg-blue-100' : ''} even:bg-gray-50`}>
                                      <td className="px-2 py-4 text-center">
                                          <button onClick={() => handleEdit(enrollment)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 rounded-full transition-colors" title="Modifier la fiche financière">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                              </svg>
                                          </button>
                                      </td>
                                      <td className="px-6 py-4 font-medium flex items-center">
                                          {hasScholarship && <span className="mr-2" title="Cet élève bénéficie d'une bourse ou réduction">🎓</span>}
                                          {enrollment.student?.nom}
                                      </td>
                                      <td className="px-6 py-4 text-slate-600">{enrollment.student?.prenom}</td>
                                      <td className="px-6 py-4 text-center"><ToggleSwitch enabled={enrollment.grades_access_enabled} onChange={(enabled) => handleToggleGradesAccess(enrollment.id, enabled)} /></td>
                                      <td className="px-6 py-4 text-right">{formatCurrency(adjustedMppa)}</td>
                                      <td className="px-6 py-4 font-semibold text-right">{formatCurrency(totalPaid)}</td>
                                      <td className={`px-6 py-4 font-bold text-right ${balance > 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(balance)}</td>
                                      <td className="px-6 py-4 text-center">
                                          <div className="flex items-center justify-center gap-1">
                                             <button onClick={() => handleOpenDetails(enrollment)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 rounded-full transition-colors" title="Détails Financiers">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C3.732 4.943 7.523 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-7.03 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                            </button>
                                            <button onClick={() => handleOpenGradebook(enrollment)} className="px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200">Notes</button>
                                          </div>
                                      </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto">
       <header className="mb-8">
          <ReactRouterDOM.Link to="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 group font-medium"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>Retour à l'accueil</ReactRouterDOM.Link>
          <h1 className="text-4xl font-bold text-gray-800 font-display">Classe : {className}</h1>
          <p className="text-lg text-slate-500 mt-2">Gestion financière pour l'année {selectedYear?.name}</p>
      </header>
      
      {renderContent()}

      {gradebookEnrollment && selectedYear && (
          <GradebookModal isOpen={!!gradebookEnrollment} onClose={() => setGradebookEnrollment(null)} enrollment={gradebookEnrollment} year={selectedYear} instanceInfo={instanceInfo} />
      )}
      
      {bulkAction && (
          <ConfirmationModal isOpen={!!bulkAction} onClose={() => setBulkAction(null)} onConfirm={handleBulkToggleGradesAccess} title={`Action en Masse - ${className}`} message={`Êtes-vous sûr de vouloir ${bulkAction.type === 'enable' ? 'activer' : 'restreindre'} l'accès aux notes pour TOUS les élèves de cette classe ?`} />
      )}

      <PaymentDetailModal
        isOpen={!!detailsEnrollment}
        onClose={() => setDetailsEnrollment(null)}
        enrollment={detailsEnrollment}
        instanceInfo={instanceInfo}
      />
    </div>
  );
};

export default ClassPage;