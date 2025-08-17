import React, { useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import { useStudentAccess } from '../contexts/StudentAccessContext';
import Tooltip from './Tooltip';

const NavLink: React.FC<{ to: string, children: React.ReactNode, isDisabled?: boolean, onClick?: () => void }> = ({ to, children, isDisabled = false, onClick }) => {
    const location = ReactRouterDOM.useLocation();
    const isActive = location.pathname === to;
    
    const commonClasses = `px-2.5 py-2 text-sm font-medium rounded-lg transition-colors`;
    
    const activeClasses = 'bg-[#4A90E2] text-white';
    const normalClasses = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
    const disabledClasses = 'text-slate-400 bg-slate-100 cursor-not-allowed';

    const className = isDisabled ? `${commonClasses} ${disabledClasses}` : isActive ? `${commonClasses} ${activeClasses}` : `${commonClasses} ${normalClasses}`;

    if (isDisabled) {
        return (
            <Tooltip text="L'accès à cette section est actuellement restreint. Veuillez vous rapprocher de l'administration.">
                <span className={className}>{children}</span>
            </Tooltip>
        );
    }
    
    return <ReactRouterDOM.Link to={to} className={className} onClick={onClick}>{children}</ReactRouterDOM.Link>;
};

const StudentNavLinks: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
    const { accessStatus } = useStudentAccess();
    const isGradesDisabled = !accessStatus?.grades_access_enabled;
    
    return (
        <>
            <NavLink to="/student" onClick={onClick}>Tableau de Bord</NavLink>
            <NavLink to="/student/timetable" onClick={onClick}>Emploi du temps</NavLink>
            <NavLink to="/student/grades" isDisabled={isGradesDisabled} onClick={onClick}>Notes</NavLink>
            <NavLink to="/student/resources" onClick={onClick}>Ressources</NavLink>
            <NavLink to="/student/finance" onClick={onClick}>Finances</NavLink>
            <NavLink to="/student/docs" onClick={onClick}>Documentation</NavLink>
        </>
    );
};

const Header: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const { schoolYears, selectedYear, setSelectedYearById, isLoading } = useSchoolYear();
  const navigate = ReactRouterDOM.useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
    navigate('/login');
  };
  
  const closeMenu = () => setIsMobileMenuOpen(false);

  const renderNavLinks = (isMobile = false) => {
    const commonProps = isMobile ? { onClick: closeMenu } : {};
    
    return (
        <>
            {user?.role === 'student' ? (
                <StudentNavLinks {...commonProps} />
            ) : hasPermission('user:manage') ? ( // This is typically a full admin
                 <>
                    <NavLink to="/admin" {...commonProps}>Administration</NavLink>
                    <NavLink to="/dashboard" {...commonProps}>Tableau de bord</NavLink>
                    {hasPermission('student_portal:manage_accounts') && <NavLink to="/student-portal" {...commonProps}>Portail Élève</NavLink>}
                    <NavLink to="/admin/contact" {...commonProps}>Support</NavLink>
                    <NavLink to="/docs" {...commonProps}>Documentation</NavLink>
                 </>
            ) : user?.role === 'standard' ? (
                <>
                    <NavLink to="/dashboard" {...commonProps}>Tableau de bord</NavLink>
                    {hasPermission('student_portal:manage_accounts') && <NavLink to="/student-portal" {...commonProps}>Portail Élève</NavLink>}
                    <NavLink to="/docs" {...commonProps}>Documentation</NavLink>
                </>
            ) : user?.role === 'superadmin' || user?.role === 'superadmin_delegate' ? (
                 <>
                    <NavLink to="/docs" {...commonProps}>Documentation</NavLink>
                 </>
            ) : (
                 <>
                    <NavLink to="/docs" {...commonProps}>Documentation</NavLink>
                 </>
            )}
            <button
                onClick={handleLogout}
                className={`px-4 py-2 text-sm font-bold rounded-lg shadow-sm transition-colors text-white bg-[#F5A623] hover:bg-[#E49B20] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F5A623] ${isMobile ? 'w-full' : ''}`}
              >
                Déconnexion
              </button>
        </>
    );
  };


  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white shadow-md no-print">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-2 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <ReactRouterDOM.Link to="/" className="flex items-center gap-2 text-xl font-bold text-[#1A202C] hover:text-[#4A90E2] transition-colors">
                <img src="/scolalink_logo.jpg" alt="ScolaLink Logo" className="h-10 w-auto" />
                <span className="hidden sm:inline">ScolaLink</span>
            </ReactRouterDOM.Link>
            
            <div className="relative">
                <label htmlFor="school-year-select" className="sr-only">Année Scolaire</label>
                <select
                    id="school-year-select"
                    value={selectedYear?.id || ''}
                    onChange={(e) => setSelectedYearById(Number(e.target.value))}
                    disabled={isLoading || schoolYears.length === 0}
                    className="pl-3 pr-8 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] transition appearance-none"
                >
                    {isLoading ? (
                        <option>Chargement...</option>
                    ) : (
                        schoolYears.map(year => (
                            <option key={year.id} value={year.id} style={{ backgroundColor: 'white' }}>
                                {year.name} {year.is_current ? '(Actuelle)' : ''}
                            </option>
                        ))
                    )}
                </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        </div>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-2">
            {renderNavLinks(false)}
        </nav>
        
        {/* Hamburger Button */}
        <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm md:hidden" onClick={closeMenu}>
             <div className="bg-white shadow-lg w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center px-4 py-2 border-b border-slate-200">
                  <span className="text-lg font-bold text-slate-800">Menu</span>
                  <button onClick={closeMenu} className="p-2 text-slate-500 hover:bg-slate-100 rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
              </div>
              <nav className="flex flex-col items-stretch gap-4 p-4">
                {renderNavLinks(true)}
              </nav>
            </div>
          </div>
      )}
    </header>
  );
};

export default Header;