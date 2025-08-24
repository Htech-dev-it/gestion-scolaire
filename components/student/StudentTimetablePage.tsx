import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useSchoolYear } from '../../contexts/SchoolYearContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiFetch } from '../../utils/api';
import type { FullScheduleSlot } from '../../types';

const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const StudentTimetablePage: React.FC = () => {
    const { selectedYear } = useSchoolYear();
    const { addNotification } = useNotification();
    const [schedule, setSchedule] = useState<FullScheduleSlot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const { timeSlots, gridStartHour } = useMemo(() => {
        let minHour = 7;
        let maxHour = 18;

        if (schedule.length > 0) {
            const startMinutes = schedule.map(s => timeToMinutes(s.start_time));
            const endMinutes = schedule.map(s => timeToMinutes(s.end_time));

            const scheduleMinHour = Math.floor(Math.min(...startMinutes) / 60);
            const scheduleMaxHour = Math.ceil(Math.max(...endMinutes) / 60);

            minHour = Math.min(minHour, scheduleMinHour);
            maxHour = Math.max(maxHour, scheduleMaxHour);
        }

        const slots = Array.from({ length: maxHour - minHour + 1 }, (_, i) => `${(minHour + i).toString().padStart(2, '0')}:00`);
        return { timeSlots: slots, gridStartHour: minHour };
    }, [schedule]);

    const fetchData = useCallback(async () => {
        if (!selectedYear) {
            setIsLoading(false);
            return;
        };
        setIsLoading(true);
        try {
            const scheduleData = await apiFetch(`/student/timetable?yearId=${selectedYear.id}`);
            setSchedule(scheduleData);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear, addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    useEffect(() => {
        if (scrollContainerRef.current && !isLoading) {
            const sevenAmIndex = timeSlots.indexOf('07:00');
            if (sevenAmIndex !== -1) {
                scrollContainerRef.current.scrollTop = sevenAmIndex * 64; // 64 is the height of a row
            } else {
                scrollContainerRef.current.scrollTop = 0; // Otherwise scroll to top
            }
        }
    }, [isLoading, timeSlots]);
    
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
             <header className="mb-8">
                <ReactRouterDOM.Link to="/student" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>Retour</ReactRouterDOM.Link>
                <h1 className="text-4xl font-bold text-gray-800 font-display">Mon Emploi du Temps</h1>
                <p className="text-lg text-slate-500 mt-2">Horaire des cours pour l'année {selectedYear?.name}</p>
            </header>

            <div className="mt-4 border rounded-lg bg-white shadow-lg min-w-[1000px] flex flex-col">
                {/* Header */}
                <div className="flex flex-shrink-0">
                    <div className="w-24 flex-shrink-0 h-12 flex items-center justify-center text-xs font-semibold text-slate-600 uppercase border-b border-r border-slate-200">Heure</div>
                    <div className="flex-grow grid grid-cols-6">
                        {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map((day) => (
                            <div key={day} className="h-12 flex items-center justify-center text-xs font-semibold text-slate-600 uppercase border-b border-r border-slate-200 last:border-r-0">
                                {day}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scrollable Body */}
                <div ref={scrollContainerRef} className="overflow-y-auto" style={{ height: '44rem' }}>
                    <div className="flex">
                        {/* Time Column */}
                        <div className="w-24 flex-shrink-0 bg-slate-50">
                            {timeSlots.map(time => (
                                <div key={time} className="h-16 flex justify-center items-start pt-2 text-sm font-semibold text-slate-700 border-b border-r border-slate-200">
                                    {time}
                                </div>
                            ))}
                        </div>

                        {/* Schedule Grid */}
                        <div className="flex-grow grid grid-cols-6 relative">
                             {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map((day, dayIndex) => (
                                <div key={day} className="border-r border-slate-200 last:border-r-0">
                                    {timeSlots.map((time) => (
                                        <div key={time} className="h-16 border-b border-slate-200"></div>
                                    ))}
                                </div>
                            ))}
                            {/* Scheduled slots layer */}
                            {isLoading ? (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">Chargement...</div>
                            ) : (
                                schedule.map(slot => {
                                    const startMinutes = timeToMinutes(slot.start_time);
                                    const endMinutes = timeToMinutes(slot.end_time);
                                    const durationMinutes = endMinutes - startMinutes;
                                    const topOffset = ((startMinutes - timeToMinutes(`${gridStartHour.toString().padStart(2, '0')}:00`)) / 60) * 64;
                                    let height = (durationMinutes / 60) * 64;

                                    if (height <= 0) height = 16;
                                    
                                    const left = `calc(${(slot.day_of_week - 1) * (100 / 6)}% + 4px)`;
                                    const width = `calc(${(100 / 6)}% - 8px)`;


                                    return (
                                        <div key={slot.id}
                                            style={{ top: `${topOffset}px`, height: `${height}px`, left, width }}
                                            className="absolute bg-blue-100 border-l-4 border-blue-500 rounded-md shadow-sm flex flex-col z-10 overflow-hidden"
                                        >
                                            <div className="p-1 flex-grow overflow-hidden text-xs flex flex-col">
                                                <p className="font-bold text-blue-800 truncate" title={slot.subject_name}>{slot.subject_name}</p>
                                                <p className="text-slate-600 truncate">{slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}</p>
                                                <p className="text-slate-500 italic truncate" title={slot.location_name || 'N/A'}>
                                                    Salle: {slot.location_name || 'N/A'}
                                                </p>
                                                <p className="text-slate-500 truncate" title={`${slot.teacher_prenom} ${slot.teacher_nom}`}>
                                                    Prof: {slot.teacher_prenom} {slot.teacher_nom}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                    { !isLoading && schedule.length === 0 && (
                        <div className="text-center p-8 text-slate-500 italic">Aucun cours planifié dans votre emploi du temps pour cette année.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentTimetablePage;