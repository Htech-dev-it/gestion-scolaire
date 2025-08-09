import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import { CLASSES } from '../constants';
import type { AttendanceReportData, AttendanceReportRecord, Instance } from '../types';
import Tooltip from './Tooltip';

const AttendanceReport: React.FC = () => {
    const { addNotification } = useNotification();
    const { selectedYear } = useSchoolYear();
    const [isLoading, setIsLoading] = useState(false);
    const [instanceInfo, setInstanceInfo] = useState<Instance | null>(null);

    // Filters
    const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
    const [dateRange, setDateRange] = useState(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday);

        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 5);

        return {
            start: monday.toISOString().split('T')[0],
            end: saturday.toISOString().split('T')[0],
        };
    });

    // Data
    const [reportData, setReportData] = useState<AttendanceReportData | null>(null);

    const fetchReportData = useCallback(async () => {
        if (!selectedYear) return;
        setIsLoading(true);
        try {
            const data = await apiFetch(`/attendance-report?yearId=${selectedYear.id}&className=${selectedClass}&startDate=${dateRange.start}&endDate=${dateRange.end}`);
            setReportData(data);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
            setReportData(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear, selectedClass, dateRange, addNotification]);

    // Fetch data automatically when filters change
    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);
    
    useEffect(() => {
        const fetchInstanceInfo = async () => {
            try { setInstanceInfo(await apiFetch('/instance/current')); } catch(e) { console.error(e); }
        };
        fetchInstanceInfo();
    }, []);

    const processedData = useMemo(() => {
        if (!reportData) return new Map();
        const map = new Map<string, Map<string, AttendanceReportRecord[]>>();
        for (const record of reportData.records) {
            if (!map.has(record.student_id)) {
                map.set(record.student_id, new Map());
            }
            const studentMap = map.get(record.student_id)!;
            if (!studentMap.has(record.date)) {
                studentMap.set(record.date, []);
            }
            studentMap.get(record.date)!.push(record);
        }
        return map;
    }, [reportData]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow || !reportData) return;

        const tableHeader = `
            <tr>
                <th style="padding: 4px; border: 1px solid #ddd; text-align: left;">Élève</th>
                ${reportData.dates.map(date => `<th style="padding: 4px; border: 1px solid #ddd; text-align: center;">${new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</th>`).join('')}
            </tr>`;

        const tableBody = reportData.students.map(student => {
            const cells = reportData.dates.map(date => {
                const records = processedData.get(student.id)?.get(date);
                let bgColor = '#f8f9fa'; // Default light gray
                let label = '';
                if (records && records.length > 0) {
                    if (records.some((r: AttendanceReportRecord) => r.status === 'absent')) {
                        bgColor = '#f8d7da'; // Red
                        label = 'Absent';
                    } else if (records.some((r: AttendanceReportRecord) => r.status === 'late')) {
                        bgColor = '#fff3cd'; // Yellow
                        label = 'En Retard';
                    } else {
                        bgColor = '#d4edda'; // Green
                        label = 'Présent';
                    }
                }
                return `<td style="padding: 4px; border: 1px solid #ddd; background-color: ${bgColor}; text-align: center; font-size: 8pt;">${label}</td>`;
            }).join('');
            return `<tr><td style="padding: 4px; border: 1px solid #ddd;">${student.prenom} ${student.nom}</td>${cells}</tr>`;
        }).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Rapport de Présence - ${selectedClass}</title>
                    <style>
                        body { font-family: Arial, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        .header { text-align: center; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; font-size: 9pt; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>${instanceInfo?.name || ''}</h1>
                        <h2>Rapport de Présence - Classe: ${selectedClass}</h2>
                        <p>Du ${new Date(dateRange.start + 'T00:00:00').toLocaleDateString('fr-FR')} au ${new Date(dateRange.end + 'T00:00:00').toLocaleDateString('fr-FR')}</p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                        <thead>${tableHeader}</thead>
                        <tbody>${tableBody}</tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    return (
        <div>
            <div className="my-4 p-4 border rounded-lg flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Classe</label>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md">
                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Date de début</label>
                    <input type="date" value={dateRange.start} onChange={e => setDateRange(dr => ({ ...dr, start: e.target.value }))} className="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Date de fin</label>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange(dr => ({ ...dr, end: e.target.value }))} className="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md" />
                </div>
                 <button onClick={handlePrint} disabled={!reportData || reportData.students.length === 0} className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-slate-400">
                    Imprimer
                </button>
            </div>

            {isLoading ? <div className="text-center p-8">Chargement du rapport...</div> :
             reportData ? (
                 reportData.students.length === 0 ? <p className="italic text-slate-500">Aucun élève trouvé pour cette classe.</p> :
                 <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border">
                        <thead>
                            <tr>
                                <th className="px-4 py-2 border-b text-left">Élève</th>
                                {reportData.dates.map(date => (
                                    <th key={date} className="px-2 py-2 border-b text-center text-sm font-medium">
                                        {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.students.map(student => (
                                <tr key={student.id}>
                                    <td className="border px-4 py-2 font-medium">{student.prenom} {student.nom}</td>
                                    {reportData.dates.map(date => {
                                        const records = processedData.get(student.id)?.get(date);
                                        
                                        if (!records || records.length === 0) {
                                            return <td key={date} className="border px-2 py-2 h-12"></td>;
                                        }

                                        const isAbsent = records.some((r: AttendanceReportRecord) => r.status === 'absent');
                                        const isLate = records.some((r: AttendanceReportRecord) => r.status === 'late');
                                        
                                        let bgColor = 'bg-green-100';
                                        let label = 'Présent';
                                        let textColor = 'text-green-800';

                                        if (isAbsent) {
                                            bgColor = 'bg-red-200';
                                            label = 'Absent';
                                            textColor = 'text-red-800';
                                        } else if (isLate) {
                                            bgColor = 'bg-yellow-100';
                                            label = 'En Retard';
                                            textColor = 'text-yellow-800';
                                        }

                                        const tooltipContent = (
                                            <ul>{records.map((r: AttendanceReportRecord, i: number) => <li key={i}>{r.subject_name}: <span className="font-semibold">{r.status}</span></li>)}</ul>
                                        );

                                        return (
                                            <td key={date} className={`border text-center ${bgColor}`}>
                                                <Tooltip text={tooltipContent}>
                                                    <div className={`w-full h-12 flex items-center justify-center text-xs font-semibold ${textColor}`}>
                                                       {label}
                                                    </div>
                                                </Tooltip>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            ) : <p className="italic text-slate-500">Le rapport s'affichera ici.</p>}
        </div>
    );
};

export default AttendanceReport;