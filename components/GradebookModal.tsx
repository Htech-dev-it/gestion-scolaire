import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Enrollment, Grade, SchoolYear, Instance, AcademicPeriod, ClassSubject } from '../types';
import { apiFetch } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import ConfirmationModal from './ConfirmationModal';
import { useAuth } from '../auth/AuthContext';


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
            <td className="p-2"><input type="number" value={form.score} onChange={e => setForm({...form, score: Number(e.target.value)})} className="w-16 p-1 border rounded" /></td>
            <td className="p-2"><input type="number" value={form.max_score} onChange={e => setForm({...form, max_score: Number(e.target.value)})} className="w-16 p-1 border rounded" /></td>
            <td className="p-2 text-center">{(form.max_score > 0 ? (form.score / form.max_score * 100) : 0).toFixed(1)}%</td>
            <td className="p-2 text-right space-x-2">
                <button onClick={handleUpdate} className="text-green-600 hover:text-green-800">Sauver</button>
                <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-slate-700">Annuler</button>
            </td>
        </tr>
    ) : (
        <tr>
            <td className="p-2">{grade.evaluation_name}</td>
            <td className="p-2 text-center">{grade.score}</td>
            <td className="p-2 text-center">{grade.max_score}</td>
            <td className="p-2 text-center font-semibold">{(grade.max_score > 0 ? (grade.score / grade.max_score * 100) : 0).toFixed(1)}%</td>
            <td className="p-2 text-right space-x-2">
                <button onClick={() => setIsEditing(true)} className="text-blue-600 hover:text-blue-800 text-xs">Modifier</button>
                <button onClick={() => onDeleteRequest(grade)} className="text-red-600 hover:text-red-800 text-xs">Supprimer</button>
            </td>
        </tr>
    );
};

const AddGradeForm: React.FC<{
    subjectId: number;
    enrollmentId: number;
    periodId: number;
    onAdd: () => void;
}> = ({ subjectId, enrollmentId, periodId, onAdd }) => {
    const { addNotification } = useNotification();
    const [form, setForm] = useState({ evaluation_name: '', score: 0, max_score: 20 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.evaluation_name.trim()) return addNotification({ type: 'error', message: "Le nom de l'évaluation est requis." });
        if (form.score > form.max_score) return addNotification({ type: 'error', message: "La note ne peut pas être supérieure à la note maximale." });
        
        setIsSubmitting(true);
        try {
            await apiFetch('/grades', {
                method: 'POST',
                body: JSON.stringify({ ...form, subject_id: subjectId, enrollment_id: enrollmentId, period_id: periodId }),
            });
            addNotification({ type: 'success', message: 'Note ajoutée.' });
            setForm({ evaluation_name: '', score: 0, max_score: 20 });
            onAdd();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="mt-4 p-3 bg-slate-100 rounded-md grid grid-cols-5 gap-3 items-end">
            <div className="col-span-2"><label className="text-xs font-medium text-slate-600">Nom de l'évaluation</label><input type="text" value={form.evaluation_name} onChange={e => setForm({...form, evaluation_name: e.target.value})} placeholder="Ex: Devoir 1" className="w-full p-2 border rounded-md text-sm" /></div>
            <div><label className="text-xs font-medium text-slate-600">Note</label><input type="number" value={form.score} onChange={e => setForm({...form, score: Number(e.target.value)})} className="w-full p-2 border rounded-md text-sm" /></div>
            <div><label className="text-xs font-medium text-slate-600">Sur</label><input type="number" value={form.max_score} onChange={e => setForm({...form, max_score: Number(e.target.value)})} className="w-full p-2 border rounded-md text-sm" /></div>
            <button type="submit" disabled={isSubmitting} className="col-span-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:bg-slate-400">{isSubmitting ? '...' : 'Ajouter'}</button>
        </form>
    );
};

const SubjectGradeSection: React.FC<{ 
    subject: ClassSubject;
    grades: Grade[];
    enrollmentId: number;
    periodId: number;
    onDataChange: () => void;
}> = ({ subject, grades, enrollmentId, periodId, onDataChange }) => {
    const { addNotification } = useNotification();
    const [isOpen, setIsOpen] = useState(false);
    const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);

    const totalMaxScore = useMemo(() => grades.reduce((sum, g) => sum + Number(g.max_score), 0), [grades]);

    const average = useMemo(() => {
        if (grades.length === 0) return 0;
        const totalScore = grades.reduce((sum, g) => sum + Number(g.score), 0);
        return totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    }, [grades, totalMaxScore]);
    
    const handleUpdateGrade = async (id: number, data: Partial<Grade>) => {
        try {
            await apiFetch(`/grades/${id}`, { method: 'PUT', body: JSON.stringify(data) });
            addNotification({ type: 'success', message: 'Note mise à jour.' });
            onDataChange();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleConfirmDelete = async () => {
        if (!gradeToDelete) return;
        try {
            await apiFetch(`/grades/${gradeToDelete.id}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: 'Note supprimée.' });
            onDataChange();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setGradeToDelete(null);
        }
    };
    
    return (
        <div className="bg-white rounded-lg shadow-sm">
            <div onClick={() => setIsOpen(!isOpen)} className="p-4 flex justify-between items-center cursor-pointer">
                <div>
                    <span className="font-semibold text-slate-800">{subject.subject_name}</span>
                    <div className="text-xs text-slate-500">Total des points : {totalMaxScore.toFixed(0)} / {Number(subject.max_grade).toFixed(2)}</div>
                </div>
                <div className="flex items-center">
                    <div className="text-right mr-4">
                        <span className="font-bold text-lg text-blue-700">{average.toFixed(1)}%</span>
                        <span className="text-xs text-slate-500 block">Moyenne</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-slate-500 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
            {isOpen && (
                <div className="px-4 pb-4">
                    {grades.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="border-b"><tr><th className="p-2 text-left font-medium text-slate-500">Évaluation</th><th className="p-2 font-medium text-slate-500">Note</th><th className="p-2 font-medium text-slate-500">Sur</th><th className="p-2 font-medium text-slate-500">%</th><th className="p-2"></th></tr></thead>
                            <tbody>{grades.map(grade => <GradeRow key={grade.id} grade={grade} onUpdate={handleUpdateGrade} onDeleteRequest={setGradeToDelete} />)}</tbody>
                        </table>
                    ) : <p className="text-sm text-slate-500 italic text-center py-4">Aucune note enregistrée pour cette matière.</p>}
                    <AddGradeForm subjectId={subject.subject_id} enrollmentId={enrollmentId} periodId={periodId} onAdd={onDataChange} />
                </div>
            )}
            {gradeToDelete && <ConfirmationModal isOpen={!!gradeToDelete} onClose={() => setGradeToDelete(null)} onConfirm={handleConfirmDelete} title="Confirmer la suppression" message={`Êtes-vous sûr de vouloir supprimer la note pour "${gradeToDelete.evaluation_name}" ?`} />}
        </div>
    );
};

interface GradebookModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    enrollment: Enrollment; 
    year: SchoolYear; 
    instanceInfo: Instance | null;
}

const GradebookModal: React.FC<GradebookModalProps> = ({ isOpen, onClose, enrollment, year, instanceInfo }) => {
    const { addNotification } = useNotification();
    const { user } = useAuth();
    const [subjects, setSubjects] = useState<ClassSubject[]>([]);
    const [academicPeriods, setAcademicPeriods] = useState<AcademicPeriod[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod | null>(null);
    const [gradesBySubject, setGradesBySubject] = useState<Record<number, Grade[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    
    const fetchInitialData = useCallback(async () => {
        if (!isOpen) return;
        setIsLoading(true);
        try {
            const [curriculumData, periodsData] = await Promise.all([
                apiFetch(`/curriculum?yearId=${year.id}&className=${enrollment.className}`),
                apiFetch(`/academic-periods?yearId=${year.id}`)
            ]);
            setSubjects(curriculumData.assigned);
            setAcademicPeriods(periodsData);
            if (periodsData.length > 0) {
                setSelectedPeriod(current => periodsData.find((p: AcademicPeriod) => p.id === current?.id) || periodsData[0]);
            } else {
                 setSelectedPeriod(null);
            }
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    }, [isOpen, year.id, enrollment.className, addNotification]);

    const fetchGradesForPeriod = useCallback(async () => {
        if (!selectedPeriod) {
            setGradesBySubject({});
            setIsLoading(false);
            return;
        };
        setIsLoading(true);
        try {
            const gradesData = await apiFetch(`/grades?enrollmentId=${enrollment.id}&periodId=${selectedPeriod.id}`);
            setGradesBySubject(gradesData);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [selectedPeriod, enrollment.id, addNotification]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
    useEffect(() => { fetchGradesForPeriod(); }, [fetchGradesForPeriod]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div className="bg-slate-50 rounded-xl shadow-2xl p-6 w-full max-w-4xl mx-4 my-8 h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex-shrink-0 flex justify-between items-start mb-4 border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold font-display">Carnet de Notes</h2>
                        <p className="text-slate-600"><span className="font-semibold">{enrollment.student?.prenom} {enrollment.student?.nom}</span> - {year.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {academicPeriods.length > 0 && 
                        <select value={selectedPeriod?.id || ''} onChange={e => setSelectedPeriod(academicPeriods.find(p => p.id === Number(e.target.value)) || null)} className="py-2 px-3 border rounded-md">
                            {academicPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        }
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    <p className="text-xs text-slate-500 mb-2 italic">Cliquez sur une matière pour voir ou ajouter des notes.</p>
                    {isLoading && <p>Chargement...</p>}
                    {!isLoading && selectedPeriod && subjects.length > 0 && 
                        <div className="space-y-4">{subjects.map(subject => 
                            <SubjectGradeSection 
                                key={subject.id} 
                                subject={subject} 
                                grades={gradesBySubject[subject.subject_id] || []} 
                                enrollmentId={enrollment.id} 
                                periodId={selectedPeriod.id} 
                                onDataChange={fetchGradesForPeriod}
                            />
                        )}</div>
                    }
                    {!isLoading && (!selectedPeriod || subjects.length === 0) && <div className="text-center italic text-slate-500 py-10">{!selectedPeriod ? "Aucune période définie pour cette année." : "Aucune matière assignée à cette classe."}</div>}
                </div>
            </div>
        </div>
    );
};

export default GradebookModal;