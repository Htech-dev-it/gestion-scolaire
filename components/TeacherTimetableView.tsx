import React, { useState, useEffect, useCallback } from 'react';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import type { FullScheduleSlot } from '../types';

const timeSlots = Array.from({ length: 11 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`); // 08:00 to 18:00

const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const TeacherTimetableView: React.FC = () => {
    const { selectedYear } = useSchoolYear();
    const { addNotification } = useNotification();
    const [schedule, setSchedule] = useState<FullScheduleSlot[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!selectedYear) return;
        setIsLoading(true);
        try {
            const scheduleData = await apiFetch(`/teacher/timetable?yearId=${selectedYear.id}`);
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
    
    return (
        <div>
            <div className="overflow-x-auto mt-4 border rounded-lg bg-white">
                <div className="flex min-w-[1000px]">
                    {/* Time Column */}
                    <div className="w-24 flex-shrink-0 bg-slate-50">
                        <div className="h-12 flex items-center justify-center text-xs font-semibold text-slate-600 uppercase border-b border-r border-slate-200">Heure</div>
                        {timeSlots.map(time => (
                            <div key={time} className="h-24 flex justify-center items-start pt-2 text-sm font-semibold text-slate-700 border-b border-r border-slate-200">
                                {time}
                            </div>
                        ))}
                    </div>

                    {/* Schedule Grid */}
                    <div className="flex-grow grid grid-cols-6">
                        {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map((day, dayIndex) => (
                            <div key={day} className="border-r border-slate-200 relative">
                                <div className="h-12 flex items-center justify-center text-xs font-semibold text-slate-600 uppercase border-b border-slate-200">{day}</div>
                                
                                {/* Background cells */}
                                {timeSlots.map((time, timeIndex) => (
                                    <div key={timeIndex} className="h-24 border-b border-slate-200"></div>
                                ))}

                                {/* Slots for this day */}
                                {isLoading ? (
                                    dayIndex === 0 && <div className="absolute inset-0 flex items-center justify-center text-slate-500">Chargement...</div>
                                ) : (
                                    schedule.filter(slot => slot.day_of_week === dayIndex + 1).map(slot => {
                                        const startMinutes = timeToMinutes(slot.start_time);
                                        const endMinutes = timeToMinutes(slot.end_time);
                                        const durationMinutes = endMinutes - startMinutes;
                                        const top = ((startMinutes - timeToMinutes('08:00')) / 60) * 96;
                                        let height = (durationMinutes / 60) * 96;
                                        
                                        if (height <= 0) {
                                            height = 24;
                                        }

                                        return (
                                            <div key={slot.id}
                                                style={{ top: `${top + 48}px`, height: `${height}px` }}
                                                className="absolute left-1 right-1 bg-indigo-100 border-l-4 border-indigo-500 rounded-md shadow-sm flex flex-col z-10 overflow-hidden"
                                            >
                                                <div className="p-1 flex-grow overflow-hidden text-xs flex flex-col">
                                                    <p className="font-bold text-indigo-800 truncate" title={slot.subject_name}>{slot.subject_name}</p>
                                                     <p className="text-slate-700 font-semibold truncate" title={slot.class_name}>{slot.class_name}</p>
                                                    <p className="text-slate-600 truncate">{slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}</p>
                                                    <p className="text-slate-500 italic truncate" title={slot.location_name || 'N/A'}>
                                                        {slot.location_name || 'N/A'}
                                                    </p>
                                                    <p className="text-slate-500 truncate" title={`${slot.teacher_prenom} ${slot.teacher_nom}`}>
                                                        {slot.teacher_prenom} {slot.teacher_nom}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                 { !isLoading && schedule.length === 0 && (
                    <div className="text-center p-8 text-slate-500 italic">Aucun cours planifié pour cette année.</div>
                )}
            </div>
        </div>
    );
};

export default TeacherTimetableView;