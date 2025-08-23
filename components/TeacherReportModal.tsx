import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Enrollment, Grade, SchoolYear, Instance, AcademicPeriod } from '../types';
import { apiFetch } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import ConfirmationModal from './ConfirmationModal';

// --- Reusable Sub-components ---

const GradeRow: React.FC<{
    grade: Grade;
    onUpdate: (id: number, data: Partial<Grade>) => void;
    onDeleteRequest: (grade: Grade) => void;
}> = ({ grade, onUpdate, onDeleteRequest }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ evaluation_name: grade.evaluation_name, score: grade.score, max_score: grade.max_score });

    const handleUpdate = () => {
        if (form.score > form.max_score) {
            alert("La note ne peut pas être supérieure à la note maximale.");
            return;
        }
        onUpdate(grade.id, form);
        setIsEditing(false);
    };

    return isEditing ? (
        <tr className="bg-blue-50">
            <td className="p-2"><input type="text" value={form.evaluation_name} onChange={e => setForm({...form, evaluation_name: e.target.value})} className="w-full p-1 border rounded" /></td>
            <td className="p-2"><input type="number" value={form.score || ''} onChange={e => setForm({...form, score: Number(e.target.value)})} className="w-16 p-1 border rounded" /></td>
            <td className="p-2"><input type="number" value={form.max_score || ''} onChange={e => setForm({...form, max_score: Number(e.target.value)})} className="w-16 p-1 border rounded" /></td>
            <td className="p-2 text-right">
                <button onClick={handleUpdate} className="text-green-600 hover:text-green-800 text-xs font-semibold">Sauver</button>
                <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-slate-700 text-xs ml-2">Annuler</button>
            </td>
        </tr>
    ) : (
        <tr>
            <td className="p-2 font-medium">{grade.evaluation_name}</td>
            <td className="p-2 text-center">{grade.score}</td>
            <td className="p-2 text-center">{grade.max_score}</td>
            <td className="p-2 text-right">
                <button onClick={() => setIsEditing(true)} className="text-blue-600 hover:text-blue-800 text-xs">Modifier</button>
                <button onClick={() => onDeleteRequest(grade)} className="text-red-600 hover:text-red-800 text-xs ml-2">Supprimer</button>
            </td>
        </tr>
    );
};

// --- Main Modal Component ---

interface TeacherReportModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    initialEnrollment: Enrollment;
    classRoster: Enrollment[];
    year: SchoolYear; 
    schoolInfo: Instance | null;
    subjectId: number;
    subjectName: string;
    className: string;
}

interface SubjectDetails {
    maxGrade: number;
    gradesByEnrollment: Record<number, Grade[]>;
    appreciationsByEnrollment: Record<number, string>;
}

const TeacherReportModal: React.FC<TeacherReportModalProps> = ({ isOpen, onClose, initialEnrollment, classRoster, year, schoolInfo, subjectId, subjectName, className }) => {
    const { addNotification } = useNotification();
    const [academicPeriods, setAcademicPeriods] = useState<AcademicPeriod[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod | null>(null);
    const [subjectDetails, setSubjectDetails] = useState<SubjectDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);
    const [addForm, setAddForm] = useState({ evaluation_name: '', score: 0, max_score: 20 });
    const [currentEnrollment, setCurrentEnrollment] = useState<Enrollment>(initialEnrollment);
    const [appreciations, setAppreciations] = useState<Record<number, string>>({}); // Record<enrollmentId, appreciationText>
    const appreciationSaveTimeout = useRef<number | null>(null);
    const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
    const printMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (printMenuRef.current && !printMenuRef.current.contains(event.target as Node)) {
                setIsPrintMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    
    const getAppreciationText = (avg: number) => {
        if (avg >= 90) return 'Excellent travail.'; if (avg >= 80) return 'Très bon travail.'; if (avg >= 70) return 'Bon travail.';
        if (avg >= 60) return 'Travail satisfaisant.'; if (avg >= 50) return 'Passable.'; return 'Efforts à fournir.';
    };

    const fetchAllData = useCallback(async () => {
        if (!isOpen || !selectedPeriod) {
            setIsLoading(false);
            return;
        };
        setIsLoading(true);
        try {
            const data: SubjectDetails = await apiFetch(`/teacher/subject-details?yearId=${year.id}&className=${className}&subjectId=${subjectId}&periodId=${selectedPeriod.id}`);
            setSubjectDetails(data);
            
            const initialAppreciations: Record<number, string> = {};
            classRoster.forEach(en => {
                const savedAppreciation = data.appreciationsByEnrollment?.[en.id];
                if (savedAppreciation) {
                    initialAppreciations[en.id] = savedAppreciation;
                } else {
                    const grades = data.gradesByEnrollment[en.id] || [];
                    const totalScore = grades.reduce((sum, g) => sum + Number(g.score), 0);
                    const totalMaxScore = grades.reduce((sum, g) => sum + Number(g.max_score), 0);
                    const average = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
                    initialAppreciations[en.id] = getAppreciationText(average);
                }
            });
            setAppreciations(initialAppreciations);

        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [isOpen, selectedPeriod, year.id, className, subjectId, addNotification, classRoster]);

    useEffect(() => {
        const fetchInitialPeriods = async () => {
            if (!isOpen) return;
            try {
                const periodsData = await apiFetch(`/academic-periods?yearId=${year.id}`);
                setAcademicPeriods(periodsData);
                if (periodsData.length > 0) {
                    setSelectedPeriod(periodsData[0]);
                }
            } catch (error) {
                if (error instanceof Error) addNotification({ type: 'error', message: error.message });
            }
        };
        fetchInitialPeriods();
    }, [isOpen, year.id, addNotification]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleAppreciationChange = (enrollmentId: number, text: string) => {
        setAppreciations(prev => ({ ...prev, [enrollmentId]: text }));

        if (appreciationSaveTimeout.current) {
            clearTimeout(appreciationSaveTimeout.current);
        }
        
        const periodIdForSave = selectedPeriod?.id;
        if (!periodIdForSave) return;

        appreciationSaveTimeout.current = window.setTimeout(() => {
            apiFetch('/appreciations', {
                method: 'POST',
                body: JSON.stringify({
                    enrollment_id: enrollmentId,
                    subject_id: subjectId,
                    period_id: periodIdForSave,
                    text: text
                })
            }).then(() => {
                setSubjectDetails(prevDetails => {
                    if (!prevDetails) return null;
                    
                    const currentPeriodId = selectedPeriod?.id;
                    if (currentPeriodId !== periodIdForSave) {
                        return prevDetails;
                    }
                    
                    const newAppreciationsByEnrollment = {
                        ...prevDetails.appreciationsByEnrollment,
                        [enrollmentId]: text,
                    };
                    return {
                        ...prevDetails,
                        appreciationsByEnrollment: newAppreciationsByEnrollment,
                    };
                });
            }).catch(err => {
                addNotification({ type: 'error', message: `Sauvegarde échouée: ${err.message}` });
            });
        }, 1500);
    };

    const handleAddGrade = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addForm.evaluation_name.trim() || !selectedPeriod) return;
        try {
            await apiFetch('/grades', {
                method: 'POST',
                body: JSON.stringify({ ...addForm, subject_id: subjectId, enrollment_id: currentEnrollment.id, period_id: selectedPeriod.id }),
            });
            addNotification({ type: 'success', message: 'Note ajoutée.' });
            setAddForm({ evaluation_name: '', score: 0, max_score: 20 });
            fetchAllData(); // Refetch all data for the class
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleUpdateGrade = async (id: number, data: Partial<Grade>) => {
        try {
            await apiFetch(`/grades/${id}`, { method: 'PUT', body: JSON.stringify(data) });
            addNotification({ type: 'success', message: 'Note mise à jour.' });
            fetchAllData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleConfirmDelete = async () => {
        if (!gradeToDelete) return;
        try {
            await apiFetch(`/grades/${gradeToDelete.id}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: 'Note supprimée.' });
            setGradeToDelete(null);
            fetchAllData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const generateReportHtml = (enrollment: Enrollment) => {
        const grades = subjectDetails?.gradesByEnrollment[enrollment.id] || [];
        const totalScore = grades.reduce((sum, g) => sum + Number(g.score), 0);
        const totalMaxScore = grades.reduce((sum, g) => sum + Number(g.max_score), 0);
        const average = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
        const appreciation = appreciations[enrollment.id] || '';
        return `
            <div class="report-page">
                <div class="text-center mb-4 border-b-2 border-gray-800 pb-2">
                    ${schoolInfo?.logo_url ? `<img src="${schoolInfo.logo_url}" alt="Logo" class="h-16 mx-auto mb-2" />` : ''}
                    <h1 class="text-xl font-bold font-display">${schoolInfo?.name || ''}</h1>
                     <p class="text-xs text-slate-600">${schoolInfo?.address || ''}</p>
                     <p class="text-xs text-slate-600">${schoolInfo?.phone || ''} | ${schoolInfo?.email || ''}</p>
                </div>
                <h2 class="text-center text-lg font-semibold my-2 font-display uppercase">RAPPORT DE NOTES : ${subjectName} - ${selectedPeriod?.name}</h2>
                <div class="grid grid-cols-2 gap-x-4 text-sm bg-gray-50 p-3 rounded-lg border my-2">
                    <p><strong>Élève:</strong> ${enrollment.student?.prenom} ${enrollment.student?.nom}</p>
                    <p><strong>Classe:</strong> ${enrollment.className}</p>
                    <p><strong>Année Scolaire:</strong> ${year.name}</p>
                </div>
                <table class="w-full text-sm my-4">
                    <thead class="border-b-2 border-slate-300"><tr><th class="p-1 text-left font-semibold">Évaluation</th><th class="p-1 w-20 text-center font-semibold">Note</th><th class="p-1 w-20 text-center font-semibold">Sur</th></tr></thead>
                    <tbody>${grades.map(g => `<tr class="border-b border-slate-100"><td class="p-1">${g.evaluation_name}</td><td class="p-1 text-center font-mono">${g.score}</td><td class="p-1 text-center font-mono">${g.max_score}</td></tr>`).join('')}</tbody>
                </table>
                <div class="text-right font-bold text-lg mt-4">Note Finale: ${totalScore.toFixed(2)} / ${totalMaxScore.toFixed(2)} (${average.toFixed(2)}%)</div>
                <div class="mt-4">
                    <h4 class="font-semibold text-sm">Appréciation du Professeur</h4>
                    <div class="p-2 border rounded-md bg-slate-50 min-h-[50px] whitespace-pre-wrap">${appreciation}</div>
                </div>
                <div class="mt-8 pt-8 flex justify-end items-end text-xs text-center">
                    <div class="w-1/3"><div class="border-t border-gray-500 pt-1">Signature du Titulaire</div></div>
                </div>
            </div>
        `;
    };
    
    const printHtml = (htmlContent: string) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
            <html><head><title></title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
            <style>
                @page { 
                    size: letter portrait; 
                    margin: 10mm; /* Apply margin to all pages */
                }
                body { 
                    font-family: 'Roboto', sans-serif; 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important; 
                    margin: 0 !important; /* Remove body margin to let @page handle it */
                }
                h1, h2, h3, h4, .font-display { font-family: 'Montserrat', sans-serif; }
                .report-page { page-break-after: always; box-sizing: border-box; }
                .report-page:last-child { page-break-after: auto; }
            </style>
            </head><body>${htmlContent}</body></html>`);
        printWindow.document.close();
        
        // Use onload to ensure all styles are loaded before triggering print
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        };
    };

    const handleSinglePrint = () => {
        const singleReportHtml = generateReportHtml(currentEnrollment);
        printHtml(singleReportHtml);
    };

    const handleBulkPrint = () => {
        const allReportsHtml = classRoster.map(enrollment => generateReportHtml(enrollment)).join('');
        printHtml(allReportsHtml);
    };

    if (!isOpen) return null;
    
    const currentGrades = subjectDetails?.gradesByEnrollment[currentEnrollment.id] || [];
    const { totalScore, totalMaxScore, average } = useMemo(() => {
        const grades = subjectDetails?.gradesByEnrollment[currentEnrollment.id] || [];
        const score = grades.reduce((sum, g) => sum + Number(g.score), 0);
        const maxScore = grades.reduce((sum, g) => sum + Number(g.max_score), 0);
        const avg = maxScore > 0 ? (score / maxScore) * 100 : 0;
        return { totalScore: score, totalMaxScore: maxScore, average: avg };
    }, [subjectDetails, currentEnrollment]);

    const renderReportPreview = () => (
         <div>
            <div className="text-center mb-4 border-b-2 border-gray-800 pb-2">
                {schoolInfo?.logo_url && <img src={schoolInfo.logo_url} alt="Logo" className="h-16 mx-auto mb-2" />}
                <h1 className="text-xl font-bold font-display">{schoolInfo?.name}</h1>
                <p className="text-xs text-slate-600">{schoolInfo?.address}</p>
                <p className="text-xs text-slate-600">{schoolInfo?.phone} | {schoolInfo?.email}</p>
            </div>
            <h2 className="text-center text-lg font-semibold my-2 font-display uppercase">{`RAPPORT DE NOTES : ${subjectName} - ${selectedPeriod?.name}`}</h2>
            <div className="grid grid-cols-2 gap-x-4 text-sm bg-gray-50 p-3 rounded-lg border my-2">
                <p><strong>Élève:</strong> {currentEnrollment.student?.prenom} {currentEnrollment.student?.nom}</p>
                <p><strong>Classe:</strong> {currentEnrollment.className}</p>
                <p><strong>Année Scolaire:</strong> {year.name}</p>
            </div>
            <table className="w-full text-sm my-4">
                <thead className="border-b-2 border-slate-300"><tr><th className="p-1 text-left font-semibold">Évaluation</th><th className="p-1 w-20 text-center font-semibold">Note</th><th className="p-1 w-20 text-center font-semibold">Sur</th></tr></thead>
                <tbody>{currentGrades.map(g => (<tr key={g.id} className="border-b border-slate-100"><td className="p-1">{g.evaluation_name}</td><td className="p-1 text-center font-mono">{g.score}</td><td className="p-1 text-center font-mono">{g.max_score}</td></tr>))}</tbody>
            </table>
            <div className="text-right font-bold text-lg mt-4">{`Note Finale: ${totalScore.toFixed(2)} / ${totalMaxScore.toFixed(2)} (${average.toFixed(2)}%)`}</div>
            <div className="mt-4">
                <h4 className="font-semibold text-sm">Appréciation du Professeur</h4>
                <textarea 
                    value={appreciations[currentEnrollment.id] || ''} 
                    onChange={(e) => handleAppreciationChange(currentEnrollment.id, e.target.value)}
                    rows={2} 
                    className="w-full p-2 border rounded-md bg-slate-50 mt-1" 
                />
            </div>
            <div className="mt-8 pt-8 flex justify-end items-end text-xs text-center">
                <div className="w-1/3"><div className="border-t border-gray-500 pt-1">Signature du Titulaire</div></div>
            </div>
        </div>
    );
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div className="bg-slate-50 rounded-xl shadow-2xl p-6 w-full max-w-6xl mx-4 my-8 h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex-shrink-0 flex justify-between items-start mb-4 border-b pb-4">
                     <div>
                        <h2 className="text-2xl font-bold font-display">Gestion des Notes</h2>
                        <select
                            value={currentEnrollment.id}
                            onChange={(e) => setCurrentEnrollment(classRoster.find(r => r.id === Number(e.target.value))!)}
                            className="text-slate-600 font-semibold p-1 bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:outline-none focus:border-blue-500"
                        >
                            {classRoster.map(en => {
                                const grades = subjectDetails?.gradesByEnrollment[en.id] || [];
                                const totalMax = grades.reduce((sum, g) => sum + Number(g.max_score), 0);
                                const isComplete = subjectDetails?.maxGrade && totalMax >= subjectDetails.maxGrade;
                                return <option key={en.id} value={en.id}>{isComplete ? '✓ ' : ''}{en.student?.prenom} {en.student?.nom}</option>
                            })}
                        </select>
                        <p className="text-sm text-slate-500">{subjectName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {academicPeriods.length > 0 && <select value={selectedPeriod?.id || ''} onChange={e => setSelectedPeriod(academicPeriods.find(p => p.id === Number(e.target.value)) || null)} className="py-2 px-3 border rounded-md">{academicPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
                        
                        <div className="relative" ref={printMenuRef}>
                            <button
                                onClick={() => setIsPrintMenuOpen(prev => !prev)}
                                className="p-2 px-4 text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center gap-2"
                            >
                                Imprimer
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                            {isPrintMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                        <button
                                            onClick={() => { handleSinglePrint(); setIsPrintMenuOpen(false); }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            role="menuitem"
                                        >
                                            Imprimer pour cet élève
                                        </button>
                                        <button
                                            onClick={() => { handleBulkPrint(); setIsPrintMenuOpen(false); }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            role="menuitem"
                                        >
                                            Imprimer pour toute la classe
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                </div>
                
                 <div className="flex-grow overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col overflow-y-auto pr-2">
                        <h3 className="font-semibold mb-2">Saisie des notes</h3>
                        {isLoading ? <p>Chargement...</p> : currentGrades.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead><tr className="border-b"><th className="p-2 text-left">Évaluation</th><th className="p-2 text-center">Note</th><th className="p-2 text-center">Sur</th><th className="p-2 text-right">Actions</th></tr></thead>
                                <tbody>{currentGrades.map(grade => <GradeRow key={grade.id} grade={grade} onUpdate={handleUpdateGrade} onDeleteRequest={setGradeToDelete} />)}</tbody>
                            </table>
                        ) : <p className="text-center italic text-slate-500 py-4">Aucune note pour cet élève.</p>}
                        
                        <form onSubmit={handleAddGrade} className="mt-4 p-3 bg-white border rounded-md grid grid-cols-5 gap-3 items-end">
                            <div className="col-span-2"><label className="text-xs font-medium text-slate-600">Nom</label><input type="text" value={addForm.evaluation_name} onChange={e => setAddForm({...addForm, evaluation_name: e.target.value})} className="w-full p-2 border rounded-md text-sm" /></div>
                            <div><label className="text-xs font-medium text-slate-600">Note</label><input type="number" value={addForm.score || ''} onChange={e => setAddForm({...addForm, score: Number(e.target.value)})} className="w-full p-2 border rounded-md text-sm" /></div>
                            <div><label className="text-xs font-medium text-slate-600">Sur</label><input type="number" value={addForm.max_score || ''} onChange={e => setAddForm({...addForm, max_score: Number(e.target.value)})} className="w-full p-2 border rounded-md text-sm" /></div>
                            <button type="submit" className="col-span-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Ajouter</button>
                        </form>
                         {subjectDetails?.maxGrade && totalMaxScore >= subjectDetails.maxGrade && (
                            <div className="mt-2 text-center text-sm font-semibold text-green-600 bg-green-100 p-2 rounded-md">
                                ✓ Le total de {subjectDetails.maxGrade} points pour cette matière a été atteint.
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-lg shadow-inner p-4 overflow-y-auto">
                        <h3 className="font-semibold mb-2 text-center">Aperçu du Rapport</h3>
                        {selectedPeriod ? renderReportPreview() : <p className="text-center italic text-slate-500 py-10">Veuillez sélectionner une période.</p>}
                    </div>
                </div>

                {gradeToDelete && <ConfirmationModal isOpen={!!gradeToDelete} onClose={() => setGradeToDelete(null)} onConfirm={handleConfirmDelete} title="Confirmer la suppression" message={`Êtes-vous sûr de vouloir supprimer la note pour "${gradeToDelete.evaluation_name}" ?`} />}
            </div>
        </div>
    );
};

export default TeacherReportModal;