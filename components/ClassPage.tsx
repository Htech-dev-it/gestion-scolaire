import React, { useState, useCallback, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import type { Enrollment, Payment, Instance, StudentProfile, SchoolYear } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import Tooltip from './Tooltip';
import GradebookModal from './GradebookModal';
import ConfirmationModal from './ConfirmationModal';

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

const PaymentForm: React.FC<{
    formState: Enrollment;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    instanceInfo: Instance | null;
}> = ({ formState, onChange, onSubmit, onCancel, instanceInfo }) => {

    const totalPaid = useMemo(() => formState.payments.reduce((acc, p) => acc + Number(p.amount), 0), [formState.payments]);
    const balance = useMemo(() => Number(formState.mppa) - totalPaid, [formState.mppa, totalPaid]);
    const { selectedYear } = useSchoolYear();
    const { addNotification } = useNotification();

    const handlePrintReceipt = () => {
        if (!instanceInfo || !formState.student) return;

        const paymentsMade = formState.payments
            .map((p, i) => ({ ...p, installment: i + 1 }))
            .filter(p => Number(p.amount) > 0);

        const printContent = `
            <html>
                <head>
                    <title>Reçu de Paiement</title>
                    <style>
                        @page {
                            size: 80mm auto;
                            margin: 0;
                        }
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        body {
                            font-family: 'Courier New', Courier, monospace;
                            font-size: 9pt;
                            line-height: 1.2;
                            color: #000;
                            background: white;
                            width: 80mm;
                            padding: 3mm;
                        }
                        .receipt-container {
                            width: 100%;
                            max-width: 74mm;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 6mm;
                            border-bottom: 1px solid #000;
                            padding-bottom: 3mm;
                        }
                        .header h1 {
                            font-size: 11pt;
                            font-weight: bold;
                            margin-bottom: 2mm;
                            text-transform: uppercase;
                        }
                        .header p {
                            font-size: 8pt;
                            margin: 1mm 0;
                        }
                        .info {
                            margin-bottom: 4mm;
                            font-size: 8pt;
                        }
                        .info-row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 1mm;
                            word-wrap: break-word;
                        }
                        .info-row .label {
                            font-weight: bold;
                            min-width: 35%;
                        }
                        .info-row .value {
                            text-align: right;
                            max-width: 65%;
                        }
                        .separator {
                            border-top: 1px dashed #000;
                            margin: 3mm 0;
                        }
                        .payments-section {
                            margin-bottom: 4mm;
                        }
                        .payments-header {
                            font-size: 9pt;
                            font-weight: bold;
                            margin-bottom: 2mm;
                            text-align: center;
                            text-transform: uppercase;
                        }
                        .payment-row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 1mm;
                            font-size: 8pt;
                        }
                        .payment-row .description {
                            flex: 1;
                        }
                        .payment-row .amount {
                            text-align: right;
                            font-weight: bold;
                            min-width: 25%;
                        }
                        .totals {
                            margin-top: 4mm;
                            border-top: 1px solid #000;
                            padding-top: 3mm;
                            font-size: 9pt;
                        }
                        .total-row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 1mm;
                        }
                        .total-row.final {
                            font-size: 11pt;
                            font-weight: bold;
                            border-top: 1px solid #000;
                            padding-top: 2mm;
                            margin-top: 2mm;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 6mm;
                            font-size: 8pt;
                            border-top: 1px dashed #000;
                            padding-top: 3mm;
                        }
                        .footer p {
                            margin: 1mm 0;
                        }
                        .date-time {
                            font-size: 7pt;
                            text-align: center;
                            margin-bottom: 2mm;
                        }
                        
                        /* Styles spécifiques pour Epson T20 */
                        @media print {
                            body { 
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            .receipt-container {
                                page-break-inside: avoid;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">
                        <div class="header">
                            <h1>${instanceInfo.name}</h1>
                            ${instanceInfo.address ? `<p>${instanceInfo.address}</p>` : ''}
                            ${instanceInfo.phone ? `<p>Tel: ${instanceInfo.phone}</p>` : ''}
                        </div>
                        
                        <div class="date-time">
                            ${new Date().toLocaleDateString('fr-FR', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })} - ${new Date().toLocaleTimeString('fr-FR')}
                        </div>
                        
                        <div class="info">
                            <div class="info-row">
                                <span class="label">Etudiant:</span>
                                <span class="value">${formState.student.prenom} ${formState.student.nom}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Classe:</span>
                                <span class="value">${formState.className}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Année:</span>
                                <span class="value">${selectedYear?.name || 'N/A'}</span>
                            </div>
                        </div>
                        
                        <div class="separator"></div>
                        
                        <div class="payments-section">
                            <div class="payments-header">Détails des Paiements</div>
                            ${paymentsMade.length > 0 ? paymentsMade.map(p => `
                                <div class="payment-row">
                                    <span class="description">Versement #${p.installment}</span>
                                    <span class="amount">${Number(p.amount).toFixed(2)}$</span>
                                </div>
                            `).join('') : '<div class="payment-row"><span class="description">Aucun versement enregistré</span><span class="amount">0.00$</span></div>'}
                        </div>
                        
                        <div class="totals">
                            <div class="total-row">
                                <span>Montant Total (MPPA):</span>
                                <span>${Number(formState.mppa).toFixed(2)}$</span>
                            </div>
                            <div class="total-row">
                                <span>Total Versé:</span>
                                <span>${totalPaid.toFixed(2)}$</span>
                            </div>
                            <div class="total-row final">
                                <span>BALANCE:</span>
                                <span>${balance.toFixed(2)}$</span>
                            </div>
                        </div>
                        
                        <div class="footer">
                            <p>***** REÇU DE PAIEMENT *****</p>
                            <p>Merci de votre confiance</p>
                            <p>Conservez ce reçu</p>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=300,height=600');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            
            // Attendre que le contenu soit chargé avant d'imprimer
            printWindow.onload = function() {
                setTimeout(() => {
                    printWindow.print();
                    // Fermer la fenêtre après impression (optionnel)
                    printWindow.onafterprint = function() {
                        printWindow.close();
                    };
                }, 500);
            };
        } else {
            addNotification({ type: 'warning', message: 'Veuillez autoriser les pop-ups pour imprimer le reçu.' });
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg sticky top-24">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 font-display">Fiche de Paiement</h2>
                    <p className="text-lg font-semibold text-slate-700">{formState.student?.prenom} {formState.student?.nom}</p>
                    <p className="text-sm text-slate-500">Année: {selectedYear?.name}</p>
                </div>
                <Tooltip text="Imprimer le reçu">
                    <button onClick={handlePrintReceipt} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    </button>
                </Tooltip>
            </div>
             <form onSubmit={onSubmit} className="space-y-4">
                <fieldset>
                    <legend className="text-base font-semibold text-slate-500 mb-2 -ml-1">Montant à Payer (MPPA)</legend>
                    <input
                        type="number"
                        name="mppa"
                        value={formState.mppa || ''}
                        onChange={onChange}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
                    />
                </fieldset>
                <fieldset>
                    <legend className="text-base font-semibold text-slate-500 mb-2 -ml-1">Versements</legend>
                    {formState.payments.map((payment, index) => (
                        <div key={index} className="flex items-center space-x-4 mb-2">
                            <label htmlFor={`payments.${index}`} className="w-24 text-sm font-medium text-slate-700">Versement {index + 1}</label>
                            <input
                                type="number"
                                id={`payments.${index}`}
                                name={`payments.${index}`}
                                value={payment.amount || ''}
                                onChange={onChange}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
                            />
                        </div>
                    ))}
                </fieldset>
                
                <div className="border-t border-slate-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Total Versé:</span><span className="font-semibold text-green-600">{totalPaid.toFixed(2)}$</span></div>
                    <div className="flex justify-between text-lg"><span className="font-bold text-slate-700">Balance:</span><span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-700'}`}>{balance.toFixed(2)}$</span></div>
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
  
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);
  const [formState, setFormState] = useState<Enrollment | null>(null);
  const [instanceInfo, setInstanceInfo] = useState<Instance | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: 'nom' | 'prenom'; direction: 'ascending' | 'descending' }>({ key: 'nom', direction: 'ascending' });
  const [gradebookEnrollment, setGradebookEnrollment] = useState<Enrollment | null>(null);
  const [bulkAction, setBulkAction] = useState<{ type: 'enable' | 'disable' } | null>(null);

  const fetchEnrollments = useCallback(async () => {
    if (!className || !selectedYear) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
        const data = await apiFetch(`/enrollments?className=${className}&yearId=${selectedYear.id}`);
        const enrollmentsWithStudent = data.map((e: any) => ({
            ...e,
            student: {
                id: e.student_id,
                nom: e.nom,
                prenom: e.prenom,
                date_of_birth: e.date_of_birth,
                address: e.address,
                photo_url: e.photo_url,
                tutor_name: e.tutor_name,
                tutor_phone: e.tutor_phone,
                tutor_email: e.tutor_email,
                medical_notes: e.medical_notes
            } as StudentProfile
        }));
        setEnrollments(enrollmentsWithStudent);
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

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormState(prevState => {
        if (!prevState) return null;
        if (name.startsWith('payments.')) {
            const index = parseInt(name.split('.')[1], 10);
            const newPayments = [...prevState.payments] as [Payment, Payment, Payment, Payment];
            const oldAmount = newPayments[index].amount;
            const newAmount = parseFloat(value) || 0;
            newPayments[index] = { amount: newAmount, date: newAmount > 0 && oldAmount === 0 ? new Date().toISOString() : (newAmount === 0 ? null : newPayments[index].date) };
            return { ...prevState, payments: newPayments };
        }
        if (name === 'mppa') {
            return { ...prevState, mppa: Number(value) };
        }
        return prevState;
    });
  }, []);

  const resetForm = useCallback(() => setEditingEnrollment(null), []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnrollment || !formState) return;
    try {
      await apiFetch(`/enrollments/${editingEnrollment.id}/payments`, {
          method: 'PUT',
          body: JSON.stringify({ payments: formState.payments, mppa: formState.mppa }),
      });
      addNotification({ type: 'success', message: 'Paiements mis à jour.' });
      resetForm();
      await fetchEnrollments();
    } catch (error) {
        if (error instanceof Error) addNotification({ type: 'error', message: error.message });
    }
  }, [editingEnrollment, formState, resetForm, fetchEnrollments, addNotification]);

  const handleEdit = useCallback((enrollment: Enrollment) => {
    setEditingEnrollment(enrollment);
    setFormState(JSON.parse(JSON.stringify(enrollment))); // Deep copy
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleToggleGradesAccess = async (enrollmentId: number, enabled: boolean) => {
    // Optimistic UI update
    setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, grades_access_enabled: enabled } : e));

    try {
        await apiFetch(`/enrollments/${enrollmentId}/toggle-grades-access`, {
            method: 'PUT',
            body: JSON.stringify({ enabled }),
        });
        addNotification({ type: 'success', message: `Accès aux notes ${enabled ? 'activé' : 'restreint'}.` });
    } catch (error) {
        if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        // Revert UI on error
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


  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    // Adjust for timezone offset to display the correct date from ISO string
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('fr-FR', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit'
    });
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

    // Sorting
    processableEnrollments.sort((a, b) => {
        const valA = a.student?.[sortConfig.key]?.toLowerCase() || '';
        const valB = b.student?.[sortConfig.key]?.toLowerCase() || '';
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });

    // Filtering
    if (searchTerm) {
        return processableEnrollments.filter(enrollment =>
            `${enrollment.student?.prenom} ${enrollment.student?.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    return processableEnrollments;
  }, [enrollments, searchTerm, sortConfig]);

  const handlePrintList = () => {
    if (!instanceInfo) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        addNotification({ type: 'warning', message: 'Veuillez autoriser les pop-ups pour imprimer la liste.' });
        return;
    }

    const tableRows = filteredAndSortedEnrollments.map(enrollment => {
        const total = enrollment.payments.reduce((acc, p) => acc + Number(p.amount), 0);
        const balance = Number(enrollment.mppa) - total;
        return `
            <tr>
                <td>${enrollment.student?.nom || ''}</td>
                <td>${enrollment.student?.prenom || ''}</td>
                <td class="text-right">${Number(enrollment.mppa).toFixed(2)}$</td>
                <td class="text-right">${Number(enrollment.payments[0].amount).toFixed(2)}$</td>
                <td class="text-right">${Number(enrollment.payments[1].amount).toFixed(2)}$</td>
                <td class="text-right">${Number(enrollment.payments[2].amount).toFixed(2)}$</td>
                <td class="text-right">${Number(enrollment.payments[3].amount).toFixed(2)}$</td>
                <td class="text-right">${total.toFixed(2)}$</td>
                <td class="text-right">${balance.toFixed(2)}$</td>
            </tr>
        `;
    }).join('');

    const printContent = `
        <html>
            <head>
                <title>Liste des Élèves - Classe ${className}</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .header h1, .header h2 { margin: 0; }
                    .header p { margin: 2px 0; font-size: 10pt; }
                    table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 20px; }
                    th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .text-right { text-align: right; }
                    @media print {
                        @page { size: landscape; margin: 0.75in; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${instanceInfo.name}</h1>
                    <p>${instanceInfo.address || ''}</p>
                    <h2>Liste des Paiements - Classe: ${className} - Année: ${selectedYear?.name}</h2>
                    <p>Date d'impression: ${new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Prénom</th>
                            <th class="text-right">MPPA</th>
                            <th class="text-right">V1</th>
                            <th class="text-right">V2</th>
                            <th class="text-right">V3</th>
                            <th class="text-right">V4</th>
                            <th class="text-right">Total Versé</th>
                            <th class="text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
  };

  const SortIndicator: React.FC<{ direction: 'ascending' | 'descending' }> = ({ direction }) => (
    <svg className="h-4 w-4 ml-1 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {direction === 'ascending' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />}
    </svg>
  );

  const SortPlaceholder = () => (
     <svg className="h-4 w-4 ml-1 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
  );

  const renderContent = () => {
    if (isYearLoading) {
      return <div className="text-center text-slate-500 py-10 col-span-full">Chargement de l'année scolaire...</div>;
    }
    if (yearError) {
      return <ErrorDisplay message={yearError} />;
    }
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
               {editingEnrollment && formState ? (
                 <PaymentForm formState={formState} onChange={handleFormChange} onSubmit={handleSubmit} onCancel={resetForm} instanceInfo={instanceInfo} />
               ) : (
                <div className="bg-white p-6 rounded-xl shadow-lg sticky top-24 text-center h-full flex flex-col justify-center items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                    <h3 className="text-lg font-semibold text-slate-700">Modifier les Paiements</h3>
                    <p className="text-sm text-slate-500 mt-1">Double-cliquez sur un élève dans la liste pour modifier sa fiche de paiement.</p>
                </div>
               )}
            </div>
            <div className="lg:col-span-3">
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-2xl font-bold text-slate-800 font-display">Liste des Élèves Inscrits</h2>
                        <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
                            <div className="relative flex-grow sm:flex-grow-0">
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setBulkAction({ type: 'disable' })} className="px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700">Restreindre Tout</button>
                                <button onClick={() => setBulkAction({ type: 'enable' })} className="px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700">Activer Tout</button>
                                <button onClick={handlePrintList} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 whitespace-nowrap">Imprimer</button>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                 <button onClick={() => handleSort('nom')} className="group inline-flex items-center">Nom {sortConfig.key === 'nom' ? <SortIndicator direction={sortConfig.direction} /> : <SortPlaceholder />}</button>
                              </th>
                               <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                 <button onClick={() => handleSort('prenom')} className="group inline-flex items-center">Prénom {sortConfig.key === 'prenom' ? <SortIndicator direction={sortConfig.direction} /> : <SortPlaceholder />}</button>
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Accès aux Notes</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">MPPA</th>
                              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">V1</th>
                              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">V2</th>
                              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">V3</th>
                              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">V4</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Versé</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {isLoading ? (
                                <tr><td colSpan={11} className="text-center py-10 text-slate-500">Chargement...</td></tr>
                            ) : filteredAndSortedEnrollments.length === 0 ? (
                                <tr><td colSpan={11} className="text-center py-10 text-slate-500">{searchTerm ? "Aucun élève ne correspond à votre recherche." : "Aucun élève inscrit dans cette classe."}</td></tr>
                            ) : filteredAndSortedEnrollments.map((enrollment) => {
                                const total = enrollment.payments.reduce((acc, p) => acc + Number(p.amount), 0);
                                const balance = Number(enrollment.mppa) - total;
                                return (
                                    <tr key={enrollment.id} onDoubleClick={() => handleEdit(enrollment)} className={`hover:bg-blue-50 transition-colors duration-200 cursor-pointer ${editingEnrollment?.id === enrollment.id ? 'bg-blue-100' : ''} even:bg-gray-50`}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{enrollment.student?.nom}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{enrollment.student?.prenom}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-center"><ToggleSwitch enabled={enrollment.grades_access_enabled} onChange={(enabled) => handleToggleGradesAccess(enrollment.id, enabled)} /></td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">{Number(enrollment.mppa).toFixed(2)}$</td>
                                      {enrollment.payments.map((p, i) => (
                                        <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">
                                            <Tooltip text={`Date: ${formatDate(p.date)}`}>
                                                <span className={Number(p.amount) > 0 ? 'text-green-600 font-semibold' : ''}>{Number(p.amount).toFixed(2)}$</span>
                                            </Tooltip>
                                        </td>
                                      ))}
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800 text-right">{total.toFixed(2)}$</td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${balance > 0 ? 'text-red-600' : 'text-green-700'}`}>{balance.toFixed(2)}$</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                          <button onClick={() => handleOpenGradebook(enrollment)} className="px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200 transition">
                                              Notes
                                          </button>
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
          <ReactRouterDOM.Link to="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
            Retour à l'accueil
          </ReactRouterDOM.Link>
          <h1 className="text-4xl font-bold text-gray-800 font-display">Classe : {className}</h1>
          <p className="text-lg text-slate-500 mt-2">Gestion des paiements pour l'année {selectedYear?.name}</p>
      </header>
      
      {renderContent()}

      {gradebookEnrollment && selectedYear && (
          <GradebookModal
              isOpen={!!gradebookEnrollment}
              onClose={() => setGradebookEnrollment(null)}
              enrollment={gradebookEnrollment}
              year={selectedYear}
              instanceInfo={instanceInfo}
          />
      )}
      
      {bulkAction && (
          <ConfirmationModal
              isOpen={!!bulkAction}
              onClose={() => setBulkAction(null)}
              onConfirm={handleBulkToggleGradesAccess}
              title={`Action en Masse - ${className}`}
              message={`Êtes-vous sûr de vouloir ${bulkAction.type === 'enable' ? 'activer' : 'restreindre'} l'accès aux notes pour TOUS les élèves de cette classe ?`}
          />
      )}

    </div>
  );
};

export default ClassPage;