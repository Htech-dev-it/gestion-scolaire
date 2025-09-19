import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import type { DailyAttendanceData, DailyAttendanceRecord, DailyStatus, AttendanceReportData, AttendanceReportRecord, Instance, ClassDefinition } from '../types';

interface AttendanceReportProps {
    classes: ClassDefinition[];
}

type StudentSummary = { id: string; nom: string; prenom: string; };

// --- NEW: DAILY ATTENDANCE SHEET (FOR ADMINS) ---

const StatusPicker: React.FC<{
    currentStatus: DailyStatus | null;
    onSelect: (status: DailyStatus | null) => void;
}> = ({ currentStatus, onSelect }) => {
    const statuses: { status: DailyStatus; label: string; color: string }[] = [
        { status: 'present', label: 'Présent', color: 'bg-green-500' },
        { status: 'absent', label: 'Absent', color: 'bg-red-500' },
        { status: 'late', label: 'En Retard', color: 'bg-yellow-500' },
        { status: 'justified', label: 'Justifié', color: 'bg-blue-500' }
    ];

    return (
        <div className="absolute z-20 mt-1 w-32 bg-white rounded-md shadow-lg border">
            {statuses.map(({ status, label, color }) => (
                <button
                    key={status}
                    onClick={() => onSelect(status)}
                    className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 ${currentStatus === status ? 'font-bold' : ''}`}
                >
                    <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${color}`}></span>
                    {label}
                </button>
            ))}
            <div className="border-t my-1"></div>
            <button onClick={() => onSelect(null)} className="block w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
                Effacer (auto)
            </button>
        </div>
    );
};

export const DailyAttendanceSheet: React.FC<AttendanceReportProps> = ({ classes }) => {
    const { addNotification } = useNotification();
    const { selectedYear } = useSchoolYear();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedClass, setSelectedClass] = useState(classes[0]?.name || '');
    const [dateRange, setDateRange] = useState(() => {
        const toLocalISOString = (date: Date) => {
            const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const today = new Date(); const dayOfWeek = today.getDay(); const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today); monday.setDate(today.getDate() + diffToMonday);
        const saturday = new Date(monday); saturday.setDate(monday.getDate() + 5);
        return { start: toLocalISOString(monday), end: toLocalISOString(saturday) };
    });
    const [reportData, setReportData] = useState<DailyAttendanceData | null>(null);
    const [activePicker, setActivePicker] = useState<string | null>(null); // studentId:date

    const fetchReportData = useCallback(async () => {
        if (!selectedYear || !selectedClass) return;
        setIsLoading(true);
        try {
            const data: DailyAttendanceData = await apiFetch(`/daily-attendance-report?yearId=${selectedYear.id}&className=${selectedClass}&startDate=${dateRange.start}&endDate=${dateRange.end}`);
            setReportData(data);
        } catch (error) { if (error instanceof Error) addNotification({ type: 'error', message: error.message }); }
        finally { setIsLoading(false); }
    }, [selectedYear, selectedClass, dateRange, addNotification]);
    
    useEffect(() => { fetchReportData(); }, [fetchReportData]);

    const handleStatusChange = async (studentId: string, date: string, status: DailyStatus | null) => {
        setActivePicker(null);
        const originalData = { ...reportData };
        setReportData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                records: prev.records.map((r: DailyAttendanceRecord) => r.student_id === studentId && r.date === date ? { ...r, status, is_manual_override: status !== null } : r)
            };
        });
        
        try {
            await apiFetch('/daily-attendance-override', {
                method: 'POST',
                body: JSON.stringify({ 
                    student_id: studentId, 
                    date, 
                    status,
                    yearId: selectedYear?.id
                })
            });
            if (status === null) {
                fetchReportData();
            }
        } catch (error) {
            setReportData(originalData as DailyAttendanceData);
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
        present: { bg: 'bg-green-100', text: 'text-green-800', label: 'Présent' },
        absent: { bg: 'bg-red-100', text: 'text-red-800', label: 'Absent' },
        late: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En Retard' },
        partial: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Partiel' },
        justified: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Justifié' }
    };

    return (
        <div>
            <div className="my-4 p-4 border rounded-lg flex flex-wrap gap-4 items-end">
                <div><label className="block text-sm font-medium text-gray-700">Classe</label><select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md">{classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700">Date de début</label><input type="date" value={dateRange.start} onChange={e => setDateRange(dr => ({ ...dr, start: e.target.value }))} className="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Date de fin</label><input type="date" value={dateRange.end} onChange={e => setDateRange(dr => ({ ...dr, end: e.target.value }))} className="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md" /></div>
            </div>

            {isLoading ? <div className="text-center p-8">Chargement...</div> :
             reportData && reportData.students.length > 0 ? (
                 <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border">
                        <thead><tr><th className="px-4 py-2 border-b text-left sticky left-0 bg-slate-50 z-10">Élève</th>{reportData.dates.map((date: string) => (<th key={date} className="px-2 py-2 border-b text-center text-sm font-medium whitespace-nowrap">{new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</th>))}</tr></thead>
                        <tbody>
                            {reportData.students.map((student: StudentSummary) => (
                                <tr key={student.id}>
                                    <td className="border px-4 py-2 font-medium whitespace-nowrap sticky left-0 bg-white z-10">{student.prenom} {student.nom}</td>
                                    {reportData.dates.map((date: string) => {
                                        const record = reportData.records.find((r: DailyAttendanceRecord) => r.student_id === student.id && r.date === date);
                                        const style = record?.status ? statusStyles[record.status] : { bg: 'bg-slate-50', text: '', label: '-' };
                                        const pickerId = `${student.id}:${date}`;
                                        return (
                                            <td key={date} className={`relative border text-center font-semibold cursor-pointer hover:bg-slate-200 transition-colors ${style.bg} ${style.text}`} onClick={() => setActivePicker(activePicker === pickerId ? null : pickerId)}>
                                                <div className="flex items-center justify-center p-2">
                                                    {record?.is_manual_override && <span className="absolute top-1 left-1 text-slate-400" title="Statut manuel">✏️</span>}
                                                    {style.label}
                                                </div>
                                                {activePicker === pickerId && <StatusPicker currentStatus={record?.status || null} onSelect={(status) => handleStatusChange(student.id, date, status)} />}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            ) : <p className="italic text-slate-500 text-center py-4">Aucune donnée de présence à afficher.</p>}
        </div>
    );
};

// --- DETAILED ATTENDANCE REPORT (PER COURSE) ---

export const DetailedAttendanceReport: React.FC<AttendanceReportProps> = ({ classes }) => {
    const { addNotification } = useNotification();
    const { selectedYear } = useSchoolYear();
    const [isLoading, setIsLoading] = useState(false);
    const [instanceInfo, setInstanceInfo] = useState<Instance | null>(null);
    const [selectedClass, setSelectedClass] = useState(classes[0]?.name || '');
    const [dateRange, setDateRange] = useState(() => {
        const toLocalISOString = (date: Date) => {
            const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const today = new Date(); const dayOfWeek = today.getDay(); const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today); monday.setDate(today.getDate() + diffToMonday);
        const saturday = new Date(monday); saturday.setDate(monday.getDate() + 5);
        return { start: toLocalISOString(monday), end: toLocalISOString(saturday) };
    });
    const [reportData, setReportData] = useState<AttendanceReportData | null>(null);
    
    useEffect(() => {
        if (classes.length > 0 && !classes.find((c: ClassDefinition) => c.name === selectedClass)) {
            setSelectedClass(classes[0].name);
        }
    }, [classes, selectedClass]);

    const fetchReportData = useCallback(async () => {
        if (!selectedYear || !selectedClass) return;
        setIsLoading(true);
        try {
            const data: AttendanceReportData = await apiFetch(`/attendance-report?yearId=${selectedYear.id}&className=${selectedClass}&startDate=${dateRange.start}&endDate=${dateRange.end}`);
            setReportData(data);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
            setReportData(null);
        } finally { setIsLoading(false); }
    }, [selectedYear, selectedClass, dateRange, addNotification]);
    
    useEffect(() => { fetchReportData(); }, [fetchReportData]);
    useEffect(() => { apiFetch('/instance/current').then(setInstanceInfo).catch(console.error); }, []);

    const processedData = useMemo(() => {
        if (!reportData) return new Map<string, Map<string, AttendanceReportRecord[]>>();
        const map = new Map<string, Map<string, AttendanceReportRecord[]>>();
        for (const record of reportData.records) {
            if (!map.has(record.student_id)) map.set(record.student_id, new Map());
            const studentMap = map.get(record.student_id)!;
            if (!studentMap.has(record.date)) studentMap.set(record.date, []);
            studentMap.get(record.date)!.push(record);
        }
        return map;
    }, [reportData]);

    const handlePrint = () => { /* Print logic can be added here */ };

    return (
        <div>
            <div className="my-4 p-4 border rounded-lg flex flex-wrap gap-4 items-end">
                <div><label className="block text-sm font-medium text-gray-700">Classe</label><select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md">{classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700">Date de début</label><input type="date" value={dateRange.start} onChange={e => setDateRange(dr => ({ ...dr, start: e.target.value }))} className="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Date de fin</label><input type="date" value={dateRange.end} onChange={e => setDateRange(dr => ({ ...dr, end: e.target.value }))} className="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md" /></div>
                 <button onClick={handlePrint} disabled={!reportData || reportData.students.length === 0} className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-slate-400">Imprimer</button>
            </div>

            {isLoading ? <div className="text-center p-8">Chargement du rapport...</div> :
             reportData && reportData.students.length > 0 ? (
                 <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border">
                        <thead><tr><th className="px-4 py-2 border-b text-left sticky left-0 bg-slate-50 z-10">Élève</th>{reportData.dates.map((date: string) => (<th key={date} className="px-2 py-2 border-b text-center text-sm font-medium whitespace-nowrap">{new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</th>))}</tr></thead>
                        <tbody>
                            {reportData.students.map((student: StudentSummary) => (
                                <tr key={student.id}>
                                    <td className="border px-4 py-2 font-medium whitespace-nowrap sticky left-0 bg-white z-10">{student.prenom} {student.nom}</td>
                                    {reportData.dates.map((date: string) => {
                                        const records = processedData.get(student.id)?.get(date);
                                        if (!records || records.length === 0) return <td key={date} className="border px-2 py-2 h-12 bg-slate-50 text-center text-slate-500 align-top">-</td>;
                                        const getStatusColor = (status: 'present' | 'absent' | 'late') => {
                                            switch (status) { case 'present': return 'bg-green-500'; case 'absent': return 'bg-red-500'; case 'late': return 'bg-yellow-500'; default: return 'bg-gray-400';}
                                        };
                                        return (
                                            <td key={date} className="border px-2 py-2 align-top text-xs min-w-[120px]">
                                                <div className="flex flex-wrap gap-1">{records.map((record: AttendanceReportRecord, index: number) => (<div key={index} className={`px-1.5 py-0.5 rounded text-white text-center ${getStatusColor(record.status)}`} title={`${record.subject_name}: ${record.status}`}>{record.subject_name}</div>))}</div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            ) : <p className="italic text-slate-500 text-center py-4">Aucune donnée de présence à afficher.</p>}
        </div>
    );
};
