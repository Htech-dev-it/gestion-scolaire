import React, { useState, useEffect, useCallback } from 'react';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import type { Location, FullScheduleSlot, FullTeacherAssignment } from '../types';
import ConfirmationModal from './ConfirmationModal';

// --- Time Helpers ---
const timeSlots = Array.from({ length: 11 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`); // 08:00 to 18:00

const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

// --- Schedule Slot Modal ---
const ScheduleSlotModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    slotData: { day: number, startTime: string, slot?: FullScheduleSlot | null };
    locations: Location[];
    assignments: FullTeacherAssignment[];
}> = ({ isOpen, onClose, onSave, slotData, locations, assignments }) => {
    const { addNotification } = useNotification();
    const [assignmentId, setAssignmentId] = useState<string>('');
    const [locationId, setLocationId] = useState<string>('');
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setAssignmentId(slotData.slot?.assignment_id.toString() || '');
            setLocationId(slotData.slot?.location_id?.toString() || '');
            setStartTime(slotData.slot?.start_time.substring(0, 5) || slotData.startTime);
            setEndTime(slotData.slot?.end_time.substring(0, 5) || `${(parseInt(slotData.startTime.split(':')[0]) + 1).toString().padStart(2, '0')}:00`);
        }
    }, [isOpen, slotData]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (endTime <= startTime) {
            addNotification({ type: 'error', message: "L'heure de fin doit être strictement après l'heure de début." });
            return;
        }

        const data = {
            assignment_id: Number(assignmentId),
            day_of_week: slotData.day,
            start_time: `${startTime}:00`,
            end_time: `${endTime}:00`,
            location_id: locationId ? Number(locationId) : null,
        };
        onSave(data);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">{slotData.slot ? 'Modifier' : 'Ajouter'} un Cours</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Assignation (Professeur - Matière - Classe)</label>
                        <select
                            value={assignmentId}
                            onChange={e => setAssignmentId(e.target.value)}
                            required
                            className="w-full p-2 border rounded-md disabled:bg-slate-100"
                        >
                            <option value="" disabled>Sélectionner...</option>
                            {assignments.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.teacher_prenom} {a.teacher_nom} - {a.subject_name} ({a.class_name})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start_time" className="block text-sm font-medium">Heure de début</label>
                            <input id="start_time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="w-full p-2 border rounded-md" step="900" />
                        </div>
                        <div>
                            <label htmlFor="end_time" className="block text-sm font-medium">Heure de fin</label>
                            <input id="end_time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required className="w-full p-2 border rounded-md" step="900" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Salle</label>
                        <select value={locationId} onChange={e => setLocationId(e.target.value)} className="w-full p-2 border rounded-md">
                            <option value="">Aucune</option>
                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-md">Annuler</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Sauvegarder</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main Manager Component ---
const TimetableManager: React.FC = () => {
    const { selectedYear } = useSchoolYear();
    const { addNotification } = useNotification();
    const [locations, setLocations] = useState<Location[]>([]);
    const [schedule, setSchedule] = useState<FullScheduleSlot[]>([]);
    const [assignments, setAssignments] = useState<FullTeacherAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newLocationName, setNewLocationName] = useState('');
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; day?: number; startTime?: string; slot?: FullScheduleSlot | null }>({ isOpen: false });
    const [slotToDelete, setSlotToDelete] = useState<FullScheduleSlot | null>(null);

    const fetchData = useCallback(async () => {
        if (!selectedYear) return;
        setIsLoading(true);
        try {
            const [locationsData, scheduleData, assignmentsData] = await Promise.all([
                apiFetch('/locations'),
                apiFetch(`/timetable?yearId=${selectedYear.id}`),
                apiFetch(`/full-assignments?yearId=${selectedYear.id}`)
            ]);
            setLocations(locationsData);
            setSchedule(scheduleData);
            setAssignments(assignmentsData);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear, addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleLocationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLocationName.trim()) return;

        const isEditing = !!editingLocation;
        const url = isEditing ? `/locations/${editingLocation!.id}` : '/locations';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await apiFetch(url, { method, body: JSON.stringify({ name: newLocationName }) });
            addNotification({ type: 'success', message: `Salle ${isEditing ? 'mise à jour' : 'ajoutée'}.` });
            setNewLocationName('');
            setEditingLocation(null);
            fetchData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleEditLocationRequest = (location: Location) => {
        setEditingLocation(location);
        setNewLocationName(location.name);
    };

    const cancelEditLocation = () => {
        setEditingLocation(null);
        setNewLocationName('');
    };

    const handleConfirmDeleteLocation = async () => {
        if (!locationToDelete) return;
        try {
            await apiFetch(`/locations/${locationToDelete.id}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: 'Salle supprimée.' });
            setLocationToDelete(null);
            fetchData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };

    const handleSaveSlot = async (data: any) => {
        const isEditing = !!modalState.slot?.id;
        const url = isEditing ? `/timetable/${modalState.slot!.id}` : '/timetable';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await apiFetch(url, { method, body: JSON.stringify(data) });
            addNotification({ type: 'success', message: `Créneau ${isEditing ? 'mis à jour' : 'ajouté'}.` });
            setModalState({ isOpen: false });
            fetchData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleConfirmDeleteSlot = async () => {
        if (!slotToDelete) return;
        try {
            await apiFetch(`/timetable/${slotToDelete.id}`, { method: 'DELETE' });
            addNotification({ type: 'success', message: 'Créneau supprimé.' });
            fetchData();
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setSlotToDelete(null);
        }
    };


    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="md:col-span-1 bg-slate-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">{editingLocation ? 'Modifier la salle' : 'Gérer les Salles'}</h3>
                    <form onSubmit={handleLocationSubmit} className="flex gap-2 mb-2">
                        <input value={newLocationName} onChange={e => setNewLocationName(e.target.value)} placeholder="Nom de la salle" className="w-full p-2 border rounded-md" />
                        <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md">{editingLocation ? 'Mettre à jour' : 'Ajouter'}</button>
                        {editingLocation && <button type="button" onClick={cancelEditLocation} className="px-4 py-2 bg-slate-200 rounded-md">Annuler</button>}
                    </form>
                    <ul className="space-y-1 text-sm">
                        {locations.map(loc => (
                            <li key={loc.id} className="flex justify-between items-center p-2 bg-white rounded">
                                {loc.name}
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handleEditLocationRequest(loc)} className="p-1 text-blue-500 hover:bg-blue-100 rounded-full" title="Modifier">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                    </button>
                                    <button onClick={() => setLocationToDelete(loc)} className="p-1 text-red-500 hover:bg-red-100 rounded-full" title="Supprimer">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            
            <h2 className="text-xl font-semibold text-slate-700 font-display">Emploi du Temps - {selectedYear?.name}</h2>
             <div className="mt-4 border rounded-lg bg-white overflow-x-auto">
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
                                
                                {/* Layer for clickable background cells */}
                                <div className="absolute top-12 inset-x-0 bottom-0 z-0">
                                    {timeSlots.map((time) => (
                                        <div 
                                            key={time} 
                                            className="h-24 border-b border-slate-200 group"
                                            onClick={() => setModalState({ isOpen: true, day: dayIndex + 1, startTime: time, slot: null })}
                                        >
                                            <div className="w-full h-full opacity-0 group-hover:opacity-100 bg-green-100/50 flex items-center justify-center transition-opacity cursor-pointer" aria-label={`Ajouter un créneau le ${day} à ${time}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Layer for scheduled slots */}
                                <div className="absolute top-12 inset-x-0 bottom-0 z-10 pointer-events-none">
                                    {schedule.filter(slot => slot.day_of_week === dayIndex + 1).map(slot => {
                                        const startMinutes = timeToMinutes(slot.start_time);
                                        const endMinutes = timeToMinutes(slot.end_time);
                                        const durationMinutes = endMinutes - startMinutes;
                                        const topOffset = ((startMinutes - timeToMinutes('08:00')) / 60) * 96;
                                        let height = (durationMinutes / 60) * 96;

                                        if (height <= 0) {
                                            height = 24;
                                        }

                                        return (
                                            <div key={slot.id}
                                                style={{ top: `${topOffset}px`, height: `${height}px` }}
                                                className="absolute left-1 right-1 bg-blue-100 border-l-4 border-blue-500 rounded-md shadow-sm group cursor-pointer flex flex-col pointer-events-auto hover:z-20 hover:shadow-lg transition-all overflow-hidden"
                                                onClick={() => setModalState({ isOpen: true, day: slot.day_of_week, startTime: slot.start_time.substring(0,5), slot })}
                                                title="Cliquez pour modifier"
                                            >
                                                <div className="p-1 flex-grow overflow-hidden text-xs flex flex-col">
                                                    <p className="font-bold text-blue-800 truncate" title={slot.subject_name}>{slot.subject_name}</p>
                                                    <p className="text-slate-600 truncate">{slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}</p>
                                                    <p className="text-slate-500 italic truncate" title={slot.location_name || 'N/A'}>
                                                        {slot.location_name || 'N/A'}
                                                    </p>
                                                    <p className="text-slate-500 truncate" title={`${slot.teacher_prenom} ${slot.teacher_nom}`}>
                                                        {slot.teacher_prenom} {slot.teacher_nom}
                                                    </p>
                                                </div>
                                                <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); setSlotToDelete(slot); }} className="p-1 bg-red-100 text-red-600 rounded-full" title="Supprimer">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {locationToDelete && (
                <ConfirmationModal isOpen={!!locationToDelete} onClose={() => setLocationToDelete(null)} onConfirm={handleConfirmDeleteLocation} title="Supprimer la Salle" message={`Confirmez-vous la suppression de "${locationToDelete.name}" ? Les cours assignés à cette salle ne seront pas supprimés, mais n'auront plus de salle.`} />
            )}

            {slotToDelete && (
                <ConfirmationModal
                    isOpen={!!slotToDelete}
                    onClose={() => setSlotToDelete(null)}
                    onConfirm={handleConfirmDeleteSlot}
                    title="Supprimer le créneau"
                    message={`Confirmez-vous la suppression du cours de ${slotToDelete.subject_name} (${slotToDelete.class_name}) ?`}
                />
            )}

            <ScheduleSlotModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ isOpen: false })}
                onSave={handleSaveSlot}
                slotData={modalState as any}
                locations={locations}
                assignments={assignments}
            />
        </div>
    );
};

export default TimetableManager;