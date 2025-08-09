import React, { useState } from 'react';
import type { StudentProfile, SchoolYear } from '../types';
import { CLASSES } from '../constants';

interface EnrollmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (className: string, mppa: number) => void;
  student: StudentProfile;
  schoolYear: SchoolYear;
}

const EnrollmentForm: React.FC<EnrollmentFormProps> = ({ isOpen, onClose, onSubmit, student, schoolYear }) => {
  const [className, setClassName] = useState(CLASSES[0]);
  const [mppa, setMppa] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(className, mppa);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">Inscrire l'élève pour {schoolYear.name}</h2>
        <p className="mb-6 text-slate-600">Inscription de <span className="font-semibold">{student.prenom} {student.nom}</span>.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="className" className="block text-sm font-medium text-slate-700">Classe</label>
            <select
              id="className"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="mppa" className="block text-sm font-medium text-slate-700">MPPA (Montant à Payer)</label>
            <input
              type="number"
              id="mppa"
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
              Inscrire l'élève
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnrollmentForm;
