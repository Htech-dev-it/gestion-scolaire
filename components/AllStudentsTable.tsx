import React, { useState, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import type { StudentWithEnrollment, StudentProfile, Instance, PaginationInfo } from '../types';
import { useAuth } from '../auth/AuthContext';
import ImageLightbox from './ImageLightbox'; // Import the new component
import { useSchoolYear } from '../contexts/SchoolYearContext';
import { useCurrency } from '../contexts/CurrencyContext';

interface AllStudentsTableProps {
  students: StudentWithEnrollment[];
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onDeleteRequest: () => void;
  onSetStatusRequest: (status: 'active' | 'archived') => void;
  onEditRequest: (student: StudentWithEnrollment) => void;
  onEnrollRequest: (student: StudentProfile) => void;
  onBulkEnrollRequest: () => void;
  onChangeClassRequest: () => void;
  onViewDetailsRequest: (student: StudentProfile) => void;
  schoolInfo: Instance | null;
  showArchived: boolean;
  onShowArchivedChange: (show: boolean) => void;
  isLoading: boolean;
  pagination: PaginationInfo | null;
  onPageChange: (page: number) => void;
  classFilter: string;
  onClassFilterChange: (value: string) => void;
}

const Avatar: React.FC<{ student: StudentProfile }> = ({ student }) => {
    const initials = `${student.prenom?.[0] || ''}${student.nom?.[0] || ''}`.toUpperCase();
    const colors = ['bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-red-200', 'bg-purple-200', 'bg-pink-200'];
    const color = colors[((student.nom?.charCodeAt(0) || 0) + (student.prenom?.charCodeAt(0) || 0)) % colors.length];


    if (student.photo_url) {
        return <img src={student.photo_url} alt={`${student.prenom} ${student.nom}`} className="h-10 w-10 min-w-[2.5rem] flex-shrink-0 rounded-full object-cover"/>;
    }
    return (
        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-slate-700 ${color}`}>
            {initials}
        </div>
    );
};


const AllStudentsTable: React.FC<AllStudentsTableProps> = ({ students, selectedIds, setSelectedIds, onDeleteRequest, onSetStatusRequest, onEditRequest, onEnrollRequest, onBulkEnrollRequest, onChangeClassRequest, onViewDetailsRequest, schoolInfo, showArchived, onShowArchivedChange, isLoading, pagination, onPageChange, classFilter, onClassFilterChange }) => {
  const navigate = ReactRouterDOM.useNavigate();
  const { user } = useAuth();
  const { classes } = useSchoolYear();
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof StudentProfile; direction: 'ascending' | 'descending' } | null>({ key: 'nom', direction: 'ascending' });
  const [lightboxStudent, setLightboxStudent] = useState<StudentWithEnrollment | null>(null);

  const handleSelectAll = (filteredStudents: StudentWithEnrollment[]) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    else setSelectedIds(new Set());
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSort = (key: keyof StudentProfile) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig?.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };
  
  const filteredAndSortedStudents = useMemo(() => {
    let sortableStudents = [...students]
        .filter(student => `${student.prenom} ${student.nom} ${student.nisu}`.toLowerCase().includes(searchTerm.toLowerCase()));

    if (sortConfig !== null) {
        sortableStudents.sort((a, b) => {
            const valA = a[sortConfig.key] || '';
            const valB = b[sortConfig.key] || '';
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }
    return sortableStudents;
  }, [students, searchTerm, sortConfig]);

  const showBulkEnrollButton = useMemo(() => {
      if (selectedIds.size === 0) return false;
      return students.every(s => !selectedIds.has(s.id) || !s.enrollment);
  }, [selectedIds, students]);

  const atLeastOneEnrolled = useMemo(() => {
      if (selectedIds.size === 0) return false;
      return students.some(s => selectedIds.has(s.id) && s.enrollment);
  }, [selectedIds, students]);
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('fr-FR');
  };

  const handlePrintList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Veuillez autoriser les pop-ups pour imprimer.");
        return;
    }

    const tableRows = filteredAndSortedStudents.map(student => `
        <tr>
            <td>${student.nisu || ''}</td>
            <td>${student.nom}</td>
            <td>${student.prenom}</td>
            <td>${student.sexe || ''}</td>
            <td>${student.enrollment?.className || student.classe_ref || 'N/A'}</td>
            <td>${formatDate(student.date_of_birth)}</td>
        </tr>
    `).join('');

    printWindow.document.write(`
        <html>
            <head>
                <title></title>
                <style>
                    @page { size: portrait; margin: 0; }
                    body { font-family: Arial, sans-serif; margin: 0.75in; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .header h1 { margin: 0; }
                    .header p { margin: 2px 0; font-size: 10pt; }
                    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 20px; }
                    th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${schoolInfo?.name || ''}</h1>
                    <h2>Liste des Élèves${classFilter !== 'all' ? ` - Classe: ${classFilter}` : ''}</h2>
                    <p>Date d'impression: ${new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                <table>
                    <thead>
                        <tr><th>NISU</th><th>Nom</th><th>Prénom</th><th>Sexe</th><th>Classe</th><th>Date de Naissance</th></tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };
  
const handlePrintSheets = () => {
  const selectedStudents = students.filter(s => selectedIds.has(s.id));
  if (selectedStudents.length === 0) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
      alert("Veuillez autoriser les pop-ups pour imprimer.");
      return;
  }

  const getAvatarHtml = (student: StudentProfile) => {
      if (student.photo_url) {
          return `<img src="${student.photo_url}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #eee;" />`;
      }
      const initials = `${student.prenom?.[0] || ''}${student.nom?.[0] || ''}`.toUpperCase();
      const colors = ['#e0e7ff', '#d1fae5', '#fef3c7', '#fee2e2', '#f3e8ff', '#fce7f3'];
      const color = colors[((student.nom?.charCodeAt(0) || 0) + (student.prenom?.charCodeAt(0) || 0)) % colors.length];
      const textColor = '#1e3a8a';
      return `<div style="width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; background-color: ${color}; color: ${textColor}; border: 2px solid #eee;">${initials}</div>`;
  };

  const getMedicalNotesHtml = (notes: string | null): string => {
        if (!notes) return '<div class="notes"><span style="font-style: italic; color: #94a3b8;">Aucune note.</span></div>';
        try {
            const parsed = JSON.parse(notes);
            if (typeof parsed === 'object' && parsed !== null && ('blood_group' in parsed || 'allergies' in parsed || 'illnesses' in parsed)) {
                if (!parsed.blood_group && !parsed.allergies && !parsed.illnesses) {
                    return '<div class="notes"><span style="font-style: italic; color: #94a3b8;">Aucune note.</span></div>';
                }
                return `
                    <div class="detail-grid">
                        <div class="detail-label">Groupe Sanguin:</div>
                        <div class="detail-value">${parsed.blood_group || 'Non renseigné'}</div>
                        <div class="detail-label">Allergies:</div>
                        <div class="detail-value">${parsed.allergies || 'Non renseigné'}</div>
                        <div class="detail-label">Maladies Connues:</div>
                        <div class="detail-value">${parsed.illnesses || 'Non renseigné'}</div>
                    </div>
                `;
            }
            return `<div class="notes">${notes}</div>`;
        } catch (e) {
            return `<div class="notes">${notes}</div>`;
        }
    };

  const sheetsHtml = selectedStudents.map(student => {
      const avatarHtml = getAvatarHtml(student);
      const mppaText = student.enrollment ? formatCurrency(student.enrollment.mppa) : 'Non-inscrit(e) pour cette année';
      
      return `
        <div class="page">
            <div class="sheet-container">
                <div class="school-header">
                    ${schoolInfo?.logo_url ? `<img src="${schoolInfo.logo_url}" style="height: 60px; margin: 0 auto 10px; object-fit: contain;" />` : ''}
                    <h1>${schoolInfo?.name || ''}</h1>
                    <p>${schoolInfo?.address || ''}</p>
                    <p>${schoolInfo?.phone || ''}</p>
                </div>
                <div class="student-header">
                    ${avatarHtml}
                    <div class="student-title">
                        <h2>${student.prenom} ${student.nom}</h2>
                        <p><strong>Classe:</strong> ${student.enrollment?.className || 'Non-inscrit(e)'}</p>
                    </div>
                </div>

                <div class="section">
                    <h3>Informations Personnelles</h3>
                    <div class="detail-grid">
                        <div class="detail-label">NISU:</div>
                        <div class="detail-value" style="font-weight: bold;">${student.nisu || 'Non attribué'}</div>
                        <div class="detail-label">Sexe:</div>
                        <div class="detail-value">${student.sexe === 'M' ? 'Masculin' : student.sexe === 'F' ? 'Féminin' : 'Non renseigné'}</div>
                        <div class="detail-label">Date de Naissance:</div>
                        <div class="detail-value">${formatDate(student.date_of_birth) || 'Non renseignée'}</div>
                        <div class="detail-label">Adresse:</div>
                        <div class="detail-value">${student.address || 'Non renseignée'}</div>
                    </div>
                </div>

                <div class="section">
                    <h3>Informations Tuteur</h3>
                     <div class="detail-grid">
                        <div class="detail-label">Nom:</div>
                        <div class="detail-value">${student.tutor_name || 'Non renseigné'}</div>
                        <div class="detail-label">Téléphone:</div>
                        <div class="detail-value">${student.tutor_phone || 'Non renseigné'}</div>
                        <div class="detail-label">Email:</div>
                        <div class="detail-value">${student.tutor_email || 'Non renseigné'}</div>
                    </div>
                </div>

                 <div class="section">
                    <h3>Informations Financières (Année Actuelle)</h3>
                     <div class="detail-grid">
                        <div class="detail-label">Montant à Payer (MPPA):</div>
                        <div class="detail-value" style="font-weight: bold;">${mppaText}</div>
                     </div>
                </div>

                <div class="section">
                    <h3>Notes Médicales</h3>
                    ${getMedicalNotesHtml(student.medical_notes)}
                </div>

                <div class="print-footer">
                    Fiche imprimée le ${new Date().toLocaleDateString('fr-FR')}
                </div>
            </div>
        </div>
      `;
  }).join('');

  printWindow.document.write(`
      <html>
          <head>
              <title></title>
              <style>
                  body {
                    font-family: Arial, sans-serif;
                    font-size: 11pt;
                    margin: 0;
                    padding: 0;
                    background: #f8f8f8;
                  }

                  .page {
                    page-break-after: always;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                  }
                  .page:last-child { page-break-after: auto; }

                  .sheet-container {
                      width: 180mm; /* Slightly smaller than A4 width */
                      padding: 20px 25px;
                      border: 1px solid #ccc;
                      border-radius: 5px;
                      background: white;
                  }
                  
                  .school-header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
                  .school-header h1 { margin: 0; font-size: 20pt; }
                  .school-header p { margin: 3px 0; font-size: 10pt; color: #555; }
                  
                  .student-header { display: flex; align-items: center; gap: 20px; margin: 25px 0; }
                  .student-header > div:first-child { flex-shrink: 0; }
                  .student-title h2 { font-size: 18pt; margin: 0 0 5px 0; }
                  .student-title p { font-size: 12pt; margin: 0; color: #444; }
                  
                  .section { margin-top: 25px; }
                  .section h3 { font-size: 13pt; margin-bottom: 12px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; color: #333; }
                  
                  .detail-grid { display: grid; grid-template-columns: 180px 1fr; gap: 12px 16px; line-height: 1.6; font-size: 11pt; }
                  .detail-label { font-weight: bold; color: #444; }
                  .detail-value { color: #111; }
                  
                  .notes { font-size: 11pt; white-space: pre-wrap; background-color: #f9f9f9; padding: 12px; border: 1px solid #e0e0e0; border-radius: 4px; min-height: 50px; }
                  
                  .print-footer { text-align: center; font-size: 8pt; color: #888; margin-top: 40px; border-top: 1px dashed #ccc; padding-top: 10px; }
                  
                  @media print {
                      body {
                        margin: 0;
                        background: none;
                        padding: 20mm;
                        justify-content: flex-start;
                        box-sizing: border-box;
                      }
                      @page { 
                        size: A4 portrait; 
                        margin: 0; 
                      }
                      .page { 
                          padding: 0; 
                          display: block; 
                          height: auto;
                          min-height: 0;
                      }
                      .sheet-container { 
                          width: 100%; 
                          border: none; 
                          box-shadow: none; 
                          border-radius: 0;
                      }
                  }
              </style>
          </head>
          <body>${sheetsHtml}</body>
      </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
};


  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg printable-content">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 no-print">
        <h2 className="text-2xl font-bold text-slate-800 font-display whitespace-nowrap">Liste Complète</h2>
        <div className="flex items-center gap-4 flex-grow w-full sm:w-auto flex-wrap justify-end">
            <div className="relative flex-grow sm:flex-grow-0 min-w-[200px]">
              <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
            </div>
            <div>
              <select
                id="class-filter"
                value={classFilter}
                onChange={(e) => onClassFilterChange(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="all">Toutes les classes</option>
                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <label className="flex items-center space-x-2 whitespace-nowrap text-sm">
              <input type="checkbox" checked={showArchived} onChange={(e) => onShowArchivedChange(e.target.checked)} className="h-4 w-4 rounded" />
              <span>Inclure les archivés</span>
            </label>
             <button onClick={handlePrintList} className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg shadow-sm hover:bg-gray-700">Imprimer la liste</button>
        </div>
      </div>

       {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex flex-col sm:flex-row items-center gap-4 transition-all duration-300 no-print">
          <span className="font-semibold text-blue-800 text-center sm:text-left flex-grow">{selectedIds.size} élève(s) sélectionné(s).</span>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {showBulkEnrollButton && (
                <button onClick={onBulkEnrollRequest} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700">Inscrire</button>
            )}
             {atLeastOneEnrolled && (
              <button onClick={onChangeClassRequest} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700">Changer Classe</button>
            )}
            <button onClick={handlePrintSheets} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700">Fiches</button>
            {user?.role === 'admin' && !showArchived && <button onClick={() => onSetStatusRequest('archived')} className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md shadow-sm hover:bg-yellow-700">Archiver</button>}
            {user?.role === 'admin' && showArchived && <button onClick={() => onSetStatusRequest('active')} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md shadow-sm hover:bg-teal-700">Réactiver</button>}
            <button onClick={onDeleteRequest} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700">Supprimer</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-2 py-3 no-print"></th>
              <th scope="col" className="p-4 no-print"><input type="checkbox" onChange={handleSelectAll(filteredAndSortedStudents)} checked={filteredAndSortedStudents.length > 0 && selectedIds.size === filteredAndSortedStudents.length} className="h-4 w-4 text-blue-600 rounded" /></th>
              <th scope="col" className="px-2 py-3 text-left"></th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">NISU</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"><button onClick={() => handleSort('nom')} className="group inline-flex items-center">Nom {sortConfig?.key === 'nom' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</button></th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"><button onClick={() => handleSort('prenom')} className="group inline-flex">Prénom</button></th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider">Sexe</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Classe</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date de Naissance</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">MPPA</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {isLoading ? (
                <tr><td colSpan={10} className="text-center py-10 text-slate-500">Chargement...</td></tr>
            ) : filteredAndSortedStudents.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-slate-500">Aucun élève ne correspond à vos critères.</td></tr>
            ) : filteredAndSortedStudents.map((student) => {
                const hasScholarship = student.enrollment?.adjustments?.some(adj => adj.amount < 0);
                return (
                    <tr key={student.id} onDoubleClick={() => onEditRequest(student)} className={`hover:bg-blue-50 cursor-pointer ${selectedIds.has(student.id) ? 'bg-blue-100' : 'even:bg-gray-50'} ${student.status === 'archived' ? 'opacity-60' : ''}`}>
                      <td className="px-2 py-2 no-print">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditRequest(student); }}
                          className="p-2 text-slate-500 hover:bg-slate-200 hover:text-blue-600 rounded-full transition-colors"
                          title="Modifier le profil"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </td>
                      <td className="p-4 no-print"><input type="checkbox" checked={selectedIds.has(student.id)} onChange={() => handleSelectOne(student.id)} className="h-4 w-4 text-blue-600 rounded" /></td>
                      <td className="px-2 py-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setLightboxStudent(student); }}
                            className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-transform duration-200 hover:scale-110"
                            aria-label={`Agrandir la photo de ${student.prenom} ${student.nom}`}
                        >
                            <Avatar student={student} />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">{student.nisu || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 flex items-center gap-2">
                          {student.nom}
                          {hasScholarship && <span title="Cet élève bénéficie d'une bourse ou réduction">🎓</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{student.prenom}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">{student.sexe || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                            {student.enrollment ? (<span className="h-2 w-2 rounded-full bg-green-500" title="Inscrit"></span>) : (<span className="h-2 w-2 rounded-full bg-slate-400" title="Non-inscrit"></span>)}
                            <span className="font-medium">{student.enrollment?.className || student.classe_ref || '-'}</span>
                             {student.status === 'archived' && <span className="ml-2 text-xs font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">Archivé</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatDate(student.date_of_birth)}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right`}>{student.enrollment ? formatCurrency(student.enrollment.mppa) : '-'}</td>
                    </tr>
                );
            })}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 no-print">
            <span className="text-sm text-slate-600">
                Page <span className="font-bold">{pagination.page}</span> sur <span className="font-bold">{pagination.totalPages}</span> (Total: {pagination.total} élèves)
            </span>
            <div className="flex items-center gap-2">
                <button onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3 py-1 bg-slate-200 rounded disabled:opacity-50 text-sm">Précédent</button>
                <button onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="px-3 py-1 bg-slate-200 rounded disabled:opacity-50 text-sm">Suivant</button>
            </div>
        </div>
      )}

      <ImageLightbox 
        isOpen={!!lightboxStudent}
        onClose={() => setLightboxStudent(null)}
        student={lightboxStudent}
      />
    </div>
  );
};

export default AllStudentsTable;