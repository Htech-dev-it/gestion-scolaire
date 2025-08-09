import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SchoolYear } from '../types';
import { apiFetch } from '../utils/api';
import { useAuth } from '../auth/AuthContext';

interface SchoolYearContextType {
  schoolYears: SchoolYear[];
  selectedYear: SchoolYear | null;
  setSelectedYearById: (id: number) => void;
  isLoading: boolean;
  error: string | null;
  refreshYears: () => void;
}

const SchoolYearContext = createContext<SchoolYearContextType | null>(null);

export const SchoolYearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<SchoolYear | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchoolYears = useCallback(async () => {
    if (!isAuthenticated) {
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    setError(null);
    try {
      const years: SchoolYear[] = await apiFetch('/school-years');
      setSchoolYears(years);
      
      if (years.length === 0) {
        setError("Aucune année scolaire n'a été trouvée. Veuillez en ajouter une dans le panneau d'administration.");
        setSelectedYear(null);
      } else {
        const currentYear = years.find((y: SchoolYear) => y.is_current === 1) || years[0] || null;
        setSelectedYear(currentYear);
      }
    } catch (err) {
      console.error("Failed to fetch school years:", err);
      if (err instanceof Error) setError(err.message);
      else setError("Une erreur inconnue est survenue lors du chargement des années scolaires.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSchoolYears();
  }, [fetchSchoolYears]);

  const setSelectedYearById = (id: number) => {
    const year = schoolYears.find(y => y.id === id);
    if (year) {
      setSelectedYear(year);
    }
  };
  
  const refreshYears = useCallback(() => {
      fetchSchoolYears();
  }, [fetchSchoolYears]);

  return (
    <SchoolYearContext.Provider value={{ schoolYears, selectedYear, setSelectedYearById, isLoading, error, refreshYears }}>
      {children}
    </SchoolYearContext.Provider>
  );
};

export const useSchoolYear = () => {
  const context = useContext(SchoolYearContext);
  if (!context) {
    throw new Error('useSchoolYear must be used within a SchoolYearProvider');
  }
  return context;
};