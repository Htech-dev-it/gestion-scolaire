import React, { useState, useCallback, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import type { StudentProfile, StudentWithEnrollment, Instance, StudentFormState, PaginationInfo, PaginatedStudents } from '../types';
import { EMPTY_STUDENT_FORM } from '../constants';
import { useNotification } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import StudentForm from './StudentForm';
import AllStudentsTable from './AllStudentsTable';
import ConfirmationModal from './ConfirmationModal';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import EnrollmentForm from './EnrollmentForm';
import BulkEnrollmentForm from './BulkEnrollmentForm';
import StudentDetailModal from './StudentDetailModal';
import ChangeClassModal from './ChangeClassModal';

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
  const [showArchived, setShowArchived] = useState(false);
  const [isChangeClassModalOpen, setChangeClassModalOpen] = useState(false);
  const [classFilter, setClassFilter] = useState('all');

  const fetchStudents = useCallback(async (page: number) => {
      if (!selectedYear) {
          setIsLoading(false);
          setStudents([]);
          return;
      };
      
      setIsLoading(true);
      const params = new URLSearchParams({
        yearId: selectedYear.id.toString(),
        includeArchived: showArchived.toString(),
        page: page.toString(),
        limit: '25',
        classFilter: classFilter,
      });

      try {
          const data: PaginatedStudents = await apiFetch(`/students-with-enrollment-status?${params.toString()}`);
          setStudents(data.students);
          setPagination(data.pagination);
      } catch (error) {
          if (error instanceof Error) addNotification({ type: 'error', message: error.message });
          setStudents([]);
          setPagination(null);
      } finally {
          setIsLoading(false);
      }
  }, [selectedYear, showArchived, addNotification, classFilter]);
  
  useEffect(() => {
    const fetchInstanceInfo = async () => {
        try {
            setInstanceInfo(await apiFetch('/instance/current'));
        } catch (error) {
            console.error("Failed to fetch instance info:", error);
        }
    };
    fetchInstanceInfo();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchStudents(currentPage);
    }
  }, [selectedYear, currentPage, fetchStudents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [showArchived, classFilter]);


  const handleEditRequest = (student: StudentWithEnrollment) => {
    setEditingStudent(student);
    const studentFormData: StudentFormState = {
        ...EMPTY_STUDENT_FORM,
        ...student,
        date_of_birth: student.date_of_birth ? student.date_of_birth.split('T')[0] : null,
        enrollmentId: student.enrollment?.id ?? null,
        enrollmentMppa: student.enrollment?.mppa ?? 0,
    };
    setFormState(studentFormData);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewDetailsRequest = (student: StudentProfile) => {
    setStudentToView(student);
  };
  
  const resetForm = useCallback(() => {
    setEditingStudent(null);
    setFormState(EMPTY_STUDENT_FORM);
  }, []);

  const handleSubmitProfile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    let apiEndpoint = '/students';
    let apiMethod = 'POST';
    let body: any;

    if (editingStudent) {
        apiEndpoint = `/students/${editingStudent.id}`;
        apiMethod = 'PUT';
        const { enrollNow, enrollmentClassName, ...profileData } = formState;
        body = {
          ...profileData,
          mppa: formState.enrollmentMppa,
          enrollmentId: formState.enrollmentId,
        };
    } else {
        // Creating a new student
        const profileData = { ...formState, id: crypto.randomUUID() };
        // Clean up form-only state before sending
        delete (profileData as Partial<typeof profileData>).enrollNow;
        delete (profileData as Partial<typeof profileData>).enrollmentClassName;
        delete (profileData as Partial<typeof profileData>).enrollmentMppa;
        delete (profileData as Partial<typeof profileData>).enrollmentId;

        if (formState.enrollNow && selectedYear) {
            body = {
                ...profileData,
                enrollment: {
                    year_id: selectedYear.id,
                    className: formState.enrollmentClassName,
                    mppa: formState.enrollmentMppa || 0
                }
            };
        } else {
            body = profileData;
        }
    }

    try {
        await apiFetch(apiEndpoint, {
            method: apiMethod,
            body: JSON.stringify(body),
        });
        addNotification({ type: 'success', message: `Profil élève ${editingStudent ? 'mis à jour' : 'ajouté'} avec succès.` });
        resetForm();
        fetchStudents(currentPage);
    } catch (error) {
        if (error instanceof Error) addNotification({ type: 'error', message: error.message });
    }
}, [formState, editingStudent, selectedYear, resetForm, addNotification, fetchStudents, currentPage]);
  
  const handleDeleteRequest = useCallback(() => {
      if (selectedIds.size > 0) {
        setDeleteModalOpen(true);
      } else {
        addNotification({ type: 'warning', message: 'Veuillez sélectionner au moins un élève.' });
      }
  }, [selectedIds, addNotification]);
  
  const handleSetStatusRequest = useCallback(async (status: 'active' | 'archived') => {
      if (selectedIds.size === 0) {
        addNotification({ type: 'warning', message: 'Veuillez sélectionner au moins un élève.' });
        return;
      }
       try {
          await apiFetch('/students/status', {
              method: 'POST',
              body: JSON.stringify({ ids: Array.from(selectedIds), status }),
          });
          addNotification({ type: 'success', message: `${selectedIds.size} élève(s) ont été mis à jour.` });
          setSelectedIds(new Set());
          fetchStudents(1); // Go back to page 1 after status change
          setCurrentPage(1);
       } catch (error) {
           if (error instanceof Error) addNotification({ type: 'error', message: error.message });
       }
  }, [selectedIds, addNotification, fetchStudents]);

  const handleDeleteConfirm = useCallback(async () => {
    try {
      await apiFetch('/students/delete', {
          method: 'POST',
          body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      addNotification({ type: 'success', message: `${selectedIds.size} élève(s) supprimé(s).` });
      setSelectedIds(new Set());
      setDeleteModalOpen(false);
      fetchStudents(1);
      setCurrentPage(1);
    } catch (error) {
        if (error instanceof Error) addNotification({ type: 'error', message: error.message });
    }
  }, [selectedIds, addNotification, fetchStudents]);

  const handleEnrollRequest = (student: StudentProfile) => {
    setStudentToEnroll(student);
    setEnrollModalOpen(true);
  };
  
  const handleEnrollSubmit = async (className: string, mppa: number) => {
    if (!studentToEnroll || !selectedYear) return;
    try {
        await apiFetch('/enrollments', {
            method: 'POST',
            body: JSON.stringify({
                student_id: studentToEnroll.id,
                year_id: selectedYear.id,
                className,
                mppa
            })
        });
        addNotification({ type: 'success', message: `${studentToEnroll.prenom} a été inscrit(e) pour ${selectedYear.name}.` });
        setEnrollModalOpen(false);
        setStudentToEnroll(null);
        fetchStudents(currentPage);
    } catch (error) {
        if (error instanceof Error) addNotification({ type: 'error', message: error.message });
    }
  };
  
  const handleBulkEnrollRequest = () => {
    setBulkEnrollModalOpen(true);
  };

  const handleBulkEnrollSubmit = async (className: string, mppa: number) => {
      if (!selectedYear) return;
      const unrolledSelectedIds = students
          .filter(s => selectedIds.has(s.id) && !s.enrollment)
          .map(s => s.id);

      try {
          await apiFetch('/enrollments/bulk', {
              method: 'POST',
              body: JSON.stringify({
                  student_ids: unrolledSelectedIds,
                  year_id: selectedYear.id,
                  className,
                  mppa,
              }),
          });
          addNotification({ type: 'success', message: `${unrolledSelectedIds.length} élèves inscrits avec succès.` });
          setBulkEnrollModalOpen(false);
          setSelectedIds(new Set());
          fetchStudents(currentPage);
      } catch (error) {
          if (error instanceof Error) addNotification({ type: 'error', message: error.message });
      }
  };

  const handleChangeClassRequest = useCallback(() => {
    const enrolledSelectedIds = students.filter(s => selectedIds.has(s.id) && s.enrollment);
    if (enrolledSelectedIds.length === 0) {
      addNotification({ type: 'warning', message: 'Veuillez sélectionner des élèves déjà inscrits pour changer leur classe.' });
      return;
    }
    setChangeClassModalOpen(true);
  }, [students, selectedIds, addNotification]);

  const handleChangeClassSubmit = useCallback(async (targetClassName: string) => {
    const enrolledIdsToChange = students
        .filter(s => selectedIds.has(s.id) && s.enrollment && s.enrollment.className !== targetClassName)
        .map(s => s.enrollment!.id);
    
    if (enrolledIdsToChange.length === 0) {
        addNotification({type: 'info', message: 'Aucun changement nécessaire pour les élèves sélectionnés.'});
        setChangeClassModalOpen(false);
        return;
    }

    try {
        await apiFetch('/enrollments/bulk-change-class', {
            method: 'POST',
            body: JSON.stringify({ enrollmentIds: enrolledIdsToChange, targetClassName: targetClassName }),
        });
        addNotification({ type: 'success', message: `${enrolledIdsToChange.length} élève(s) déplacé(s) vers la classe ${targetClassName}.` });
        setSelectedIds(new Set());
        setChangeClassModalOpen(false);
        fetchStudents(currentPage);
    } catch (error) {
        if (error instanceof Error) addNotification({ type: 'error', message: error.message });
    }
  }, [students, selectedIds, addNotification, fetchStudents, currentPage]);

  const renderContent = () => {
    if (isYearLoading) {
       return (
         <div className="lg:col-span-3 flex items-center justify-center h-full bg-white rounded-xl shadow-md p-10">
            <div className="text-center text-slate-500">Chargement des années scolaires...</div>
         </div>
       );
    }
    if (yearError) {
        return <div className="lg:col-span-3"><ErrorDisplay message={yearError} /></div>;
    }
    
    return (
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
              onViewDetailsRequest={handleViewDetailsRequest}
              schoolInfo={instanceInfo}
              showArchived={showArchived}
              onShowArchivedChange={(show) => { setShowArchived(show); }}
              isLoading={isLoading}
              pagination={pagination}
              onPageChange={setCurrentPage}
              classFilter={classFilter}
              onClassFilterChange={setClassFilter}
          />
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 no-print">
          <StudentForm
            formState={formState}
            isEditing={!!editingStudent}
            setFormState={setFormState}
            onSubmit={handleSubmitProfile}
            onCancel={resetForm}
            selectedYear={selectedYear}
          />
        </div>
        
        {renderContent()}

      </div>
      
       <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer ${selectedIds.size} profil(s) d'élève(s) ? Toutes leurs données d'inscription (passées et présentes) seront également effacées. Cette action est irréversible.`}
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

      {studentToView && (
        <StudentDetailModal
            isOpen={!!studentToView}
            onClose={() => setStudentToView(null)}
            student={studentToView}
            instanceInfo={instanceInfo}
        />
      )}
      
      <ChangeClassModal
        isOpen={isChangeClassModalOpen}
        onClose={() => setChangeClassModalOpen(false)}
        onSubmit={handleChangeClassSubmit}
        studentCount={students.filter(s => selectedIds.has(s.id) && s.enrollment).length}
        currentClasses={[...new Set(students.filter(s => selectedIds.has(s.id) && s.enrollment).map(s => s.enrollment!.className))]}
        classes={classes}
      />
    </div>
  );
};

export default StudentsPage;
