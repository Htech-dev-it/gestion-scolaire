import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { StudentAccessStatus } from '../types';
import { apiFetch } from '../utils/api';
import { useAuth } from '../auth/AuthContext';
import { useSchoolYear } from './SchoolYearContext';

interface StudentAccessContextType {
  accessStatus: StudentAccessStatus | null;
  isLoading: boolean;
}

const StudentAccessContext = createContext<StudentAccessContextType | null>(null);

export const StudentAccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { selectedYear } = useSchoolYear();
  const [accessStatus, setAccessStatus] = useState<StudentAccessStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccessStatus = useCallback(async () => {
    if (!selectedYear || !user || user.role !== 'student') {
        // Default to enabled if not a student or no year selected to avoid breaking admin view
        setAccessStatus({ grades_access_enabled: true });
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const data = await apiFetch(`/student/access-status?yearId=${selectedYear.id}`);
      setAccessStatus(data);
    } catch (error) {
      console.error("Could not fetch student access status:", error);
      // Default to enabled on error to prevent locking out a student due to a network issue
      setAccessStatus({ grades_access_enabled: true });
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, user]);

  useEffect(() => {
    fetchAccessStatus();
  }, [fetchAccessStatus]);

  return (
    <StudentAccessContext.Provider value={{ accessStatus, isLoading }}>
      {children}
    </StudentAccessContext.Provider>
  );
};

export const useStudentAccess = () => {
  const context = useContext(StudentAccessContext);
  if (!context) {
    throw new Error('useStudentAccess must be used within a StudentAccessProvider');
  }
  return context;
};
