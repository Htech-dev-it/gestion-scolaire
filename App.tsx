import React, { Suspense } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import TeacherRoute from './components/TeacherRoute';
import StudentRoute from './components/StudentRoute';
import SuperAdminRoute from './components/SuperAdminRoute'; // Import new route
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import ClassPage from './components/ClassPage';
import ReportPage from './components/ReportPage';
import AdminPage from './components/AdminPage';
import AddUserForm from './components/AddUserForm';
import UserList from './components/UserList';
import NotificationContainer from './components/NotificationContainer';
import StudentsPage from './components/StudentsPage';
import Header from './components/Header';
import ReportCardPage from './components/ReportCardPage';
import TeacherDashboard from './components/TeacherDashboard';
import AttendanceReportPage from './components/AttendanceReportPage';
import DocumentationPage from './components/DocumentationPage';
import { useAuth } from './auth/AuthContext';
import { StudentAccessProvider } from './contexts/StudentAccessContext';
import LandingPage from './components/LandingPage';

// Lazy load teacher, student, and superadmin pages
const TeacherClassPage = React.lazy(() => import('./components/TeacherClassPage'));
const StudentDashboard = React.lazy(() => import('./components/student/StudentDashboard'));
const StudentTimetablePage = React.lazy(() => import('./components/student/StudentTimetablePage'));
const StudentGradesPage = React.lazy(() => import('./components/student/StudentGradesPage'));
const StudentResourcesPage = React.lazy(() => import('./components/student/StudentResourcesPage'));
const StudentDocumentationPage = React.lazy(() => import('./components/DocumentationPage'));
const SuperAdminPage = React.lazy(() => import('./components/SuperAdminPage')); // Lazy load SuperAdminPage
const AdminContactPage = React.lazy(() => import('./components/AdminContactPage'));
const StudentPortalAdminPage = React.lazy(() => import('./components/StudentPortalAdminPage'));
const TeachersManagementPage = React.lazy(() => import('./components/TeachersManagementPage'));
const TimetablePage = React.lazy(() => import('./components/TimetablePage'));


const ProtectedLayout = () => {
  const { user } = useAuth();
  
  const layoutContent = (
    <>
      <Header />
      <main className="pt-20 px-4">
        <ReactRouterDOM.Outlet />
      </main>
    </>
  );

  // If the user is a student, wrap the layout with the provider
  // This ensures the context is available for the Header on ANY protected page a student can see.
  if (user?.role === 'student') {
    return <StudentAccessProvider>{layoutContent}</StudentAccessProvider>;
  }

  return layoutContent;
};


const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A202C]">
      <NotificationContainer />
      <ReactRouterDOM.Routes>
        <ReactRouterDOM.Route path="/" element={<LandingPage />} />
        <ReactRouterDOM.Route path="/login" element={<LoginPage />} />
        
        {/* Protected Routes with Header - Now uses the smart ProtectedLayout */}
        <ReactRouterDOM.Route element={<ProtectedRoute><ProtectedLayout /></ProtectedRoute>}>
          <ReactRouterDOM.Route path="/dashboard" element={<HomePage />} />
          <ReactRouterDOM.Route path="/students" element={<StudentsPage />} />
          <ReactRouterDOM.Route path="/class/:className" element={<ClassPage />} />
          <ReactRouterDOM.Route path="/report" element={<ReportPage />} />
          <ReactRouterDOM.Route path="/reports/attendance" element={<AttendanceReportPage />} />
          <ReactRouterDOM.Route path="/report-cards" element={<ReportCardPage />} />
          <ReactRouterDOM.Route path="/docs" element={<DocumentationPage />} />
          <ReactRouterDOM.Route 
            path="/student-portal" 
            element={
              <Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
                <StudentPortalAdminPage />
              </Suspense>
            } 
          />
          <ReactRouterDOM.Route 
            path="/teachers-management" 
            element={
              <Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
                <TeachersManagementPage />
              </Suspense>
            } 
          />
          <ReactRouterDOM.Route 
            path="/timetable" 
            element={
              <Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
                <TimetablePage />
              </Suspense>
            } 
          />
        </ReactRouterDOM.Route>

        {/* Admin Routes (also protected and with header) */}
        <ReactRouterDOM.Route element={<AdminRoute><ProtectedLayout /></AdminRoute>}>
            <ReactRouterDOM.Route path="/admin" element={<AdminPage />} />
            <ReactRouterDOM.Route path="/admin/add-user" element={<AddUserForm />} />
            <ReactRouterDOM.Route path="/admin/users" element={<UserList />} />
            <ReactRouterDOM.Route 
              path="/admin/contact" 
              element={
                <Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
                  <AdminContactPage />
                </Suspense>
              }
            />
        </ReactRouterDOM.Route>
        
        {/* Super Admin Route (also protected and with header) */}
        <ReactRouterDOM.Route element={<SuperAdminRoute><ProtectedLayout /></SuperAdminRoute>}>
          <ReactRouterDOM.Route 
            path="/superadmin" 
            element={
              <Suspense fallback={<div className="p-8 text-center">Chargement du portail Super Admin...</div>}>
                <SuperAdminPage />
              </Suspense>
            }
          />
        </ReactRouterDOM.Route>
        
        {/* Teacher Routes (also protected and with header) */}
        <ReactRouterDOM.Route element={<TeacherRoute><ProtectedLayout /></TeacherRoute>}>
          <ReactRouterDOM.Route path="/teacher" element={<TeacherDashboard />} />
          <ReactRouterDOM.Route 
            path="/teacher/class/:className/subject/:subjectId" 
            element={
              <Suspense fallback={<div className="p-8 text-center">Chargement de la page...</div>}>
                <TeacherClassPage />
              </Suspense>
            } 
          />
        </ReactRouterDOM.Route>

        {/* Student Routes now use the same smart ProtectedLayout, making StudentLayout obsolete */}
        <ReactRouterDOM.Route element={<StudentRoute><ProtectedLayout /></StudentRoute>}>
          <ReactRouterDOM.Route path="/student" element={<Suspense fallback={<div className="p-8 text-center">Chargement...</div>}><StudentDashboard /></Suspense>} />
          <ReactRouterDOM.Route path="/student/timetable" element={<Suspense fallback={<div className="p-8 text-center">Chargement...</div>}><StudentTimetablePage /></Suspense>} />
          <ReactRouterDOM.Route path="/student/grades" element={<Suspense fallback={<div className="p-8 text-center">Chargement...</div>}><StudentGradesPage /></Suspense>} />
          <ReactRouterDOM.Route path="/student/resources" element={<Suspense fallback={<div className="p-8 text-center">Chargement...</div>}><StudentResourcesPage /></Suspense>} />
          <ReactRouterDOM.Route path="/student/docs" element={<Suspense fallback={<div className="p-8 text-center">Chargement...</div>}><StudentDocumentationPage /></Suspense>} />
        </ReactRouterDOM.Route>

      </ReactRouterDOM.Routes>
    </div>
  );
};

export default App;