import React, { useCallback, useState } from 'react';
import type { Student, Instance, ClassDefinition } from '../types';
import Tooltip from './Tooltip';

interface StudentTableProps {
  students: Student[];
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onEdit: (student: Student) => void;
  onDeleteRequest: () => void;
  onChangeClassRequest: (targetClassName: string) => void;
  className: string;
  schoolInfo: Instance | null;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sortConfig: { key: string; direction: 'ascending' | 'descending' } | null;
  onSort: (key: string) => void;
  classes: ClassDefinition[];
}

const StudentTable: React.FC<StudentTableProps> = ({ students, selectedIds, setSelectedIds, onEdit, onDeleteRequest, onChangeClassRequest, className, schoolInfo, searchTerm, onSearchChange, sortConfig, onSort, classes }) => {
  const [targetClass, setTargetClass] = useState(classes.find(c => c.name !== className)?.name || classes[0]?.name || '');

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(students.map(s => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [students, setSelectedIds]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, [setSelectedIds]);

  const formatDate = (dateString: string | null) => {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleDateString('fr-FR', {
          year: '2-digit', month: '2-digit', day: '2-digit'
      });
  }
  
  const handlePrintList = () => {
    if (!schoolInfo) {
        alert("Les informations de l'école ne sont pas chargées.");
        return;
    }
    const printWindow = window.open('', '_blank', 'height=800,width=1000');
    if (!printWindow) {
        alert("Veuillez autoriser les pop-ups pour imprimer la liste.");
        return;
    }

    const tableRows = students.map(student => {
        const total = student.payments.reduce((acc, p) => acc + p.amount, 0);
        const balance = student.mppa - total;
        return `
            <tr>
                <td>${student.prenom} ${student.nom}</td>
                <td class="text-right">${student.mppa.toFixed(2)}$</td>
                <td class="text-right">${student.payments[0].amount.toFixed(2)}$</td>
                <td class="text-right">${student.payments[1].amount.toFixed(2)}$</td>
                <td class="text-right">${student.payments[2].amount.toFixed(2)}$</td>
                <td class="text-right">${student.payments[3].amount.toFixed(2)}$</td>
                <td class="text-right">${total.toFixed(2)}$</td>
                <td class="text-right">${balance.toFixed(2)}$</td>
            </tr>
        `;
    }).join('');

    const printContent = `
        <html>
            <head>
                <title>Liste des Élèves - Classe ${className}</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .header h1, .header h2 { margin: 0; }
                    .header p { margin: 2px 0; font-size: 10pt; }
                    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 20px; }
                    th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .text-right { text-align: right; }
                    @media print {
                        @page { size: portrait; margin: 0.75in; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${schoolInfo.name}</h1>
                    <p>${schoolInfo.address || ''}</p>
                    <h2>Liste des Paiements - Classe: ${className}</h2>
                    <p>Date d'impression: ${new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Nom Complet</th>
                            <th class="text-right">MPPA</th>
                            <th class="text-right">V1</th>
                            <th class="text-right">V2</th>
                            <th class="text-right">V3</th>
                            <th class="text-right">V4</th>
                            <th class="text-right">Total Versé</th>
                            <th class="text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
  };


  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div className="flex items-center gap-4 flex-grow">
          <h2 className="text-2xl font-bold text-slate-800 font-display whitespace-nowrap">Liste des Élèves</h2>
          <div className="relative w-full max-w-xs">
              <input
                type="text"
                placeholder="Rechercher un élève..."
                value={searchTerm}
                onChange={onSearchChange}
                className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={handlePrintList}
              className="flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
              Imprimer
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={onDeleteRequest}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-transform hover:scale-105"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                </svg>
                Supprimer ({selectedIds.size})
              </button>
            )}
        </div>
      </div>

       {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex flex-col sm:flex-row items-center gap-4 transition-all duration-300">
          <span className="font-semibold text-blue-800 text-center sm:text-left">{selectedIds.size} élève(s) sélectionné(s).</span>
          <div className="flex items-center gap-2">
            <label htmlFor="targetClass" className="text-sm font-medium text-slate-700">Déplacer vers :</label>
            <select
              id="targetClass"
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {classes.filter(c => c.name !== className).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <button
            onClick={() => onChangeClassRequest(targetClass)}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Changer de Classe
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="p-4 text-left">
                <input type="checkbox" onChange={handleSelectAll} checked={students.length > 0 && selectedIds.size === students.length} className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <button onClick={() => onSort('name')} className="group inline-flex items-center">
                  Nom Complet
                  {sortConfig?.key === 'name' ? (
                    <svg className="h-4 w-4 ml-1 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {sortConfig.direction === 'ascending' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />}
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 ml-1 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                  )}
                </button>
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">MPPA</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">V1</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">V2</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">V3</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">V4</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Versé</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {students.length === 0 ? (
                <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-500">
                        {searchTerm ? "Aucun élève ne correspond à votre recherche." : "Aucun élève enregistré pour cette classe."}
                    </td>
                </tr>
            ) : students.map((student) => {
              const total = student.payments.reduce((acc, p) => acc + p.amount, 0);
              const balance = student.mppa - total;
              return (
                <tr key={student.id} onDoubleClick={() => onEdit(student)} className={`hover:bg-blue-50 transition-colors duration-200 cursor-pointer ${selectedIds.has(student.id) ? 'bg-blue-100' : ''} even:bg-gray-50`}>
                  <td className="p-4"><input type="checkbox" checked={selectedIds.has(student.id)} onChange={() => handleSelectOne(student.id)} className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" /></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-slate-900">{student.prenom} {student.nom}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">{student.mppa.toFixed(2)}$</td>
                  {student.payments.map((p, i) => (
                    <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">
                        <Tooltip text={`Date: ${formatDate(p.date)}`}>
                            <span className={p.amount > 0 ? 'text-green-600 font-semibold' : ''}>{p.amount.toFixed(2)}$</span>
                        </Tooltip>
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800 text-right">{total.toFixed(2)}$</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${balance > 0 ? 'text-red-600' : 'text-green-700'}`}>{balance.toFixed(2)}$</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentTable;
