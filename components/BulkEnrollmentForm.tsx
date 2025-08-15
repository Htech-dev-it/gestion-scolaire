import React, { useState } from 'react';
import type { SchoolYear, ClassDefinition } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface BulkEnrollmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (className: string, mppa: number) => void;
  schoolYear: SchoolYear;
  studentCount: number;
  classes: ClassDefinition[];
}

const BulkEnrollmentForm: React.FC<BulkEnrollmentFormProps> = ({ isOpen, onClose, onSubmit, schoolYear, studentCount, classes }) => {
  const [className, setClassName] = useState(classes[0]?.name || '');
  const [mppa, setMppa] = useState(0);
  const { addNotification } = useNotification();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mppa <= 0) {
        addNotification({ type: 'warning', message: 'Veuillez entrer un MPPA valide.' });
        return;
    }
    onSubmit(className, mppa);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">Inscription en Masse pour {schoolYear.name}</h2>
        <p className="mb-6 text-slate-600">
          Vous êtes sur le point d'inscrire <span className="font-semibold text-blue-600">{studentCount} élève(s)</span>.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="className-bulk" className="block text-sm font-medium text-slate-700">Classe de destination</label>
            <select
              id="className-bulk"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="mppa-bulk" className="block text-sm font-medium text-slate-700">MPPA (Montant à Payer) commun</label>
            <input
              type="number"
              id="mppa-bulk"
              value={mppa}
              onChange={(e) => setMppa(Number(e.target.value))}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Montant pour l'année"
              step="0.01"
              required
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
              Annuler
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
              Inscrire les élèves
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkEnrollmentForm;
