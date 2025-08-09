import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import type { Enrollment, Grade, SchoolYear, Instance, AcademicPeriod, ClassSubject } from '../types';
import { apiFetch } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import { CLASSES } from '../constants';
import GradebookModal from './GradebookModal';
import { useAuth } from '../auth/AuthContext';

type Template = 'moderne' | 'classique' | 'compact' | 'détaillé' | 'elegant' | 'annuel';

// --- Reusable Sub-components ---

const AppreciationTextarea: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; className?: string }> = ({ value, onChange, className }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value]);

    return <textarea ref={textareaRef} value={value} onChange={onChange} rows={1} className={`w-full p-1 bg-transparent focus:bg-yellow-100 rounded-sm resize-none overflow-hidden ${className}`} />;
};

const TemplateRenderer: React.FC<{ 
    template: string; 
    data: any; 
    onAppreciationChange: (subjectId: number, value: string) => void; 
    onGeneralAppreciationChange: (value: string) => void;
}> = ({ template, data, onAppreciationChange, onGeneralAppreciationChange }) => {
    
    const { schoolInfo, enrollment, selectedPeriod, year, subjectAverages, generalAverage, appreciations, gradesBySubject, generalAppreciation, formatDate, user } = data;

    const renderHeader = () => (
        <>
            <div className="text-center mb-4 border-b-2 border-gray-800 pb-2 print-header">
                {schoolInfo?.logo_url && <img src={schoolInfo.logo_url} alt="Logo" className="h-16 mx-auto mb-2" />}
                <h1 className="text-2xl font-bold font-display">{schoolInfo?.name}</h1>
                <p className="text-xs text-slate-600">{schoolInfo?.address}</p>
                <p className="text-xs text-slate-600">{schoolInfo?.phone} | {schoolInfo?.email}</p>
            </div>
            <h2 className="text-center text-xl font-semibold my-2 font-display uppercase print-title">Bulletin de Notes - {selectedPeriod?.name}</h2>
            <div className="grid grid-cols-2 gap-x-4 text-sm bg-gray-50 p-3 rounded-lg border my-2 print-header-info">
                <p><strong>Élève:</strong> {enrollment.student?.prenom} {enrollment.student?.nom}</p>
                <p><strong>Classe:</strong> {enrollment.className}</p>
                <p><strong>Date de Naissance:</strong> {formatDate(enrollment.student?.date_of_birth)}</p>
                <p><strong>Année Scolaire:</strong> {year.name}</p>
            </div>
        </>
    );

    const renderAnnualSummary = (showPromotionStatus: boolean = true) => {
        if (enrollment.annualAverage === undefined) return null;
        
        const statusColor = enrollment.promotionStatus === 'ADMIS(E) EN CLASSE SUPÉRIEURE' ? 'text-green-700' : 'text-red-700';

        return (
             <div className="mt-4 pt-4 border-t-2 border-slate-400">
                <h3 className="font-bold text-center text-base mb-2">RÉSUMÉ ANNUEL</h3>
                <div className={`grid ${showPromotionStatus ? 'grid-cols-2' : 'grid-cols-1 text-center'} gap-x-4 text-sm bg-slate-100 p-3 rounded-lg border`}>
                    <div>
                        <span className="font-semibold">Moyenne Générale Annuelle:</span>
                        <p className="font-bold text-lg">{enrollment.annualAverage.toFixed(2)}%</p>
                    </div>
                    {showPromotionStatus && enrollment.promotionStatus && (
                        <div className="text-right">
                            <span className="font-semibold">Décision du Conseil:</span>
                            <p className={`font-bold text-lg ${statusColor}`}>{enrollment.promotionStatus}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderFooter = () => (
         <div className="mt-8 pt-4 flex justify-between items-end text-xs text-center print-footer">
            <div className="w-1/3"><div className="border-t border-gray-500 w-2/3 mx-auto pt-1">Signature du Titulaire</div></div>
            <div className="w-1/3 text-gray-500">Bulletin généré le {new Date().toLocaleDateString('fr-FR')}</div>
            <div className="w-1/3"><div className="border-t border-gray-500 w-2/3 mx-auto pt-1">Signature de la Direction</div></div>
        </div>
    );

    switch(template) {
        case 'moderne':
            return (
                <div className="p-1 relative">
                    <div className="absolute top-0 left-0 bottom-0 w-2 bg-blue-600 rounded-l-lg"></div>
                    <div className="ml-4">
                        {renderHeader()}
                        <table className="w-full text-sm mt-4 print-table">
                            <thead className="border-b-2 border-slate-300">
                                <tr>
                                    <th className="p-2 text-left font-semibold text-slate-600">Matière</th>
                                    <th className="p-2 w-28 text-center font-semibold text-slate-600">Moyenne</th>
                                    <th className="p-2 text-left font-semibold text-slate-600">Appréciation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjectAverages.map((s: any, index: number) => (
                                    <tr key={s.id} className={`${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                                        <td className="p-2 font-medium text-slate-800">{s.name}</td>
                                        <td className="p-2 text-center">
                                            <span className={`font-bold text-base px-2 py-1 rounded-md ${s.average >= 80 ? 'text-green-800 bg-green-100' : s.average >= 60 ? 'text-blue-800 bg-blue-100' : 'text-red-800 bg-red-100'}`}>
                                                {s.average.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="p-2"><AppreciationTextarea value={appreciations[s.id] || ''} onChange={e => onAppreciationChange(s.id, e.target.value)} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-4 flex justify-end items-baseline gap-x-3 bg-slate-100 p-3 rounded-lg print-moderne-avg">
                            <span className="text-slate-600 font-semibold text-lg">Moyenne Période:</span>
                            <p className="font-bold text-2xl text-blue-700">{generalAverage.toFixed(2)}%</p>
                        </div>
                        {renderAnnualSummary()}
                        {renderFooter()}
                    </div>
                </div>
            );
        case 'classique':
            return (
                <div className="p-4 border-2 border-slate-800 bg-slate-50">
                    {renderHeader()}
                    <table className="w-full text-sm border-collapse border border-slate-400 mt-4 bg-white print-table">
                        <thead>
                            <tr>
                                <th className="p-2 text-left font-semibold border border-slate-300">Matière</th>
                                <th className="p-2 w-28 font-semibold border border-slate-300">Moyenne</th>
                                <th className="p-2 text-left font-semibold border border-slate-300">Appréciation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjectAverages.map((s: any) => (
                                <tr key={s.id} className="border-b border-slate-200">
                                    <td className="p-2 font-medium border border-slate-300">{s.name}</td>
                                    <td className="p-2 text-center font-bold border border-slate-300">{s.average.toFixed(2)}%</td>
                                    <td className="p-2 border border-slate-300"><AppreciationTextarea value={appreciations[s.id] || ''} onChange={e => onAppreciationChange(s.id, e.target.value)} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="text-right font-bold text-xl mt-6 border-t-2 border-slate-800 pt-2 print-classique-avg">Moyenne Période: {generalAverage.toFixed(2)}%</p>
                    {renderAnnualSummary()}
                    {renderFooter()}
                </div>
            );
        case 'annuel': {
            const statusColor = enrollment.promotionStatus === 'ADMIS(E) EN CLASSE SUPÉRIEURE' ? 'text-green-700' : 'text-red-700';

            return (
                <div className="p-1">
                    {renderHeader()}
                    <table className="w-full text-sm print-table">
                        <thead className="border-b-2 border-slate-300">
                            <tr>
                                <th className="p-1 text-left font-semibold">Matière</th>
                                <th className="p-1 w-28 text-center font-semibold">Note</th>
                                <th className="p-1 w-28 text-center font-semibold">Pourcentage</th>
                                <th className="p-1 text-left font-semibold">Appréciation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjectAverages.map((s: any) => {
                                const scaledScore = Number(s.max_grade) > 0 ? (s.average / 100) * Number(s.max_grade) : 0;
                                return (
                                    <tr key={s.id} className="border-b border-slate-100">
                                        <td className="p-1 font-medium">{s.name}</td>
                                        <td className="p-1 text-center font-mono">{scaledScore.toFixed(2)} / {Number(s.max_grade).toFixed(2)}</td>
                                        <td className="p-1 text-center font-bold">{s.average.toFixed(2)}%</td>
                                        <td className="p-1"><AppreciationTextarea value={appreciations[s.id] || ''} onChange={e => onAppreciationChange(s.id, e.target.value)} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                     <div className="mt-4 flex justify-between items-end gap-4 print-annuel-appreciation">
                        <div className="flex-grow">
                           <h4 className="font-semibold text-sm mb-1">Appréciation Générale:</h4>
                           <AppreciationTextarea 
                               value={generalAppreciation} 
                               onChange={e => onGeneralAppreciationChange(e.target.value)}
                               className="w-full p-2 border rounded-md bg-slate-50 min-h-[25px] whitespace-pre-wrap"
                           />
                       </div>
                       {enrollment.promotionStatus && (
                           <div className="flex-shrink-0 text-right pb-1">
                               <span className="font-semibold text-sm">Décision du Conseil:</span>
                               <p className={`font-bold text-lg ${statusColor}`}>{enrollment.promotionStatus}</p>
                           </div>
                       )}
                    </div>
                    {renderAnnualSummary(false)}
                    {renderFooter()}
                </div>
            );
        }
        case 'détaillé':
             return (
                <div className="p-1">
                    {renderHeader()}
                    {subjectAverages.map((s: any) => (
                        <div key={s.id} className="mb-4 border rounded-lg overflow-hidden break-inside-avoid">
                            <div className="bg-slate-100 p-1 grid grid-cols-3 gap-2 items-center">
                                <h4 className="font-bold col-span-2">{s.name}</h4>
                                <div className="text-right text-lg font-bold text-blue-700">{s.average.toFixed(2)}%</div>
                            </div>
                            <div className="p-1 grid grid-cols-2 gap-x-4">
                                <div className="text-sm">
                                    {(gradesBySubject[s.id] || []).length > 0 ? (
                                        <table className="w-full text-left"><tbody>
                                            {(gradesBySubject[s.id] || []).map((g: Grade) => (<tr key={g.id}><td className="py-0.5 px-1">{g.evaluation_name}</td><td className="text-right font-mono py-0.5 px-1">{g.score}/{g.max_score}</td></tr>))}
                                        </tbody></table>
                                    ) : <p className="italic text-slate-400">Aucune note</p>}
                                </div>
                                <div className="border-l pl-4"><AppreciationTextarea value={appreciations[s.id] || ''} onChange={e => onAppreciationChange(s.id, e.target.value)} className="text-sm italic" /></div>
                            </div>
                        </div>
                    ))}
                    <p className="text-right font-bold text-xl mt-6">Moyenne Période: {generalAverage.toFixed(2)}%</p>
                    {renderAnnualSummary()}
                    {renderFooter()}
                </div>
            );
        default: // Fallback to 'moderne'
            return (
                <div className="p-1">
                    {renderHeader()}
                    <table className="w-full text-sm print-table">
                        <thead className="border-b-2 border-slate-300"><tr><th className="p-1 text-left font-semibold">Matière</th><th className="p-1 w-28 font-semibold">Moyenne</th><th className="p-1 text-left font-semibold">Appréciation</th></tr></thead>
                        <tbody>
                            {subjectAverages.map((s: any) => (
                                <tr key={s.id} className="border-b border-slate-100">
                                    <td className="p-1 font-medium">{s.name}</td>
                                    <td className="p-1 text-center font-bold">{s.average.toFixed(2)}%</td>
                                    <td className="p-1"><AppreciationTextarea value={appreciations[s.id] || ''} onChange={e => onAppreciationChange(s.id, e.target.value)} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="text-right font-bold text-xl mt-6">Moyenne Période: {generalAverage.toFixed(2)}%</p>
                     {renderAnnualSummary()}
                    {renderFooter()}
                </div>
            );
    }
};

// --- Main Page Component ---

const ReportCardPage: React.FC = () => {
    const { addNotification } = useNotification();
    const { selectedYear } = useSchoolYear();
    const { user } = useAuth();
    
    const [academicPeriods, setAcademicPeriods] = useState<AcademicPeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>(CLASSES[0]);
    
    const [classData, setClassData] = useState<{ enrollments: Enrollment[], gradesByEnrollment: Record<number, Grade[]>, subjects: ClassSubject[], appreciationsByEnrollment: Record<number, Record<number, string>>, generalAppreciationsByEnrollment: Record<number, string> } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [schoolInfo, setSchoolInfo] = useState<Instance | null>(null);
    
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
    const [template, setTemplate] = useState<Template>('moderne');

    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [appreciations, setAppreciations] = useState<Record<number, Record<number, string>>>({});
    const [generalAppreciations, setGeneralAppreciations] = useState<Record<number, string>>({});
    const [modalEnrollment, setModalEnrollment] = useState<Enrollment | null>(null);
    
    const appreciationSaveTimeout = useRef<number | null>(null);

    useEffect(() => {
        const fetchSchoolInfo = async () => {
          try { setSchoolInfo(await apiFetch('/instance/current')); } catch(e) { console.error(e); }
        };
        fetchSchoolInfo();
    }, []);

    useEffect(() => {
        const fetchPeriods = async () => {
            if (!selectedYear) return;
            try {
                const periods = await apiFetch(`/academic-periods?yearId=${selectedYear.id}`);
                setAcademicPeriods(periods);
                if (periods.length > 0) setSelectedPeriodId(periods[0].id.toString());
                else setSelectedPeriodId('');
            } catch (error) {
                if(error instanceof Error) addNotification({ type: 'error', message: error.message });
            }
        };
        fetchPeriods();
        setClassData(null);
    }, [selectedYear, addNotification]);

    const fetchClassData = useCallback(async () => {
        if (!selectedYear || !selectedClass || !selectedPeriodId) {
            setClassData(null);
            return;
        }
        setIsLoading(true);
        try {
            const data = await apiFetch(`/bulk-report-data?yearId=${selectedYear.id}&className=${selectedClass}&periodId=${selectedPeriodId}`);
            setClassData(data);
            setSelectedStudentIds(new Set(data.enrollments.map((en: Enrollment) => en.id)));
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear, selectedClass, selectedPeriodId, addNotification]);
    
    useEffect(() => { fetchClassData(); }, [fetchClassData]);
    
    const handleCloseGradebook = () => {
        setModalEnrollment(null);
        fetchClassData();
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked && classData) {
            setSelectedStudentIds(new Set(classData.enrollments.map(en => en.id)));
        } else { setSelectedStudentIds(new Set()); }
    };
    
    const handleSelectOne = (id: number) => {
        setSelectedStudentIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };
    
    const getAppreciation = (avg: number) => {
        const appreciationPhrases = {
            top: ['Excellent travail.', 'Performance exceptionnelle.', 'Résultats remarquables.', 'Bravo!'],
            good: ['Très bon travail.', 'Excellents progrès.', 'Très solide.', 'Continuez ainsi.'],
            average: ['Bon travail.', 'Résultats satisfaisants.', 'Peut mieux faire.', 'Assez bien.'],
            poor: ['Efforts à fournir.', 'Doit se ressaisir.', 'Difficultés apparentes.', 'Attention!']
        };
        let phrases;
        if (avg >= 90) phrases = appreciationPhrases.top;
        else if (avg >= 80) phrases = appreciationPhrases.good;
        else if (avg >= 60) phrases = appreciationPhrases.average;
        else phrases = appreciationPhrases.poor;
        return phrases[Math.floor(Math.random() * phrases.length)];
    };

    const handleGeneratePreview = () => {
        if (selectedStudentIds.size === 0 || !classData) {
            addNotification({ type: 'warning', message: 'Veuillez sélectionner au moins un élève.'});
            return;
        }
        
        const initialAppreciations: Record<number, Record<number, string>> = {};
        const initialGeneralAppreciations: Record<number, string> = {};

        classData.enrollments.forEach(enrollment => {
            if (selectedStudentIds.has(enrollment.id)) {
                initialAppreciations[enrollment.id] = {};
                initialGeneralAppreciations[enrollment.id] = classData.generalAppreciationsByEnrollment[enrollment.id] || "Poursuivez vos efforts.";

                const gradesForStudent = classData.gradesByEnrollment[enrollment.id] || [];
                const gradesBySubject = gradesForStudent.reduce((acc, grade) => {
                    if (!acc[grade.subject_id]) acc[grade.subject_id] = [];
                    acc[grade.subject_id].push(grade);
                    return acc;
                }, {} as Record<number, Grade[]>);

                classData.subjects.forEach(subject => {
                    const savedAppreciation = classData.appreciationsByEnrollment[enrollment.id]?.[subject.subject_id];
                    if (savedAppreciation) {
                        initialAppreciations[enrollment.id][subject.subject_id] = savedAppreciation;
                    } else {
                        const subjectGrades = gradesBySubject[subject.subject_id] || [];
                        const totalMaxScore = subjectGrades.reduce((sum, g) => sum + Number(g.max_score), 0);
                        const totalScore = subjectGrades.reduce((sum, g) => sum + Number(g.score), 0);
                        const average = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
                        initialAppreciations[enrollment.id][subject.subject_id] = getAppreciation(average);
                    }
                });
            }
        });
        
        setAppreciations(initialAppreciations);
        setGeneralAppreciations(initialGeneralAppreciations);
        setIsPreviewMode(true);
    };

    const handleAppreciationChange = (enrollmentId: number, subjectId: number, value: string) => {
        setAppreciations(prev => ({...prev, [enrollmentId]: { ...(prev[enrollmentId] || {}), [subjectId]: value }}));
        if (appreciationSaveTimeout.current) clearTimeout(appreciationSaveTimeout.current);
        appreciationSaveTimeout.current = window.setTimeout(() => {
            apiFetch('/appreciations', {
                method: 'POST',
                body: JSON.stringify({ enrollment_id: enrollmentId, subject_id: subjectId, period_id: selectedPeriodId, text: value })
            })
            .then(() => {
                setClassData(prevData => {
                    if (!prevData) return null;
                    const newAppreciations = JSON.parse(JSON.stringify(prevData.appreciationsByEnrollment));
                    if (!newAppreciations[enrollmentId]) newAppreciations[enrollmentId] = {};
                    newAppreciations[enrollmentId][subjectId] = value;
                    return { ...prevData, appreciationsByEnrollment: newAppreciations };
                });
            })
            .catch(err => addNotification({ type: 'error', message: `Sauvegarde échouée: ${err.message}` }));
        }, 1000);
    };

    const handleGeneralAppreciationChange = (enrollmentId: number, value: string) => {
        setGeneralAppreciations(prev => ({...prev, [enrollmentId]: value }));
        if (appreciationSaveTimeout.current) clearTimeout(appreciationSaveTimeout.current);
        appreciationSaveTimeout.current = window.setTimeout(() => {
            apiFetch('/general-appreciations', {
                method: 'POST',
                body: JSON.stringify({ enrollment_id: enrollmentId, period_id: selectedPeriodId, text: value })
            })
            .then(() => {
                 setClassData(prevData => {
                    if (!prevData) return null;
                    const newGeneralAppreciations = { ...prevData.generalAppreciationsByEnrollment };
                    newGeneralAppreciations[enrollmentId] = value;
                    return { ...prevData, generalAppreciationsByEnrollment: newGeneralAppreciations };
                });
            })
            .catch(err => addNotification({ type: 'error', message: `Sauvegarde échouée: ${err.message}` }));
        }, 1000);
    };
    
    const handleFinalPrint = () => {
        const previewContainer = document.getElementById('bulk-preview-content');
        if (!previewContainer) return;
        
        const contentToPrint = previewContainer.cloneNode(true) as HTMLElement;
        
        contentToPrint.querySelectorAll('textarea').forEach(textarea => {
            const div = document.createElement('div');
            div.textContent = textarea.value;
            div.className = textarea.className;
            textarea.parentNode?.replaceChild(div, textarea);
        });

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html><head><title>Bulletins</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
            <style>
                @page {
                    size: letter portrait;
                    margin: 10mm;
                }
                body {
                    font-family: 'Roboto', sans-serif;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    font-size: 9pt;
                    line-height: 1.15;
                }
                h1, h2, h3, h4, .font-display { font-family: 'Montserrat', sans-serif; }
                
                .student-report-block {
                    page-break-after: always;
                }
                .student-report-block:last-of-type {
                    page-break-after: auto;
                }
                
                .student-report-block.template-moderne,
                .student-report-block.template-classique,
                .student-report-block.template-annuel {
                    page-break-inside: avoid;
                }
                .student-report-block.template-détaillé {
                    page-break-inside: auto;
                }

                .no-print { display: none !important; }

                /* Spacing overrides for print */
                .print-header h1 { font-size: 16pt !important; margin: 0 0 2px 0 !important; }
                .print-header p { font-size: 8pt !important; margin: 0 !important; }
                .print-header-info { padding: 6px !important; margin: 8px 0 !important; }
                .print-title { font-size: 12pt !important; margin: 4px 0 !important; }

                .print-table { margin-top: 8px !important; margin-bottom: 8px !important; }
                .print-table th { padding: 3px 4px !important; }
                .print-table td { padding: 2px 4px !important; }

                .print-moderne-avg { margin-top: 12px !important; padding: 8px !important; }
                .print-moderne-avg span { font-size: 12pt !important; }
                .print-moderne-avg p { font-size: 16pt !important; }

                .print-classique-avg { margin-top: 12px !important; padding-top: 4px !important; font-size: 12pt !important; }
                
                .print-annuel-appreciation { margin-top: 12px !important; }
                .print-annuel-appreciation h4 { font-size: 9pt !important; }
                .print-annuel-appreciation div { font-size: 9pt !important; padding: 2px !important; }
                
                .print-footer { margin-top: 20px !important; padding-top: 8px !important; }
            </style>
            </head><body>${contentToPrint.innerHTML}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };
    
    const selectedEnrollments = useMemo(() => {
        if (!classData) return [];
        return classData.enrollments.filter(en => selectedStudentIds.has(en.id));
    }, [classData, selectedStudentIds]);

    const renderSelectionView = () => (
        <>
            <div className="bg-white p-6 rounded-xl shadow-md mb-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                 <div><label className="block text-sm font-medium text-slate-700 mb-1">Classe</label><select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md">{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                 <div><label className="block text-sm font-medium text-slate-700 mb-1">Période</label><select value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md" disabled={academicPeriods.length === 0}>{academicPeriods.length === 0 ? <option>Aucune période</option> : academicPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                 <div className="md:col-span-2 flex items-center justify-end flex-wrap gap-2">
                    <h3 className="text-sm font-medium text-slate-700">Modèle de Bulletin</h3>
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg flex-wrap">{(['moderne', 'classique', 'annuel', 'détaillé'] as Template[]).map(t => <button key={t} onClick={() => setTemplate(t)} className={`px-3 py-1 text-sm rounded-md capitalize transition-colors flex-grow ${template === t ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-200'}`}>{t}</button>)}</div>
                 </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800 font-display">Élèves de la classe {selectedClass}</h2>
                    <button onClick={handleGeneratePreview} disabled={selectedStudentIds.size === 0 || isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-slate-400">Générer les Bulletins ({selectedStudentIds.size})</button>
                </div>
                {isLoading ? <p className="text-center py-10">Chargement...</p> : !classData || classData.enrollments.length === 0 ? <p className="text-center py-10 text-slate-500 italic">Aucun élève trouvé pour cette sélection.</p> : (
                    <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr><th className="p-4"><input type="checkbox" checked={classData.enrollments.length > 0 && selectedStudentIds.size === classData.enrollments.length} onChange={handleSelectAll} /></th><th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nom</th><th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Prénom</th></tr></thead><tbody className="bg-white divide-y divide-slate-200">{classData.enrollments.map(en => (<tr key={en.id} className={selectedStudentIds.has(en.id) ? 'bg-blue-50' : ''}><td className="p-4"><input type="checkbox" checked={selectedStudentIds.has(en.id)} onChange={() => handleSelectOne(en.id)} /></td><td className="px-6 py-4 font-medium">{en.student?.nom}</td><td className="px-6 py-4">{en.student?.prenom}</td></tr>))}</tbody></table></div>
                )}
            </div>
        </>
    );

    const renderPreviewView = () => {
        const selectedPeriod = academicPeriods.find(p => p.id.toString() === selectedPeriodId);
        const formatDate = (dStr: string | null | undefined) => dStr ? new Date(new Date(dStr).getTime() + new Date(dStr).getTimezoneOffset() * 60000).toLocaleDateString('fr-FR') : 'N/A';

        return (
            <div>
                 <div className="bg-white p-4 rounded-xl shadow-md mb-8 flex justify-between items-center flex-wrap gap-4 no-print">
                    <div>
                        <button onClick={() => setIsPreviewMode(false)} className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors group font-medium"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>Retour à la sélection</button>
                        <h2 className="text-xl font-bold text-slate-800 font-display mt-2">Prévisualisation et Modification</h2>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                            {(['moderne', 'classique', 'annuel', 'détaillé'] as Template[]).map(t =>
                                <button key={t} onClick={() => setTemplate(t)} className={`px-3 py-1 text-sm rounded-md capitalize transition-colors ${template === t ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-200'}`}>{t}</button>
                            )}
                        </div>
                        <button onClick={handleFinalPrint} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700">Imprimer les Bulletins</button>
                    </div>
                </div>
                 <div id="bulk-preview-content" className="space-y-4">
                     {selectedEnrollments.map(enrollment => {
                         const gradesForStudent = classData?.gradesByEnrollment[enrollment.id] || [];
                         const gradesBySubject = gradesForStudent.reduce((acc, grade) => { if (!acc[grade.subject_id]) acc[grade.subject_id] = []; acc[grade.subject_id].push(grade); return acc; }, {} as Record<number, Grade[]>);
                         const subjectAverages = classData?.subjects.map(subject => { const subjectGrades = gradesBySubject[subject.subject_id] || []; const totalScore = subjectGrades.reduce((sum, g) => sum + Number(g.score), 0); const totalMaxScore = subjectGrades.reduce((sum, g) => sum + Number(g.max_score), 0); return { id: subject.subject_id, name: subject.subject_name, max_grade: subject.max_grade, average: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0 }; }) || [];
                         const generalAverage = subjectAverages.length > 0 ? subjectAverages.reduce((sum, s) => sum + s.average, 0) / subjectAverages.length : 0;
                         const studentAppreciations = appreciations[enrollment.id] || {};
                         const generalAppreciation = generalAppreciations[enrollment.id] || '';
                         const bulletinData = { schoolInfo, enrollment, year: selectedYear, selectedPeriod, subjectAverages, generalAverage, appreciations: studentAppreciations, gradesBySubject, generalAppreciation, formatDate, user };
                         
                         return (
                            <div key={enrollment.id} className={`bg-white shadow-lg student-report-block template-${template}`}>
                                <div className="flex justify-between items-center p-2 bg-slate-50 border-b no-print">
                                    <h3 className="font-bold text-slate-700">{enrollment.student?.prenom} {enrollment.student?.nom}</h3>
                                    {(user?.role === 'admin' || user?.role === 'teacher') && (
                                        <button onClick={() => setModalEnrollment(enrollment)} className="px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200 transition">
                                            Modifier les Notes
                                        </button>
                                    )}
                                </div>
                                <div className="page-container p-6">
                                    <TemplateRenderer template={template} data={bulletinData} onAppreciationChange={(subjectId, value) => handleAppreciationChange(enrollment.id, subjectId, value)} onGeneralAppreciationChange={(value) => handleGeneralAppreciationChange(enrollment.id, value)} />
                                </div>
                            </div>
                         );
                     })}
                 </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-screen-2xl mx-auto">
            <header className="mb-8"><ReactRouterDOM.Link to="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>Retour à l'accueil</ReactRouterDOM.Link><h1 className="text-4xl font-bold text-gray-800 font-display">Gestion des Bulletins</h1><p className="text-lg text-slate-500 mt-2">Générer les bulletins de notes pour une classe entière.</p></header>
            {isPreviewMode ? renderPreviewView() : renderSelectionView()}

            {modalEnrollment && selectedYear && (
                <GradebookModal
                    isOpen={!!modalEnrollment}
                    onClose={handleCloseGradebook}
                    enrollment={modalEnrollment}
                    year={selectedYear}
                    instanceInfo={schoolInfo}
                />
            )}
        </div>
    );
};

export default ReportCardPage;