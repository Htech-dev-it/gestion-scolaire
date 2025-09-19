import React, { useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { DailyAttendanceSheet, DetailedAttendanceReport } from './AttendanceReport';
import { useSchoolYear } from '../contexts/SchoolYearContext';

const AttendanceReportPage: React.FC = () => {
  const { classes } = useSchoolYear();
  const [activeView, setActiveView] = useState<'daily' | 'detailed'>('daily');

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <ReactRouterDOM.Link to="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium no-print">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Retour à l'accueil
        </ReactRouterDOM.Link>
        <h1 className="text-4xl font-bold text-gray-800 font-display">Suivi des Présences</h1>
        <p className="text-lg text-slate-500 mt-2">Consulter et imprimer les rapports de présence par classe.</p>
      </header>

      <div className="mb-6 border-b border-slate-200">
        <div className="flex items-center space-x-2">
            <button onClick={() => setActiveView('daily')} className={`px-4 py-2 font-medium text-sm rounded-t-md transition-colors ${activeView === 'daily' ? 'bg-white border border-slate-200 border-b-white -mb-px' : 'text-slate-500 hover:bg-slate-100'}`}>
                Feuille d'Appel (Vue par Jour)
            </button>
            <button onClick={() => setActiveView('detailed')} className={`px-4 py-2 font-medium text-sm rounded-t-md transition-colors ${activeView === 'detailed' ? 'bg-white border border-slate-200 border-b-white -mb-px' : 'text-slate-500 hover:bg-slate-100'}`}>
                Rapport Détaillé (Vue par Cours)
            </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl rounded-tl-none shadow-lg">
        {activeView === 'daily' && <DailyAttendanceSheet classes={classes} />}
        {activeView === 'detailed' && <DetailedAttendanceReport classes={classes} />}
      </div>
    </div>
  );
};

export default AttendanceReportPage;