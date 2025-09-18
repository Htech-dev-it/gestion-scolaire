import React, { useMemo } from 'react';
import type { StudentProfile, Instance } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  instanceInfo: Instance | null;
}

const Avatar: React.FC<{ student: StudentProfile, size?: string }> = ({ student, size = "h-24 w-24" }) => {
    const initials = `${student.prenom?.[0] || ''}${student.nom?.[0] || ''}`.toUpperCase();
    const colors = ['bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-red-200', 'bg-purple-200', 'bg-pink-200'];
    const color = colors[((student.nom?.charCodeAt(0) || 0) + (student.prenom?.charCodeAt(0) || 0)) % colors.length];

    if (student.photo_url) {
        return <img src={student.photo_url} alt={`${student.prenom} ${student.nom}`} className={`${size} rounded-full object-cover shadow-md`}/>;
    }
    return (
        <div className={`${size} rounded-full flex items-center justify-center font-bold text-3xl text-slate-700 ${color} shadow-md`}>
            {initials}
        </div>
    );
};

const DetailRow: React.FC<{ label: string, value: string | null | undefined }> = ({ label, value }) => (
    <div className="py-2 grid grid-cols-3 gap-4">
        <dt className="text-sm font-medium text-slate-500">{label}</dt>
        <dd className="mt-0 text-sm text-slate-900 col-span-2">{value || <span className="italic text-slate-400">Non renseigné</span>}</dd>
    </div>
);


const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ isOpen, onClose, student, instanceInfo }) => {
  const { addNotification } = useNotification();
  
  const medicalInfo = useMemo(() => {
    if (!student?.medical_notes) {
        return { blood_group: null, allergies: null, illnesses: null, raw: null };
    }
    try {
        const parsed = JSON.parse(student.medical_notes);
        if (typeof parsed === 'object' && parsed !== null && ('blood_group' in parsed || 'allergies' in parsed || 'illnesses' in parsed)) {
            return {
                blood_group: parsed.blood_group,
                allergies: parsed.allergies,
                illnesses: parsed.illnesses,
                raw: null,
            };
        }
        return { blood_group: null, allergies: null, illnesses: null, raw: student.medical_notes };
    } catch (e) {
        return { blood_group: null, allergies: null, illnesses: null, raw: student.medical_notes };
    }
  }, [student?.medical_notes]);


  if (!isOpen || !student) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('fr-FR');
  };
  
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        addNotification({ type: 'warning', message: 'Veuillez autoriser les pop-ups pour imprimer.' });
        return;
    }
  
    const getAvatarHtml = (studentToPrint: StudentProfile) => {
        if (studentToPrint.photo_url) {
            return `<img src="${studentToPrint.photo_url}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #eee;" />`;
        }
        const initials = `${studentToPrint.prenom?.[0] || ''}${studentToPrint.nom?.[0] || ''}`.toUpperCase();
        const colors = ['#e0e7ff', '#d1fae5', '#fef3c7', '#fee2e2', '#f3e8ff', '#fce7f3'];
        const color = colors[((studentToPrint.nom?.charCodeAt(0) || 0) + (studentToPrint.prenom?.charCodeAt(0) || 0)) % colors.length];
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
  
    const sheetHtml = `
      <div class="sheet-container">
          <div class="school-header">
              ${instanceInfo?.logo_url ? `<img src="${instanceInfo.logo_url}" style="height: 60px; margin: 0 auto 10px; object-fit: contain;" />` : ''}
              <h1>${instanceInfo?.name || ''}</h1>
              <p>${instanceInfo?.address || ''}</p>
              <p>${instanceInfo?.phone || ''}</p>
          </div>
          <div class="student-header">
              ${getAvatarHtml(student)}
              <div class="student-title">
                  <h2>${student.prenom} ${student.nom}</h2>
              </div>
          </div>

          <div class="section">
              <h3>Informations Personnelles</h3>
              <div class="detail-grid">
                  <div class="detail-label">Date de Naissance:</div>
                  <div class="detail-value">${formatDate(student.date_of_birth) || 'Non renseignée'}</div>
                  <div class="detail-label">Adresse:</div>
                  <div class="detail-value">${student.address || 'Non renseignée'}</div>
              </div>
          </div>

          <div class="section">
              <h3>Informations du Tuteur</h3>
               <div class="detail-grid">
                  <div class="detail-label">Nom complet:</div>
                  <div class="detail-value">${student.tutor_name || 'Non renseigné'}</div>
                  <div class="detail-label">Téléphone:</div>
                  <div class="detail-value">${student.tutor_phone || 'Non renseigné'}</div>
                  <div class="detail-label">Email:</div>
                  <div class="detail-value">${student.tutor_email || 'Non renseigné'}</div>
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
    `;

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
                      display: flex;
                      justify-content: center;
                      align-items: flex-start;
                      padding-top: 20px;
                      padding-bottom: 20px;
                    }
                    .sheet-container {
                        width: 180mm;
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
                    .section { margin-top: 25px; }
                    .section h3 { font-size: 13pt; margin-bottom: 12px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; color: #333; }
                    .detail-grid { display: grid; grid-template-columns: 180px 1fr; gap: 12px 16px; line-height: 1.6; font-size: 11pt; }
                    .detail-label { font-weight: bold; color: #444; }
                    .detail-value { color: #111; }
                    .notes { font-size: 11pt; white-space: pre-wrap; background-color: #f9f9f9; padding: 12px; border: 1px solid #e0e0e0; border-radius: 4px; min-height: 50px; }
                    .print-footer { text-align: center; font-size: 8pt; color: #888; margin-top: 40px; border-top: 1px dashed #ccc; padding-top: 10px; }
                    @media print {
                        body {
                            background: none;
                            padding: 20mm;
                            justify-content: flex-start;
                            box-sizing: border-box;
                            margin: 0;
                        }
                        @page { size: A4 portrait; margin: 0; }
                        .sheet-container { width: 100%; border: none; box-shadow: none; border-radius: 0; }
                    }
                </style>
            </head>
            <body>${sheetHtml}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl mx-4 my-8 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-800 font-display">Fiche de l'Élève</h2>
            <div className="space-x-2">
                <button onClick={handlePrint} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition no-print">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                </button>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition no-print">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        <div id="student-detail-printable">
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                <Avatar student={student} size="h-20 w-20" />
                <div className="flex-grow text-center sm:text-left pt-2">
                    <h3 className="text-xl font-bold text-slate-800">{student.prenom} {student.nom}</h3>
                </div>
            </div>

            <hr className="my-6" />

            <div>
                <h4 className="text-base font-semibold text-slate-600 mb-2">Informations Personnelles</h4>
                <dl>
                    <DetailRow label="Date de Naissance" value={formatDate(student.date_of_birth)} />
                    <DetailRow label="Adresse" value={student.address} />
                </dl>
            </div>
            
            <hr className="my-6" />

            <div>
                <h4 className="text-base font-semibold text-slate-600 mb-2">Informations du Tuteur</h4>
                <dl>
                    <DetailRow label="Nom complet" value={student.tutor_name} />
                    <DetailRow label="Téléphone" value={student.tutor_phone} />
                    <DetailRow label="Email" value={student.tutor_email} />
                </dl>
            </div>
            
            <hr className="my-6" />

            <div>
                <h4 className="text-base font-semibold text-slate-600 mb-2">Notes Médicales</h4>
                 {medicalInfo.raw ? (
                    <div className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-md">
                        {medicalInfo.raw}
                    </div>
                ) : (medicalInfo.blood_group || medicalInfo.allergies || medicalInfo.illnesses) ? (
                    <dl>
                        <DetailRow label="Groupe Sanguin" value={medicalInfo.blood_group} />
                        <DetailRow label="Allergies" value={medicalInfo.allergies} />
                        <DetailRow label="Maladies Connues" value={medicalInfo.illnesses} />
                    </dl>
                ) : (
                    <div className="text-sm text-slate-800 bg-slate-50 p-3 rounded-md">
                        <span className="italic text-slate-400">Aucune note.</span>
                    </div>
                )}
            </div>
        </div>
        
      </div>
    </div>
  );
};

export default StudentDetailModal;