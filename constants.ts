import type { StudentFormState } from './types';

export const CLASSES = ['7AF', '8AF', '9AF', 'NSI', 'NSII', 'NSIII', 'NSIV'];

export const EMPTY_STUDENT_FORM: StudentFormState = {
  nom: '',
  prenom: '',
  date_of_birth: null,
  address: null,
  photo_url: null,
  tutor_name: null,
  tutor_phone: null,
  tutor_email: null,
  medical_notes: null,
  classe_ref: '',
  enrollNow: false,
  enrollmentClassName: CLASSES[0],
  enrollmentMppa: 0,
  enrollmentId: null,
};