import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import type { Enrollment, Grade, SchoolYear, Instance, AcademicPeriod, ClassSubject } from '../types';
import { apiFetch } from '../utils/api';
import * as db from '../utils/db';
import { useNotification } from '../contexts/NotificationContext';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import GradebookModal from './GradebookModal';
import { useAuth } from '../auth/AuthContext';

type Template = 'moderne' | 'classique' | 'formel' | 'détaillé' | 'annuel' | 'élégant' | 'créatif' | 'creatif-compact' | 'elegant-compact';

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
    
    const { schoolInfo, enrollment, selectedPeriod, year, subjectAverages, generalAverage, appreciations, gradesBySubject, generalAppreciation, formatDate, user, totalNotes, totalCoefficient, studentAverage, averageBase, classAverage, rank } = data;

    const renderHeader = () => (
        <>
            <div className="text-center mb-2 border-b-2 border-gray-700 pb-2 print-header">
                {schoolInfo?.logo_url && <img src={schoolInfo.logo_url} alt="Logo" className="h-14 print:h-12 mx-auto mb-2 object-contain" />}
                <h1 className="text-xl font-bold font-display">{schoolInfo?.name}</h1>
                <p className="text-xs text-slate-600">{schoolInfo?.address}</p>
                <p className="text-xs text-slate-600">{schoolInfo?.phone} | {schoolInfo?.email}</p>
            </div>
            <h2 className="text-center text-sm font-semibold my-1 font-display uppercase print-title">Bulletin de Notes - {selectedPeriod?.name}</h2>
            <div className="grid grid-cols-2 gap-x-4 text-xs bg-gray-50 p-2 rounded-lg border my-1 print-header-info">
                <p><strong>Élève:</strong> {enrollment.student?.prenom} {enrollment.student?.nom}</p>
                <p><strong>Classe:</strong> {enrollment.className}</p>
                <p><strong>Date de Naissance:</strong> {formatDate(enrollment.student?.date_of_birth)}</p>
                <p><strong>Année Scolaire:</strong> {year.name}</p>
            </div>
        </>
    );

    const renderAnnualSummary = (showPromotionStatus: boolean = true) => {
        if (enrollment.annualAverage === undefined || enrollment.annualAverage === null) return null;
        
        const statusColor = enrollment.promotionStatus === 'ADMIS(E) EN CLASSE SUPÉRIEURE' ? 'text-green-700' : 'text-red-700';

        return (
             <div className="mt-2 pt-2 border-t-2 border-slate-400">
                <h3 className="font-bold text-center text-sm mb-2">RÉSUMÉ ANNUEL</h3>
                <div className={`grid ${showPromotionStatus ? 'grid-cols-2' : 'grid-cols-1 text-center'} gap-x-4 text-xs bg-slate-100 p-2 rounded-lg border`}>
                    <div>
                        <span className="font-semibold">Moyenne Générale Annuelle:</span>
                        <p className="font-bold text-base">{Number(enrollment.annualAverage).toFixed(2)}%</p>
                    </div>
                    {showPromotionStatus && enrollment.promotionStatus && (
                        <div className="text-right">
                            <span className="font-semibold">Décision du Conseil:</span>
                            <p className={`font-bold text-base ${statusColor}`}>{enrollment.promotionStatus}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderFooter = () => (
         <div className="mt-6 pt-2 flex justify-between items-end text-xs text-center print-footer">
            <div className="w-1/3"><div className="border-t border-gray-500 w-2/3 mx-auto pt-1">Personne responsable</div></div>
            <div className="w-1/3"><div className="border-t border-gray-500 w-2/3 mx-auto pt-1">Signature de la Direction</div></div>
        </div>
    );

    const renderAnnualHeader = () => (
        <>
            <div className="text-center mb-2 border-b-2 border-gray-700 pb-2">
                {schoolInfo?.logo_url && <img src={schoolInfo.logo_url} alt="Logo" className="h-14 print:h-12 mx-auto mb-2 object-contain" />}
                <h1 className="text-xl font-bold font-display">{schoolInfo?.name}</h1>
                <p className="text-xs text-slate-600">{schoolInfo?.address}</p>
                <p className="text-xs text-slate-600">{schoolInfo?.phone} | {schoolInfo?.email}</p>
            </div>
            <h2 className="text-center text-lg font-semibold my-2 font-display uppercase">{`BULLETIN DE NOTES - ${selectedPeriod?.name}`}</h2>
            <div className="grid grid-cols-2 gap-x-4 text-xs bg-gray-50 p-2 rounded-lg border my-2">
                <p><strong>Élève:</strong> {enrollment.student?.prenom} {enrollment.student?.nom}</p>
                <p><strong>Classe:</strong> {enrollment.className}</p>
                <p><strong>Date de Naissance:</strong> {formatDate(enrollment.student?.date_of_birth)}</p>
                <p><strong>Année Scolaire:</strong> {year.name}</p>
            </div>
        </>
    );

    switch(template) {
        case 'moderne':
            return (
                <div className="p-1 relative">
                    <div className="absolute top-0 left-0 bottom-0 w-2 bg-blue-600 rounded-l-lg"></div>
                    <div className="ml-4">
                        {renderHeader()}
                        <table className="w-full text-sm mt-1 print-table">
                            <thead className="border-b-2 border-slate-300">
                                <tr>
                                    <th className="py-0.5 px-2 text-left font-semibold text-slate-600">Matière</th>
                                    <th className="py-0.5 px-2 w-32 text-center font-semibold text-slate-600">Moyenne (/100)</th>
                                    <th className="py-0.5 px-2 text-left font-semibold text-slate-600">Appréciation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjectAverages.map((s: any, index: number) => (
                                    <tr key={s.id} className={`${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                                        <td className="py-0.5 px-2 font-medium text-slate-800">{s.name}</td>
                                        <td className="py-0.5 px-2 text-center">
                                            <span className={`font-bold text-sm px-2 py-1 rounded-md ${s.average >= 80 ? 'text-green-800 bg-green-100' : s.average >= 60 ? 'text-blue-800 bg-blue-100' : 'text-red-800 bg-red-100'}`}>
                                                {s.average.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-0.5 px-2"><AppreciationTextarea value={appreciations[s.id] || ''} onChange={e => onAppreciationChange(s.id, e.target.value)} className="text-xs" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-2 flex justify-between items-baseline gap-x-3 bg-slate-100 p-2 rounded-lg print-moderne-avg">
                            <h4 className="font-semibold text-xs text-slate-600">Appréciation Générale:</h4>
                            <div className="text-right">
                                <span className="text-slate-600 font-semibold text-sm">Moyenne Période:</span>
                                <p className="font-bold text-sm text-blue-700">{((generalAverage / 100) * averageBase).toFixed(2)} / {averageBase}</p>
                            </div>
                        </div>
                        <AppreciationTextarea 
                            value={generalAppreciation} 
                            onChange={e => onGeneralAppreciationChange(e.target.value)}
                            className="w-full p-2 border rounded-md bg-slate-50 min-h-[30px] whitespace-pre-wrap text-xs mt-1"
                        />
                        {renderAnnualSummary()}
                        {renderFooter()}
                    </div>
                </div>
            );
        case 'classique':
            return (
                <div className="p-2 border-2 border-slate-800 bg-slate-50">
                    {renderHeader()}
                    <table className="w-full text-sm border-collapse border border-slate-400 mt-1 bg-white print-table">
                        <thead>
                            <tr>
                                <th className="py-0.5 px-2 text-left font-semibold border border-slate-300">Matière</th>
                                <th className="py-0.5 px-2 w-32 font-semibold border border-slate-300">Moyenne (/100)</th>
                                <th className="py-0.5 px-2 text-left font-semibold border border-slate-300">Appréciation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjectAverages.map((s: any) => (
                                <tr key={s.id} className="border-b border-slate-200">
                                    <td className="py-0.5 px-2 font-medium border border-slate-300">{s.name}</td>
                                    <td className="py-0.5 px-2 text-center border border-slate-300">{s.average.toFixed(2)}</td>
                                    <td className="py-0.5 px-2 border border-slate-300"><AppreciationTextarea value={appreciations[s.id] || ''} onChange={e => onAppreciationChange(s.id, e.target.value)} className="text-xs"/></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     <div className="flex justify-between items-end mt-2 border-t-2 border-slate-800 pt-1">
                        <div>
                            <h4 className="font-semibold text-xs text-slate-600">Appréciation Générale:</h4>
                            <AppreciationTextarea 
                                value={generalAppreciation} 
                                onChange={e => onGeneralAppreciationChange(e.target.value)}
                                className="w-full p-2 border rounded-md bg-white min-h-[30px] whitespace-pre-wrap text-xs mt-1"
                            />
                        </div>
                        <p className="font-bold text-sm print-classique-avg text-right">Moyenne Période: {((generalAverage / 100) * averageBase).toFixed(2)} / {averageBase}</p>
                    </div>
                    {renderAnnualSummary()}
                    {renderFooter()}
                </div>
            );
        case 'formel':
            return (
                <div className="p-2 bg-white font-serif text-black" style={{ fontSize: '10pt' }}>
                    <div className="text-center mb-4">
                        {schoolInfo?.logo_url && <img src={schoolInfo.logo_url} alt="Logo" className="h-24 w-24 print:h-16 print:w-16 object-contain mx-auto" />}
                        <h1 className="text-xl font-bold uppercase mt-2">{schoolInfo?.name}</h1>
                        <p className="text-xs">{`Année Académique ${year.name}`}</p>
                        <p className="text-xs">{schoolInfo?.address}</p>
                        <p className="text-xs">{schoolInfo?.phone}</p>
                        {schoolInfo?.email && <p className="text-xs">{schoolInfo.email}</p>}
                    </div>
                    
                    <h2 className="text-center text-lg font-bold my-4 uppercase">{`Bulletin: ${selectedPeriod?.name}`}</h2>

                    <div className="text-sm mb-4">
                        <div className="flex items-baseline">
                            <div className="w-1/2 flex items-baseline pr-4">
                                <strong className="flex-shrink-0 mr-2">Nom:</strong>
                                <span className="flex-grow border-b border-dotted border-black">{enrollment.student?.nom}</span>
                            </div>
                            <div className="w-1/2 flex items-baseline pl-4">
                                <strong className="flex-shrink-0 mr-2">Prénom(s):</strong>
                                <span className="flex-grow border-b border-dotted border-black">{enrollment.student?.prenom}</span>
                            </div>
                        </div>
                        <div className="flex items-baseline mt-2">
                            <div className="w-1/2 flex items-baseline pr-4">
                                <strong className="flex-shrink-0 mr-2">Identifiant:</strong>
                                <span className="flex-grow border-b border-dotted border-black">{enrollment.student?.nisu || enrollment.student?.id}</span>
                            </div>
                            <div className="w-1/2 flex items-baseline pl-4">
                                <strong className="flex-shrink-0 mr-2">Classe:</strong>
                                <span className="flex-grow border-b border-dotted border-black">{enrollment.className}</span>
                            </div>
                        </div>
                    </div>

                    <table className="w-full text-sm border-collapse border border-black">
                        <thead className="bg-gray-200"><tr className="bg-gray-200"><th className="border border-black py-0.5 px-1 font-bold">Matières</th><th className="border border-black py-0.5 px-1 font-bold w-32">Coefficient</th><th className="border border-black py-0.5 px-1 font-bold w-32">Notes</th></tr></thead>
                        <tbody>
                            {subjectAverages.map((subject: any) => {
                                const subjectGrades = gradesBySubject[subject.id] || [];
                                const note = subjectGrades.reduce((sum: number, g: Grade) => sum + Number(g.score), 0);
                                return (
                                    <tr key={subject.id}><td className="border border-black py-0.5 px-1">{subject.name}</td><td className="border border-black py-0.5 px-1 text-center">{Number(subject.max_grade)}</td><td className="border border-black py-0.5 px-1 text-center">{note.toFixed(2)}</td></tr>
                                );
                            })}
                            <tr><td className="border border-black py-0.5 px-1 font-bold">Total</td><td className="border border-black py-0.5 px-1 text-center font-bold bg-gray-200">{totalCoefficient.toFixed(0)}</td><td className="border border-black py-0.5 px-1 text-center font-bold bg-gray-200">{totalNotes.toFixed(2)}</td></tr>
                            <tr>
                                <td className="border border-black py-0.5 px-1 font-bold">Moyenne de l'élève</td>
                                <td className="border border-black py-0.5 px-1 text-center font-bold bg-gray-200">{averageBase}</td>
                                <td className="border border-black py-0.5 px-1 text-center font-bold bg-gray-200">{studentAverage.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td colSpan={3} className="border-t border-black p-0">
                                    <div className="grid grid-cols-4">
                                        <div className="border-r border-black py-0.5 px-1 font-bold bg-gray-200 text-left">Moyenne de la Classe</div>
                                        <div className="border-r border-black py-0.5 px-1 text-center font-bold bg-gray-200">{classAverage.toFixed(2)}</div>
                                        <div className="border-r border-black py-0.5 px-1 font-bold bg-gray-200 text-left">Place de l'élève</div>
                                        <div className="py-0.5 px-1 text-center font-bold bg-gray-200">{rank}</div>
                                    </div>
                                </td>
                            </tr>
                            <tr><td colSpan={3} className="border border-black py-0.5 px-1"><div className="font-bold">OBSERVATIONS</div><AppreciationTextarea value={generalAppreciation} onChange={e => onGeneralAppreciationChange(e.target.value)} className="w-full min-h-[50px] py-0.5 px-1 bg-transparent focus:bg-yellow-100" /></td></tr>
                        </tbody>
                    </table>
                    
                    <div className="flex justify-between mt-16 text-sm">
                        <div className="w-2/5 text-center"><div className="border-t border-black pt-1">Signature de la Direction</div></div>
                        <div className="w-2/5 text-center"><div className="border-t border-black pt-1">Signature du Responsable</div></div>
                    </div>
                </div>
            );
        case 'annuel': {
            const statusColor = enrollment.promotionStatus === 'ADMIS(E) EN CLASSE SUPÉRIEURE' ? 'text-green-700' : 'text-red-700';
            const totalScore = subjectAverages.reduce((acc: number, s: any) => {
                const scaledScore = Number(s.max_grade) > 0 ? (s.average / 100) * Number(s.max_grade) : 0;
                return acc + scaledScore;
            }, 0);
            const totalCoefficientAnnuel = subjectAverages.reduce((acc: number, s: any) => acc + Number(s.max_grade), 0);
            return (
                <div className="p-1">
                    {renderAnnualHeader()}
                    <table className="w-full text-sm">
                        <thead className="border-b-2 border-slate-300">
                            <tr>
                                <th className="py-0.5 px-2 text-left font-semibold">Matière</th>
                                <th className="py-0.5 px-2 w-28 text-center font-semibold">Note</th>
                                <th className="py-0.5 px-2 w-28 text-center font-semibold">Coefficient</th>
                                <th className="py-0.5 px-2 text-left font-semibold">Appréciation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjectAverages.map((s: any) => {
                                const scaledScore = Number(s.max_grade) > 0 ? (s.average / 100) * Number(s.max_grade) : 0;
                                return (
                                    <tr key={s.id} className="border-b border-slate-100">
                                        <td className="py-0.5 px-2 font-medium">{s.name}</td>
                                        <td className="py-0.5 px-2 text-center font-mono">{scaledScore.toFixed(2)}</td>
                                        <td className="py-0.5 px-2 text-center font-bold">{Number(s.max_grade).toFixed(2)}</td>
                                        <td className="py-0.5 px-2">
                                            <AppreciationTextarea 
                                                value={appreciations[s.id] || ''} 
                                                onChange={e => onAppreciationChange(s.id, e.target.value)} 
                                                className="text-xs"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                                <td className="py-0.5 px-2">Total</td>
                                <td className="py-0.5 px-2 text-center font-mono">{totalScore.toFixed(2)}</td>
                                <td className="py-0.5 px-2 text-center">{totalCoefficientAnnuel.toFixed(2)}</td>
                                <td className="py-0.5 px-2"></td>
                            </tr>
                            <tr className="bg-slate-200 font-bold">
                                <td className="py-0.5 px-2">Moyenne Générale</td>
                                <td className="py-0.5 px-2 text-center font-mono">{((generalAverage / 100) * averageBase).toFixed(2)}</td>
                                <td className="py-0.5 px-2 text-center">{averageBase.toFixed(2)}</td>
                                <td className="py-0.5 px-2"></td>
                            </tr>
                        </tbody>
                    </table>
                     <div className="mt-2 flex justify-between items-end gap-4">
                        <div className="flex-grow">
                           <h4 className="font-semibold text-xs mb-1">Appréciation Générale:</h4>
                           <AppreciationTextarea 
                               value={generalAppreciation} 
                               onChange={e => onGeneralAppreciationChange(e.target.value)}
                               className="w-full p-2 border rounded-md bg-slate-50 min-h-[25px] whitespace-pre-wrap text-xs"
                           />
                       </div>
                       {enrollment.promotionStatus && (
                           <div className="flex-shrink-0 text-right pb-1">
                               <span className="font-semibold text-xs">Décision du Conseil:</span>
                               <p className={`font-bold text-base ${statusColor}`}>{enrollment.promotionStatus}</p>
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
                                <div className="text-right text-sm font-bold text-blue-700">{s.average.toFixed(2)}%</div>
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
                    <p className="text-right font-bold text-sm mt-6">Moyenne Période: {((generalAverage / 100) * averageBase).toFixed(2)} / {averageBase}</p>
                    {renderAnnualSummary()}
                    {renderFooter()}
                </div>
            );
        case 'élégant':
            return (
                <div className="p-2 bg-gray-50 font-sans text-sm">
                    <div className="text-center mb-2">
                        {schoolInfo?.logo_url && <img src={schoolInfo.logo_url} alt="Logo" className="h-14 print:h-12 mx-auto mb-1 object-contain" />}
                        <h1 className="text-lg font-bold text-gray-800">{schoolInfo?.name}</h1>
                        <p className="text-[10px] text-gray-500">{schoolInfo?.address}</p>
                        <p className="text-[10px] text-gray-500">{schoolInfo?.phone} | {schoolInfo?.email}</p>
                        <hr className="my-1 border-gray-300" />
                    </div>
                    <h2 className="text-center text-sm font-semibold text-gray-700 my-1 uppercase tracking-wider">{`BULLETIN PÉRIODIQUE - ${selectedPeriod?.name?.toUpperCase()}`}</h2>
                    <div className="grid grid-cols-2 gap-x-4 text-xs bg-white p-1.5 rounded-lg shadow-sm border border-gray-200 my-1">
                        <p><strong>Élève :</strong> {enrollment.student?.prenom} {enrollment.student?.nom}</p>
                        <p><strong>Classe :</strong> {enrollment.className}</p>
                        <p><strong>Période :</strong> {selectedPeriod?.name}</p>
                        <p><strong>Année :</strong> {year.name}</p>
                    </div>
                    <table className="w-full text-xs mt-2 bg-white shadow-sm rounded-lg overflow-hidden">
                        <thead className="bg-gray-100 border-b-2 border-gray-300">
                            <tr>
                                <th className="py-1 px-2 text-left font-semibold text-gray-600">Matière</th>
                                <th className="py-1 px-2 w-28 text-center font-semibold text-gray-600">Moyenne (/100)</th>
                                <th className="py-1 px-2 text-left font-semibold text-gray-600">Appréciation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjectAverages.map((s: any) => (
                                <tr key={s.id} className="border-b border-gray-100">
                                    <td className="py-0.5 px-2 font-medium text-gray-700">{s.name}</td>
                                    <td className="py-0.5 px-2 text-center font-bold text-sm text-gray-800">{s.average.toFixed(2)}</td>
                                    <td className="py-0.5 px-2 text-gray-600 italic">
                                        <AppreciationTextarea value={appreciations[s.id] || ''} onChange={e => onAppreciationChange(s.id, e.target.value)} className="text-xs" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-2 flex justify-end">
                        <div className="bg-white p-1.5 rounded-lg shadow-sm border border-gray-200">
                            <span className="text-gray-600 font-semibold text-xs">Moyenne Générale : </span>
                            <span className="font-bold text-sm text-blue-600">{((generalAverage / 100) * averageBase).toFixed(2)} / {averageBase}</span>
                        </div>
                    </div>
                    <div className="mt-1 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                        <h4 className="font-semibold text-gray-600 text-xs">Appréciation Générale :</h4>
                        <AppreciationTextarea value={generalAppreciation} onChange={e => onGeneralAppreciationChange(e.target.value)} className="text-xs"/>
                    </div>
                    {renderAnnualSummary()}
                    <div className="mt-6 pt-2 flex justify-between items-end text-xs text-center">
                        <div className="w-2/5"><div className="border-t-2 border-gray-400 pt-1">Signature de la Direction</div></div>
                        <div className="w-2/5"><div className="border-t-2 border-gray-400 pt-1">Signature du Responsable</div></div>
                    </div>
                </div>
            );
        case 'créatif':
            return (
                <div className="p-4 bg-gradient-to-br from-sky-50 to-indigo-100 font-sans">
                    <div className="text-center mb-4">
                        {schoolInfo?.logo_url && <img src={schoolInfo.logo_url} alt="Logo" className="h-20 print:h-14 mx-auto mb-2 object-contain" />}
                        <h1 className="text-xl font-bold uppercase">{schoolInfo?.name}</h1>
                        <p className="text-xs">{`Année Académique ${year.name}`}</p>
                        <p className="text-xs">{schoolInfo?.address}</p>
                        <p className="text-xs">{schoolInfo?.phone}</p>
                        {schoolInfo?.email && <p className="text-xs">{schoolInfo.email}</p>}
                    </div>
                    <h2 className="text-center text-sm font-bold my-2 uppercase">{`BULLETIN: ${selectedPeriod?.name}`}</h2>
                    
                    <div className="bg-white p-3 rounded-xl shadow-lg my-4 flex items-center gap-4">
                        <div className="flex-shrink-0">
                            {enrollment.student?.photo_url ? (
                                <img src={enrollment.student.photo_url} alt={`${enrollment.student.prenom} ${enrollment.student.nom}`} className="h-12 w-12 rounded-full object-cover shadow-md" />
                            ) : (
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-200 to-indigo-200 flex items-center justify-center font-bold text-xl text-indigo-800">
                                    {enrollment.student?.prenom?.[0] || ''}{enrollment.student?.nom?.[0] || ''}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">{enrollment.student?.prenom} {enrollment.student?.nom}</p>
                            <p className="text-xs text-gray-500">Classe: {enrollment.className} | Année: {year.name}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                        {subjectAverages.map((s: any) => {
                            const gradeColor = s.average >= 80 ? 'border-teal-400' : s.average >= 60 ? 'border-sky-400' : 'border-red-400';
                            const scaledScore = Number(s.max_grade) > 0 ? (s.average / 100) * Number(s.max_grade) : 0;
                            return (
                                <div key={s.id} className={`bg-white rounded-lg shadow-md border-l-4 ${gradeColor} p-1.5 flex flex-col justify-between`}>
                                    <div>
                                        <div className="flex justify-between items-baseline">
                                            <h4 className="font-bold text-gray-700 text-[11px]">{s.name}</h4>
                                            <span className="font-bold text-[11px] text-gray-800">
                                                {scaledScore.toFixed(2)} / {Number(s.max_grade).toFixed(0)}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                            <div className={`h-1 rounded-full ${s.average >= 80 ? 'bg-teal-500' : s.average >= 60 ? 'bg-sky-500' : 'bg-red-500'}`} style={{ width: `${s.average}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="mt-1.5">
                                        <AppreciationTextarea value={appreciations[s.id] || ''} onChange={e => onAppreciationChange(s.id, e.target.value)} className="text-[9px] italic text-gray-600" />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="mt-4 p-3 bg-white rounded-xl shadow-lg">
                        <div className="grid grid-cols-3 items-center">
                            <div className="col-span-2">
                                <h3 className="text-xs font-bold text-gray-800">Moyenne Générale</h3>
                                <AppreciationTextarea 
                                    value={generalAppreciation} 
                                    onChange={e => onGeneralAppreciationChange(e.target.value)} 
                                    className="text-[10px] italic text-gray-600 w-full bg-slate-50 rounded p-1"
                                />
                            </div>
                            <div className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-700 text-right">
                                {((generalAverage / 100) * averageBase).toFixed(2)} / {averageBase}
                            </div>
                        </div>
                    </div>

                    {renderAnnualSummary()}
                    <div className="mt-12 pt-6 flex justify-between items-end text-[10px] text-center">
                        <div className="w-2/5"><div className="border-t-2 border-gray-400 pt-2">Signature de la Direction</div></div>
                        <div className="w-2/5"><div className="border-t-2 border-gray-400 pt-2">Signature du Responsable</div></div>
                    </div>
                </div>
            );
        case 'creatif-compact':
             return (
                <div className="p-2 bg-slate-100 font-sans">
                    <div className="text-center mb-4">
                        {schoolInfo?.logo_url && <img src={schoolInfo.logo_url} alt="Logo" className="h-16 print:h-12 mx-auto mb-2 object-contain" />}
                        <h1 className="text-lg font-bold uppercase">{schoolInfo?.name}</h1>
                        <p className="text-xs">{`Année Académique ${year.name}`}</p>
                        <p className="text-xs">{schoolInfo?.address}</p>
                        <p className="text-xs">{schoolInfo?.phone}</p>
                        {schoolInfo?.email && <p className="text-xs">{schoolInfo.email}</p>}
                    </div>
                    <h2 className="text-center text-sm font-bold my-2 uppercase">{`BULLETIN: ${selectedPeriod?.name}`}</h2>
                    <div className="bg-white p-2.5 rounded-lg shadow-sm my-3 flex items-center gap-3">
                        <div className="flex-shrink-0">
                            {enrollment.student?.photo_url ? (
                                <img src={enrollment.student.photo_url} alt={`${enrollment.student.prenom} ${enrollment.student.nom}`} className="h-10 w-10 rounded-full object-cover shadow-sm" />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-800">
                                    {enrollment.student?.prenom?.[0] || ''}{enrollment.student?.nom?.[0] || ''}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">{enrollment.student?.prenom} {enrollment.student?.nom}</p>
                            <p className="text-xs text-gray-500">Classe: {enrollment.className} | Année: {year.name}</p>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        {subjectAverages.map((s: any) => {
                            const scaledScore = Number(s.max_grade) > 0 ? (s.average / 100) * Number(s.max_grade) : 0;
                            return (
                                <div key={s.id} className="bg-white rounded-md shadow-sm p-2">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-slate-700 text-xs">{s.name}</h4>
                                        <span className="font-bold text-xs text-slate-800">{scaledScore.toFixed(2)} / {Number(s.max_grade).toFixed(0)}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                        <div className={`h-1 rounded-full ${s.average >= 80 ? 'bg-teal-500' : s.average >= 60 ? 'bg-sky-500' : 'bg-red-500'}`} style={{ width: `${s.average}%` }}></div>
                                    </div>
                                    <AppreciationTextarea value={appreciations[s.id] || ''} onChange={e => onAppreciationChange(s.id, e.target.value)} className="text-[9px] italic text-gray-600 mt-1 w-full" />
                                </div>
                            )
                        })}
                    </div>
                     <div className="mt-3 p-2 bg-white rounded-lg shadow-sm">
                         <div className="flex justify-between items-center mb-1">
                            <h3 className="text-xs font-bold text-gray-800">Moyenne Générale</h3>
                            <div className="text-sm font-bold text-blue-700">
                                {((generalAverage / 100) * averageBase).toFixed(2)} / {averageBase}
                            </div>
                        </div>
                        <AppreciationTextarea value={generalAppreciation} onChange={e => onGeneralAppreciationChange(e.target.value)} className="text-[10px] italic text-gray-600 w-full bg-slate-50 rounded p-1" />
                    </div>
                    {renderAnnualSummary()}
                     <div className="mt-8 pt-4 flex justify-between items-end text-[9px] text-center">
                        <div className="w-2/5"><div className="border-t border-gray-400 pt-1">Signature du Responsable </div></div>
                        <div className="w-2/5"><div className="border-t border-gray-400 pt-1">Signature de la Direction</div></div>
                    </div>
                </div>
            );
        case 'elegant-compact':
            return (
                 <div className="p-3 bg-white font-sans text-[9pt]">
                    <div className="text-center mb-2">
                        <h1 className="text-lg font-bold text-gray-800">{schoolInfo?.name}</h1>
                        <p className="text-[8pt] text-gray-500">{`Bulletin Périodique - ${selectedPeriod?.name}`}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 text-[8pt] bg-slate-50 p-1 rounded-md border my-1">
                        <p><strong>Élève:</strong> {enrollment.student?.prenom} {enrollment.student?.nom}</p>
                        <p><strong>Classe:</strong> {enrollment.className}</p>
                    </div>
                    <table className="w-full text-[8pt] mt-2">
                        <thead className="border-b border-slate-200">
                            <tr>
                                <th className="py-0.5 px-1 text-left font-semibold text-gray-600">Matière</th>
                                <th className="py-0.5 px-1 w-24 text-center font-semibold text-gray-600">Moyenne (/100)</th>
                                <th className="py-0.5 px-1 text-left font-semibold text-gray-600">Appréciation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjectAverages.map((s: any) => (
                                <tr key={s.id} className="border-b border-slate-100">
                                    <td className="py-0 px-1 font-medium text-gray-700">{s.name}</td>
                                    <td className="py-0 px-1 text-center font-bold text-sm text-gray-800">{s.average.toFixed(2)}</td>
                                    <td className="py-0 px-1 text-gray-600 italic">
                                        <AppreciationTextarea value={appreciations[s.id] || ''} onChange={e => onAppreciationChange(s.id, e.target.value)} className="text-[8pt]" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     <div className="mt-1 flex justify-end">
                        <div className="bg-slate-100 p-1 rounded-md border">
                            <span className="text-gray-600 font-semibold text-[8pt]">Moyenne Générale: </span>
                            <span className="font-bold text-[9pt] text-blue-600">{((generalAverage / 100) * averageBase).toFixed(2)} / {averageBase}</span>
                        </div>
                    </div>
                    <div className="mt-1 bg-slate-50 p-1.5 rounded-md border">
                        <h4 className="font-semibold text-gray-600 text-[8pt]">Appréciation Générale:</h4>
                        <AppreciationTextarea value={generalAppreciation} onChange={e => onGeneralAppreciationChange(e.target.value)} className="text-[8pt]"/>
                    </div>
                    {renderAnnualSummary()}
                    <div className="mt-6 pt-2 flex justify-between items-end text-[8pt] text-center">
                        <div className="w-2/5"><div className="border-t border-gray-400 pt-1">Signature du Responsable </div></div>
                        <div className="w-2/5"><div className="border-t border-gray-400 pt-1">Signature de la Direction</div></div>
                    </div>
                </div>
            );
        default:
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
    const { selectedYear, classes } = useSchoolYear();
    const { user, hasPermission } = useAuth();
    
    const [academicPeriods, setAcademicPeriods] = useState<AcademicPeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    
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

    const getCacheKey = useCallback(() => {
        if (!selectedYear || !selectedClass || !selectedPeriodId) return null;
        return `/bulk-report-data?yearId=${selectedYear.id}&className=${selectedClass}&periodId=${selectedPeriodId}`;
    }, [selectedYear, selectedClass, selectedPeriodId]);

    useEffect(() => {
        if (classes.length > 0 && !selectedClass) {
            setSelectedClass(classes[0].name);
        }
    }, [classes, selectedClass]);

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
        const cacheKey = getCacheKey();
        if (!cacheKey) {
            setClassData(null);
            return;
        }
        setIsLoading(true);
        try {
            const data = await apiFetch(cacheKey);
            setClassData(data);
            setSelectedStudentIds(new Set(data.enrollments.map((en: Enrollment) => en.id)));
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [getCacheKey, addNotification]);
    
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
        // Optimistic UI update
        const updatedClassData = JSON.parse(JSON.stringify(classData));
        if (!updatedClassData.appreciationsByEnrollment[enrollmentId]) updatedClassData.appreciationsByEnrollment[enrollmentId] = {};
        updatedClassData.appreciationsByEnrollment[enrollmentId][subjectId] = value;
        setClassData(updatedClassData);
        setAppreciations(prev => ({...prev, [enrollmentId]: { ...(prev[enrollmentId] || {}), [subjectId]: value }}));
        
        if (appreciationSaveTimeout.current) clearTimeout(appreciationSaveTimeout.current);
        
        appreciationSaveTimeout.current = window.setTimeout(async () => {
            try {
                const result = await apiFetch('/appreciations', {
                    method: 'POST',
                    body: JSON.stringify({ enrollment_id: enrollmentId, subject_id: subjectId, period_id: selectedPeriodId, text: value })
                });
                if (result?.queued) {
                    const cacheKey = getCacheKey();
                    if(cacheKey) await db.saveData(cacheKey, updatedClassData);
                }
            } catch (err) {
                 if (err instanceof Error) addNotification({ type: 'error', message: `Sauvegarde échouée: ${err.message}` });
                 fetchClassData(); // Revert on error
            }
        }, 1000);
    };

    const handleGeneralAppreciationChange = (enrollmentId: number, value: string) => {
        // Optimistic UI update
        const updatedClassData = JSON.parse(JSON.stringify(classData));
        updatedClassData.generalAppreciationsByEnrollment[enrollmentId] = value;
        setClassData(updatedClassData);
        setGeneralAppreciations(prev => ({...prev, [enrollmentId]: value }));

        if (appreciationSaveTimeout.current) clearTimeout(appreciationSaveTimeout.current);

        appreciationSaveTimeout.current = window.setTimeout(async () => {
            try {
                const result = await apiFetch('/general-appreciations', {
                    method: 'POST',
                    body: JSON.stringify({ enrollment_id: enrollmentId, period_id: selectedPeriodId, text: value })
                });
                if (result?.queued) {
                    const cacheKey = getCacheKey();
                    if(cacheKey) await db.saveData(cacheKey, updatedClassData);
                }
            } catch (err) {
                if (err instanceof Error) addNotification({ type: 'error', message: `Sauvegarde échouée: ${err.message}` });
                fetchClassData(); // Revert on error
            }
        }, 1000);
    };
    
    const handleFinalPrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        let contentToPrint = '';
        const previewContainer = document.getElementById('bulk-preview-content');
        if (previewContainer) {
            const clonedContainer = previewContainer.cloneNode(true) as HTMLElement;
            clonedContainer.querySelectorAll('textarea').forEach(textarea => {
                const div = document.createElement('div');
                div.textContent = textarea.value;
                div.className = textarea.className;
                textarea.parentNode?.replaceChild(div, textarea);
            });
            contentToPrint = clonedContainer.innerHTML;
        }

        printWindow.document.write(`
            <html><head><title></title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Slab:wght@400;700&display=swap" rel="stylesheet">
            <style>
                @page { size: letter portrait; margin: 0; }
                body {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    font-size: 9pt; line-height: 1.15;
                }
                h1, h2, h3, h4, .font-display { font-family: 'Inter', sans-serif; }
                .font-serif { font-family: 'Roboto Slab', serif; }
                .student-report-block { page-break-after: always; }
                .student-report-block:last-of-type { page-break-after: auto; }
                .no-print { display: none !important; }
            </style>
            </head><body>${contentToPrint}</body></html>`);
        printWindow.document.close();
        printWindow.document.title = ""; 
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };
    
    const selectedEnrollments = useMemo(() => {
        if (!classData) return [];
        return classData.enrollments.filter(en => selectedStudentIds.has(en.id));
    }, [classData, selectedStudentIds]);

     const allEnrollmentsWithStats = useMemo(() => {
        if (!classData) return [];
        
        const averageBase = classData.subjects.some((s: ClassSubject) => Number(s.max_grade) >= 100) ? 100 : 10;

        return classData.enrollments.map(enrollment => {
            const gradesForStudent = classData.gradesByEnrollment[enrollment.id] || [];
            const gradesBySubject = gradesForStudent.reduce((acc, grade) => {
                if (!acc[grade.subject_id]) acc[grade.subject_id] = [];
                acc[grade.subject_id].push(grade);
                return acc;
            }, {} as Record<number, Grade[]>);
            
            let totalNotes = 0;
            let totalCoefficient = 0;
            
            classData.subjects.forEach(subject => {
                const subjectGrades = gradesBySubject[subject.subject_id] || [];
                const subjectScore = subjectGrades.reduce((sum, g) => sum + Number(g.score), 0);
                totalNotes += subjectScore;
                totalCoefficient += Number(subject.max_grade);
            });

            const studentAverage = totalCoefficient > 0 ? (totalNotes / totalCoefficient) * averageBase : 0;

            return { 
                enrollmentId: enrollment.id, 
                average: studentAverage, 
                totalNotes, 
                totalCoefficient,
                averageBase
            };
        });
    }, [classData]);

    const classAverage = useMemo(() => {
        if (!allEnrollmentsWithStats || allEnrollmentsWithStats.length === 0) return 0;
        const totalAverage = allEnrollmentsWithStats.reduce((sum, student) => sum + student.average, 0);
        return totalAverage / allEnrollmentsWithStats.length;
    }, [allEnrollmentsWithStats]);

    const studentRanks = useMemo(() => {
        if (!allEnrollmentsWithStats) return {};
        const sortedStudents = [...allEnrollmentsWithStats].sort((a, b) => b.average - a.average);
        const ranks: Record<number, number> = {};
        let rank = 1;
        let lastAvg = -1;
        sortedStudents.forEach((s, index) => {
            if (s.average !== lastAvg) {
                rank = index + 1;
            }
            ranks[s.enrollmentId] = rank;
            lastAvg = s.average;
        });
        return ranks;
    }, [allEnrollmentsWithStats]);

    const renderSelectionView = () => (
        <>
            <div className="bg-white p-6 rounded-xl shadow-md mb-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                 <div><label className="block text-sm font-medium text-slate-700 mb-1">Classe</label><select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md">{classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                 <div><label className="block text-sm font-medium text-slate-700 mb-1">Période</label><select value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md" disabled={academicPeriods.length === 0}>{academicPeriods.length === 0 ? <option>Aucune période</option> : academicPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                 <div className="md:col-span-2 flex items-center justify-end flex-wrap gap-2">
                    <h3 className="text-sm font-medium text-slate-700">Modèle de Bulletin</h3>
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg flex-wrap">
                        {(['moderne', 'classique', 'formel', 'annuel', 'détaillé', 'élégant', 'créatif', 'creatif-compact', 'elegant-compact'] as Template[]).map(t => 
                            <button key={t} onClick={() => setTemplate(t)} className={`px-3 py-1 text-sm rounded-md capitalize transition-colors ${template === t ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-200'}`}>
                                {t.replace('-compact', ' V2')}
                            </button>
                        )}
                    </div>
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
        const rankSuffix = (r: number) => { if (r === 1) return 'er'; return 'ème'; };

        return (
            <div>
                 <div className="bg-white p-4 rounded-xl shadow-md mb-8 flex justify-between items-center flex-wrap gap-4 no-print">
                    <div>
                        <button onClick={() => setIsPreviewMode(false)} className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors group font-medium"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>Retour à la sélection</button>
                        <h2 className="text-xl font-bold text-slate-800 font-display mt-2">Prévisualisation et Modification</h2>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg flex-wrap">
                           {(['moderne', 'classique', 'formel', 'annuel', 'détaillé', 'élégant', 'créatif', 'creatif-compact', 'elegant-compact'] as Template[]).map(t => 
                                <button key={t} onClick={() => setTemplate(t)} className={`px-3 py-1 text-sm rounded-md capitalize transition-colors ${template === t ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-200'}`}>
                                    {t.replace('-compact', ' V2')}
                                </button>
                            )}
                        </div>
                        <button onClick={handleFinalPrint} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700">Imprimer les Bulletins</button>
                    </div>
                </div>
                 <div id="bulk-preview-content" className="space-y-4">
                     {selectedEnrollments.map(enrollment => {
                         const studentStats = allEnrollmentsWithStats.find(s => s.enrollmentId === enrollment.id);
                         const rank = studentRanks[enrollment.id];
                         const gradesForStudent = classData?.gradesByEnrollment[enrollment.id] || [];
                         const gradesBySubject = gradesForStudent.reduce((acc, grade) => { if (!acc[grade.subject_id]) acc[grade.subject_id] = []; acc[grade.subject_id].push(grade); return acc; }, {} as Record<number, Grade[]>);
                         const subjectAverages = classData?.subjects.map(subject => { const subjectGrades = gradesBySubject[subject.subject_id] || []; const totalScore = subjectGrades.reduce((sum, g) => sum + Number(g.score), 0); const totalMaxScore = subjectGrades.reduce((sum, g) => sum + Number(g.max_score), 0); return { id: subject.subject_id, name: subject.subject_name, max_grade: subject.max_grade, average: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0 }; }) || [];
                         const generalAverage = subjectAverages.length > 0 ? subjectAverages.reduce((sum, s) => sum + s.average, 0) / subjectAverages.length : 0;
                         const studentAppreciations = appreciations[enrollment.id] || {};
                         const generalAppreciation = generalAppreciations[enrollment.id] || '';
                         const bulletinData = { schoolInfo, enrollment, year: selectedYear, selectedPeriod, subjectAverages, generalAverage, appreciations: studentAppreciations, gradesBySubject, generalAppreciation, formatDate, user, totalNotes: studentStats?.totalNotes || 0, totalCoefficient: studentStats?.totalCoefficient || 0, studentAverage: studentStats?.average || 0, averageBase: studentStats?.averageBase || 10, classAverage, rank: rank ? `${rank}${rankSuffix(rank)}` : 'N/A' };
                         
                         return (
                            <div key={enrollment.id} className={`bg-white shadow-lg student-report-block template-${template}`}>
                                <div className="flex justify-between items-center p-2 bg-slate-50 border-b no-print">
                                    <h3 className="font-bold text-slate-700">{enrollment.student?.prenom} {enrollment.student?.nom}</h3>
                                    {(hasPermission('grade:create') || user?.role === 'teacher') && (
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