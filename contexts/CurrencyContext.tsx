import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Instance } from '../types';
import { apiFetch } from '../utils/api';
import { useAuth } from '../auth/AuthContext';

type Currency = 'Gdes' | '$HT' | 'US' | 'EU';

interface CurrencyContextType {
  currency: Currency;
  formatCurrency: (amount: number | string | null | undefined) => string;
  instance: Instance | null;
  refreshInstance: () => void;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [instance, setInstance] = useState<Instance | null>(null);
  const [currency, setCurrency] = useState<Currency>('Gdes');

  const fetchInstance = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await apiFetch('/instance/current');
      setInstance(data);
      if (data.currency) {
        setCurrency(data.currency as Currency);
      }
    } catch (error) {
      console.error("Failed to fetch instance data for currency context:", error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchInstance();
  }, [fetchInstance]);

  const formatCurrency = useCallback((amount: number | string | null | undefined): string => {
    const num = Number(amount);
    if (amount === null || amount === undefined || isNaN(num)) return '';
    
    const formattedNum = num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    switch (currency) {
        case 'Gdes':
            return `${formattedNum} Gdes`;
        case '$HT':
            return `$HT ${formattedNum}`;
        case 'US':
            return `$${formattedNum}`;
        case 'EU':
            return `${formattedNum} €`;
        default:
            return `${formattedNum} Gdes`;
    }
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, formatCurrency, instance, refreshInstance: fetchInstance }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
