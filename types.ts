export interface Payment {
  amount: number;
  date: string | null; // ISO string date when payment was made
}

// Represents the timeless profile of a student
export interface StudentProfile {
  id: string; // Unique ID for each student
  nom: string;
  prenom: string;
  sexe: 'M' | 'F' | null;
  nisu: string | null;
  date_of_birth: string | null;
  address: string | null;
  photo_url: string | null;
  tutor_name: string | null;
  tutor_phone: string | null;
  tutor_email: string | null;
  medical_notes: string | null;
  classe_ref?: string | null; // New reference class field
  status: 'active' | 'archived';
  instance_id: number;
}

// Represents a student's enrollment for a specific school year
export interface Enrollment {
    id: number; // PK for the enrollment record
    student_id: string;
    year_id: number;
    className: string;
    mppa: number;
    payments: [Payment, Payment, Payment, Payment];
    grades_access_enabled: boolean; // NEW: Controls student access to their grades
    student?: StudentProfile; // Optional, for joined data from backend
    year_name?: string; // from join with school_years for reports
    // Optional fields for final report cards
    annualAverage?: number;
    promotionStatus?: 'ADMIS(E) EN CLASSE SUPÉRIEURE' | 'À REFAIRE';
}

export interface ClassDefinition {
    id: number;
    name: string;
    order_index: number;
    instance_id: number;
}


export interface SchoolYear {
    id: number;
    name: string; // E.g., "2023-2024"
    is_current: 0 | 1;
    instance_id: number;
}

export interface Instance {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
    passing_grade: number | null;
    status: 'active' | 'suspended';
    expires_at: string | null;
}

export interface Subject {
  id: number;
  name: string;
  instance_id: number;
}

export interface ClassSubject {
  id: number;
  class_name: string;
  subject_id: number;
  year_id: number;
  subject_name: string;
  max_grade: number;
}

export interface AcademicPeriod {
  id: number;
  year_id: number;
  name: string;
}

export interface Grade {
  id: number;
  enrollment_id: number;
  subject_id: number;
  period_id: number;
  evaluation_name: string;
  score: number;
  max_score: number;
  date: string;
}

// Type for the combined data structure often used in the frontend
export interface StudentWithEnrollment extends StudentProfile {
    enrollment?: {
        id: number;
        className: string;
        mppa: number;
    }
}

// Type for the Student Form state
export interface StudentFormState {
  nom: string;
  prenom: string;
  sexe: 'M' | 'F' | '';
  date_of_birth: string | null;
  address: string | null;
  photo_url: string | null;
  tutor_name: string | null;
  tutor_phone: string | null;
  tutor_email: string | null;
  blood_group: string | null;
  allergies: string | null;
  illnesses: string | null;
  classe_ref?: string | null;
  
  hasNisu: boolean;
  nisu: string;

  enrollNow: boolean;
  enrollmentClassName: string;
  enrollmentMppa: number;
  enrollmentId: number | null;
}


// --- NEW TEACHER-RELATED TYPES ---
export interface Teacher {
  id: number;
  nom: string;
  prenom: string;
  email: string | null;
  phone: string | null;
  nif?: string | null;
  user_id: number;
  username: string;
  instance_id: number;
}

export interface TeacherAssignment {
    id: number;
    teacher_id: number;
    class_name: string;
    subject_id: number;
    year_id: number;
}

// Enriched assignment type from API
export interface FullTeacherAssignment extends TeacherAssignment {
    subject_name: string;
    teacher_prenom: string;
    teacher_nom: string;
}


export interface AttendanceRecord {
    id: number;
    enrollment_id: number;
    date: string; // ISO String
    status: 'present' | 'absent' | 'late';
    subject_id: number;
    teacher_id: number;
}

export interface TeacherDashboardAssignment {
  class_name: string;
  subject_id: number;
  subject_name: string;
}

// --- NEW ADMIN ATTENDANCE REPORT TYPES ---
export interface AttendanceReportRecord {
    student_id: string;
    date: string; // 'YYYY-MM-DD'
    status: 'present' | 'absent' | 'late';
    subject_name: string;
}

export interface AttendanceReportData {
    students: { id: string, nom: string, prenom: string }[];
    records: AttendanceReportRecord[];
    dates: string[];
}


// Deprecated, use StudentWithEnrollment instead where possible
export interface Student extends StudentProfile {
    mppa: number;
    payments: [Payment, Payment, Payment, Payment];
}

// --- NEW RBAC (Role-Based Access Control) TYPES ---
export interface Permission {
    id: number;
    key: string;
    description: string;
    category: string;
}

export interface Role {
    id: number;
    name: string;
    instance_id: number;
    permissions?: Permission[]; // Optional for full role data
}

// Auth-related types
export type UserRole = 'admin' | 'teacher' | 'standard' | 'student' | 'superadmin' | 'superadmin_delegate';

export interface User {
    id: number;
    username: string;
    role: UserRole;
    prenom?: string;
    nom?: string;
    student_id?: string; // For student users
    instance_id?: number | null; // Can be null for superadmin
    permissions?: string[]; // RBAC permissions
    roles?: Role[]; // RBAC assigned roles
}

export interface StudentUser {
    id: number;
    student_id: string;
    username: string;
    status: string;
}

export interface StudentWithAccountStatus {
    student_id: string;
    nom: string;
    prenom: string;
    account_id: number | null;
}


// --- PAGINATION & AUDIT LOG TYPES ---
export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  user_id: number;
  username: string;
  action_type: string;
  target_id: string | null;
  target_name: string | null;
  details: string | null; // JSON string
  instance_id: number;
}

export interface PaginatedAuditLogs {
    logs: AuditLogEntry[];
    pagination: PaginationInfo;
}

export interface PaginatedStudents {
    students: StudentWithEnrollment[];
    pagination: PaginationInfo;
}

export interface PaginatedEnrollments {
    enrollments: Enrollment[];
    pagination: PaginationInfo;
}

// --- NEW TIMETABLE TYPES ---
export interface Location {
  id: number;
  name: string;
  capacity?: number | null;
  instance_id: number;
}

export interface ScheduleSlot {
  id: number;
  assignment_id: number;
  day_of_week: number; // 1 (Monday) to 7 (Sunday)
  start_time: string; // "HH:MM:SS"
  end_time: string; // "HH:MM:SS"
  location_id: number | null;
}

// For data returned from the API with joins
export interface FullScheduleSlot extends ScheduleSlot {
  class_name: string;
  teacher_id: number;
  teacher_prenom: string;
  teacher_nom: string;
  subject_id: number;
  subject_name: string;
  location_name: string | null;
}

// --- STUDENT PORTAL TYPES ---
export interface StudentGradeData {
    period_id: number;
    period_name: string;
    subjects: {
        subject_id: number;
        subject_name: string;
        max_grade: number;
        average: number;
        appreciation: string | null;
        grades: Grade[];
    }[];
    period_average: number;
    general_appreciation: string | null;
}

export interface StudentAccessStatus {
    grades_access_enabled: boolean;
}

// --- RESOURCES TYPES ---
export interface Resource {
    id: number;
    assignment_id: number;
    resource_type: 'file' | 'link';
    title: string;
    url?: string | null;
    file_name?: string | null;
    mime_type?: string | null;
    file_content?: string | null; // Base64 content for viewing/downloading
    created_at: string;
    
    // Joined fields for different views
    subject_id?: number;
    subject_name?: string;
    class_name?: string;
    teacher_prenom?: string;
    teacher_nom?: string;
}

// --- SUPER ADMIN & ANNOUNCEMENT TYPES ---
export interface Announcement {
    id: number;
    title: string;
    content: string;
    is_active: boolean;
    created_at: string;
    instance_id?: number | null;
}

export interface DashboardStats {
    totalInstances: number;
    activeInstances: number;
    totalUsers: number;
    totalStudents: number;
}

// --- NEW SUPPORT & MESSAGING TYPES ---
export interface PlatformSettings {
    contact_phone?: string | null;
    contact_email?: string | null;
}

export interface Message {
    id: number;
    instance_id: number;
    sender_role: 'admin' | 'superadmin';
    sender_id: number;
    content: string;
    created_at: string;
    is_read_by_superadmin: boolean;
}

export interface MessageSummary {
    instance_id: number;
    instance_name: string;
    unread_count: number;
}