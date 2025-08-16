import type { StudentFormState } from './types';

export const CLASSES: string[] = [];

export const EMPTY_STUDENT_FORM: StudentFormState = {
  nom: '',
  prenom: '',
  date_of_birth: null,
  address: null,
  photo_url: null,
  tutor_name: null,
  tutor_phone: null,
  tutor_email: null,
  blood_group: null,
  allergies: null,
  illnesses: null,
  classe_ref: '',
  enrollNow: false,
  enrollmentClassName: '',
  enrollmentMppa: 0,
  enrollmentId: null,
};