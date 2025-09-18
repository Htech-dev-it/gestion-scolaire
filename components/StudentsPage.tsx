import React, { useState, useCallback, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import type { StudentProfile, StudentWithEnrollment, Instance, StudentFormState, PaginationInfo, PaginatedStudents } from '../types';
import { EMPTY_STUDENT_FORM } from '../constants';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import * as db from '../utils/db';
import StudentForm from './StudentForm';
import AllStudentsTable from './AllStudentsTable';
import ConfirmationModal from './ConfirmationModal';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import EnrollmentForm from './EnrollmentForm';
import BulkEnrollmentForm from './BulkEnrollmentForm';
import StudentDetailModal from './StudentDetailModal';
import ChangeClassModal from './ChangeClassModal';
import { v4 as uuidv4 } from 'uuid';

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


const StudentsPage: React.FC = () => {
  const { addNotification } = useNotification();
  const { selectedYear, isLoading: isYearLoading, error: yearError, classes } = useSchoolYear();
  
  const [students, setStudents] = useState<StudentWithEnrollment[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [instanceInfo, setInstanceInfo] = useState<Instance | null>(null);

  const [editingStudent, setEditingStudent] = useState<StudentWithEnrollment | null>(null);
  const [formState, setFormState] = useState<StudentFormState>(EMPTY_STUDENT_FORM);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isEnrollModalOpen, setEnrollModalOpen] = useState(false);
  const [studentToEnroll, setStudentToEnroll] = useState<StudentProfile | null>(null);
  const [isBulkEnrollModalOpen, setBulkEnrollModalOpen] = useState(false);
  const [studentToView, setStudentToView] = useState<StudentProfile | null>(null);
  const [isChangeClassModalOpen, setChangeClassModalOpen] = useState(false);
  const [classFilter, setClassFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  
  const getCacheKey = useCallback((page: number) => {
    if (!selectedYear) return null;
    const params = new URLSearchParams({
        yearId: selectedYear.id.toString(),
        page: page.toString(),
        limit: '25',
        includeArchived: String(showArchived),
        classFilter
    });
    return `/students-with-enrollment-status?${params.toString()}`;
  }, [selectedYear, showArchived, classFilter]);
  
  const fetchStudents = useCallback(async (page: number) => {
        if (!selectedYear) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const cacheKey = getCacheKey(page);
            if (!cacheKey) return;

            const data: PaginatedStudents = await apiFetch(cacheKey);
            setStudents(data.students);
            setPagination(data.pagination);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear, addNotification, getCacheKey]);

    useEffect(() => {
        fetchStudents(currentPage);
    }, [fetchStudents, currentPage]);
    
    useEffect(() => {
        setCurrentPage(1); // Reset to first page on filter change
    }, [showArchived, classFilter]);
    
    useEffect(() => {
        apiFetch('/instance/current').then(setInstanceInfo).catch(console.error);
    }, []);

    const resetForm = useCallback(() => {
        setEditingStudent(null);
        setFormState(EMPTY_STUDENT_FORM);
    }, []);
    
    const handleEditRequest = (student: StudentWithEnrollment) => {
        setEditingStudent(student);
        let medicalData: { blood_group: string | null, allergies: string | null, illnesses: string | null } = { blood_group: null, allergies: null, illnesses: null };
        
        if (student.medical_notes) {
            try {
                // First, try to parse as JSON (new format)
                const parsed = JSON.parse(student.medical_notes);
                medicalData.blood_group = parsed.blood_group || null;
                medicalData.allergies = parsed.allergies || null;
                medicalData.illnesses = parsed.illnesses || null;
            } catch (e) {
                // If JSON parsing fails, it's likely the old string format
                const parts = student.medical_notes.split(' | ');
                parts.forEach(part => {
                    if (part.startsWith('Groupe Sanguin: ')) medicalData.blood_group = part.substring(16);
                    else if (part.startsWith('Allergies: ')) medicalData.allergies = part.substring(11);
                    else if (part.startsWith('Maladies: ')) medicalData.illnesses = part.substring(10);
                });
            }
        }
        
        const safeFormatDateForInput = (dateString: string | null): string | null => {
            if (!dateString) return null;
            const date = new Date(dateString);
            const userTimezoneOffset = date.getTimezoneOffset() * 60000;
            const correctedDate = new Date(date.getTime() + userTimezoneOffset);
            return correctedDate.toISOString().split('T')[0];
        };

        setFormState({
            nom: student.nom,
            prenom: student.prenom,
            sexe: student.sexe || '',
            date_of_birth: safeFormatDateForInput(student.date_of_birth),
            address: student.address,
            photo_url: student.photo_url,
            tutor_name: student.tutor_name,
            tutor_phone: student.tutor_phone,
            tutor_email: student.tutor_email,
            ...medicalData,
            classe_ref: student.classe_ref || '',
            hasNisu: !!student.nisu,
            nisu: student.nisu || '',
            enrollNow: false,
            enrollmentClassName: student.enrollment?.className || '',
            enrollmentMppa: student.enrollment?.mppa || 0,
            enrollmentId: student.enrollment?.id || null,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isEditing = !!editingStudent;

        const medical_notes = JSON.stringify({
            blood_group: formState.blood_group || null,
            allergies: formState.allergies || null,
            illnesses: formState.illnesses || null
        });

        // FIX: Ensure `sexe` and `nisu` types match StudentWithEnrollment for optimistic updates.
        // `sexe` in form state can be `''`, which is not assignable to `'M' | 'F' | null`. Convert `''` to `null`.
        // `nisu` can become `undefined`, which is not assignable to `string | null`. Convert `undefined` to `null`.
        const profileData = {
            nom: formState.nom,
            prenom: formState.prenom,
            sexe: formState.sexe === '' ? null : formState.sexe,
            date_of_birth: formState.date_of_birth,
            address: formState.address,
            photo_url: formState.photo_url,
            tutor_name: formState.tutor_name,
            tutor_phone: formState.tutor_phone,
            tutor_email: formState.tutor_email,
            medical_notes,
            classe_ref: formState.classe_ref,
            nisu: formState.hasNisu ? formState.nisu : null
        };
        
        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `/students/${editingStudent.id}` : '/students';
        
        let payload: any = { ...profileData };
        if (!isEditing) payload.id = uuidv4();

        if (isEditing) {
            payload.mppa = formState.enrollmentMppa;
            payload.enrollmentId = formState.enrollmentId;
        } else {
            if (formState.enrollNow && selectedYear) {
                payload.enrollment = {
                    year_id: selectedYear.id,
                    className: formState.enrollmentClassName,
                    mppa: formState.enrollmentMppa
                };
            }
        }

        try {
            const result = await apiFetch(url, { method, body: JSON.stringify(payload) });

            if (result?.queued) {
                const cacheKey = getCacheKey(currentPage);
                if (cacheKey) {
                    let updatedStudents: StudentWithEnrollment[];
                    if (isEditing) {
                        updatedStudents = students.map(s => s.id === editingStudent.id ? { ...editingStudent, ...profileData } : s);
                    } else {
                        const newStudent: StudentWithEnrollment = {
                            ...profileData,
                            id: payload.id,
                            status: 'active',
                            instance_id: instanceInfo!.id,
                            enrollment: payload.enrollment ? { ...payload.enrollment, id: Date.now() } : undefined,
                        };
                        updatedStudents = [newStudent, ...students];
                    }
                    await db.saveData(cacheKey, { students: updatedStudents, pagination });
                    setStudents(updatedStudents);
                }
            }
            
            addNotification({ type: 'success', message: `Élève ${isEditing ? 'mis à jour' : 'ajouté'}.` });
            resetForm();
            if(!result?.queued) await fetchStudents(isEditing ? currentPage : 1);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleDeleteRequest = () => {
        if (selectedIds.size > 0) {
            setDeleteModalOpen(true);
        }
    };

    const handleConfirmDelete = async () => {
        try {
            const result = await apiFetch('/students/delete', {
                method: 'POST',
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            });
            
            if (result?.queued) {
                const cacheKey = getCacheKey(currentPage);
                if (cacheKey) {
                    const updatedStudents = students.filter(s => !selectedIds.has(s.id));
                    await db.saveData(cacheKey, { students: updatedStudents, pagination });
                    setStudents(updatedStudents);
                }
            }

            addNotification({ type: 'success', message: 'Élèves supprimés.' });
            setSelectedIds(new Set());
            if (!result?.queued) await fetchStudents(1);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setDeleteModalOpen(false);
        }
    };
    
    const handleSetStatusRequest = async (status: 'active' | 'archived') => {
        try {
            const result = await apiFetch('/students/status', {
                method: 'POST',
                body: JSON.stringify({ ids: Array.from(selectedIds), status }),
            });

            if (result?.queued) {
                const cacheKey = getCacheKey(currentPage);
                if (cacheKey) {
                    const updatedStudents = students.filter(s => !selectedIds.has(s.id));
                    await db.saveData(cacheKey, { students: updatedStudents, pagination });
                    setStudents(updatedStudents);
                }
            }
            
            addNotification({ type: 'success', message: `Élèves ${status === 'active' ? 'réactivés' : 'archivés'}.` });
            setSelectedIds(new Set());
            if (!result?.queued) await fetchStudents(1);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        }
    };
    
    const handleEnrollRequest = (student: StudentProfile) => {
        setStudentToEnroll(student);
        setEnrollModalOpen(true);
    };

    const handleEnrollSubmit = async (className: string, mppa: number) => {
        if (!studentToEnroll || !selectedYear) return;
        try {
            const result = await apiFetch('/enrollments', {
                method: 'POST',
                body: JSON.stringify({ student_id: studentToEnroll.id, year_id: selectedYear.id, className, mppa }),
            });
            
            if(result?.queued) {
                // Optimistic UI update for single enrollment
                const cacheKey = getCacheKey(currentPage);
                if (cacheKey) {
                    const updatedStudents = students.map(s => {
                        if (s.id === studentToEnroll.id) {
                            return { ...s, enrollment: { id: Date.now(), className, mppa, adjustments: [] }};
                        }
                        return s;
                    });
                    await db.saveData(cacheKey, { students: updatedStudents, pagination });
                    setStudents(updatedStudents);
                }
            }
            
            addNotification({ type: 'success', message: `${studentToEnroll.prenom} a été inscrit(e).` });
            if (!result?.queued) await fetchStudents(currentPage);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setEnrollModalOpen(false);
            setStudentToEnroll(null);
        }
    };
    
    const handleBulkEnrollRequest = () => {
        if (selectedIds.size > 0) {
            setBulkEnrollModalOpen(true);
        }
    };
    
    const handleBulkEnrollSubmit = async (className: string, mppa: number) => {
        if (!selectedYear) return;
        
        const unrolledSelectedIds = students.filter(s => selectedIds.has(s.id) && !s.enrollment).map(s => s.id);
        if (unrolledSelectedIds.length === 0) {
            addNotification({ type: 'info', message: 'Tous les élèves sélectionnés sont déjà inscrits.' });
            setBulkEnrollModalOpen(false);
            return;
        }

        try {
            const result = await apiFetch('/enrollments/bulk', {
                method: 'POST',
                body: JSON.stringify({ student_ids: unrolledSelectedIds, year_id: selectedYear.id, className, mppa }),
            });

            if (result?.queued) {
                 const cacheKey = getCacheKey(currentPage);
                 if (cacheKey) {
                    const updatedStudents = students.map(s => {
                        if (unrolledSelectedIds.includes(s.id)) {
                             return { ...s, enrollment: { id: Date.now(), className, mppa, adjustments: [] }};
                        }
                        return s;
                    });
                    await db.saveData(cacheKey, { students: updatedStudents, pagination });
                    setStudents(updatedStudents);
                 }
            }
            
            addNotification({ type: 'success', message: `${unrolledSelectedIds.length} élèves inscrits en masse.` });
            if (!result?.queued) await fetchStudents(currentPage);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setBulkEnrollModalOpen(false);
            setSelectedIds(new Set());
        }
    };
    
    const handleChangeClassRequest = () => {
        if (selectedIds.size > 0) {
            setChangeClassModalOpen(true);
        }
    };
    
    const handleChangeClassSubmit = async (className: string) => {
        const enrollmentIds = students
            .filter(s => selectedIds.has(s.id) && s.enrollment)
            .map(s => s.enrollment!.id);
        
        try {
            const result = await apiFetch('/enrollments/bulk-change-class', {
                method: 'POST',
                body: JSON.stringify({ enrollmentIds, targetClassName: className }),
            });

            if (result?.queued) {
                const cacheKey = getCacheKey(currentPage);
                if (cacheKey) {
                    const updatedStudents = students.map(s => {
                        if (selectedIds.has(s.id) && s.enrollment) {
                            return { ...s, enrollment: { ...s.enrollment, className: className }};
                        }
                        return s;
                    });
                    await db.saveData(cacheKey, { students: updatedStudents, pagination });
                    setStudents(updatedStudents);
                }
            }

            addNotification({ type: 'success', message: 'Classes des élèves mises à jour.' });
            if (!result?.queued) await fetchStudents(currentPage);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setChangeClassModalOpen(false);
            setSelectedIds(new Set());
        }
    };

    const renderContent = () => {
        if (isYearLoading) return <div className="text-center text-slate-500 py-10 col-span-full">Chargement de l'année scolaire...</div>;
        if (yearError) return <ErrorDisplay message={yearError} />;

        return (
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 no-print">
                    <StudentForm 
                        formState={formState}
                        isEditing={!!editingStudent}
                        setFormState={setFormState}
                        onSubmit={handleSubmit}
                        onCancel={resetForm}
                        selectedYear={selectedYear}
                    />
                </div>
                <div className="lg:col-span-3">
                     <AllStudentsTable 
                        students={students}
                        selectedIds={selectedIds}
                        setSelectedIds={setSelectedIds}
                        onDeleteRequest={handleDeleteRequest}
                        onSetStatusRequest={handleSetStatusRequest}
                        onEditRequest={handleEditRequest}
                        onEnrollRequest={handleEnrollRequest}
                        onBulkEnrollRequest={handleBulkEnrollRequest}
                        onChangeClassRequest={handleChangeClassRequest}
                        onViewDetailsRequest={setStudentToView}
                        schoolInfo={instanceInfo}
                        showArchived={showArchived}
                        onShowArchivedChange={setShowArchived}
                        isLoading={isLoading}
                        pagination={pagination}
                        onPageChange={setCurrentPage}
                        classFilter={classFilter}
                        onClassFilterChange={setClassFilter}
                     />
                </div>
             </div>
        );
    };

    return (
        <div className="p-4 md:p-8 max-w-screen-2xl mx-auto">
            <header className="mb-8 flex justify-between items-start">
              <div>
                <ReactRouterDOM.Link to="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium no-print">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                    Retour à l'accueil
                </ReactRouterDOM.Link>
                <h1 className="text-4xl font-bold text-gray-800 font-display">Gestion des Élèves</h1>
                <p className="text-lg text-slate-500 mt-2">Ajouter, inscrire et gérer tous les élèves de l'établissement.</p>
              </div>
            </header>
            
            {renderContent()}

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title={`Supprimer ${selectedIds.size} élève(s)`}
                message="Êtes-vous sûr de vouloir supprimer les élèves sélectionnés ? Cette action est irréversible et supprimera également leurs inscriptions, notes et paiements."
            />
            
            {studentToEnroll && selectedYear && (
                 <EnrollmentForm
                    isOpen={isEnrollModalOpen}
                    onClose={() => setEnrollModalOpen(false)}
                    onSubmit={handleEnrollSubmit}
                    student={studentToEnroll}
                    schoolYear={selectedYear}
                    classes={classes}
                 />
            )}
            
            {selectedYear && (
                 <BulkEnrollmentForm
                    isOpen={isBulkEnrollModalOpen}
                    onClose={() => setBulkEnrollModalOpen(false)}
                    onSubmit={handleBulkEnrollSubmit}
                    schoolYear={selectedYear}
                    studentCount={students.filter(s => selectedIds.has(s.id) && !s.enrollment).length}
                    classes={classes}
                 />
            )}
            
            <StudentDetailModal 
                isOpen={!!studentToView}
                onClose={() => setStudentToView(null)}
                student={studentToView}
                instanceInfo={instanceInfo}
            />

            {selectedYear && (
                 <ChangeClassModal 
                    isOpen={isChangeClassModalOpen}
                    onClose={() => setChangeClassModalOpen(false)}
                    onSubmit={handleChangeClassSubmit}
                    studentCount={students.filter(s => selectedIds.has(s.id) && s.enrollment).length}
                    currentClasses={[...new Set(students.filter(s => selectedIds.has(s.id) && s.enrollment).map(s => s.enrollment!.className))]}
                    classes={classes}
                 />
            )}
        </div>
    );
};

export default StudentsPage;