import React, { useState, useMemo, useEffect } from 'react';
import type { ClassDefinition } from '../types';

interface ChangeClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (className: string) => void;
  studentCount: number;
  currentClasses: string[];
  classes: ClassDefinition[];
}

const ChangeClassModal: React.FC<ChangeClassModalProps> = ({ isOpen, onClose, onSubmit, studentCount, currentClasses, classes }) => {
  const availableClasses = useMemo(() => classes.filter(c => !new Set(currentClasses).has(c.name)), [classes, currentClasses]);
  const [targetClass, setTargetClass] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTargetClass(availableClasses[0]?.name || '');
    }
  }, [isOpen, availableClasses]);


  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetClass) {
        onSubmit(targetClass);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">Changer de Classe</h2>
        <p className="mb-6 text-slate-600">
          Vous êtes sur le point de déplacer <span className="font-semibold text-blue-600">{studentCount} élève(s)</span> vers une nouvelle classe pour l'année scolaire en cours.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="className-change" className="block text-sm font-medium text-slate-700">Nouvelle classe de destination</label>
            <select
              id="className-change"
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="" disabled>Sélectionner une classe</option>
              {availableClasses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {availableClasses.length === 0 && <p className="text-xs text-orange-500 mt-1">Toutes les classes sont déjà représentées dans la sélection ou il n'y a pas d'autre classe disponible.</p>}
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
              Annuler
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition" disabled={!targetClass}>
              Déplacer les élèves
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangeClassModal;
