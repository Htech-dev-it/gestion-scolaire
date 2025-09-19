import React, { ChangeEvent, useEffect, useState } from 'react';
import type { StudentFormState, SchoolYear, ClassFinancials } from '../types';
import { useSchoolYear } from '../contexts/SchoolYearContext';
import DateInput from './DateInput';
import PhoneInput from 'react-phone-input-2';
import { apiFetch } from '../utils/api';
import { useCurrency } from '../contexts/CurrencyContext';

interface StudentFormProps {
  formState: StudentFormState;
  isEditing: boolean;
  setFormState: React.Dispatch<React.SetStateAction<StudentFormState>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  selectedYear: SchoolYear | null;
}

const InputField: React.FC<{ label: string; name: keyof Omit<StudentFormState, 'photo_url' | 'classe_ref' | 'enrollNow' | 'enrollmentClassName' | 'enrollmentMppa' | 'enrollmentId' | 'date_of_birth' | 'tutor_phone' | 'blood_group' | 'allergies' | 'illnesses' | 'sexe' | 'hasNisu' | 'nisu'>; value: string | number | null; onChange: (e: ChangeEvent<HTMLInputElement>) => void; type?: string; placeholder?: string; required?: boolean; }> = 
  ({ label, name, value, onChange, type = 'text', placeholder, required = false }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-slate-700">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input type={type} id={name} name={name} value={value || ''} onChange={onChange} placeholder={placeholder} required={required}
      className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
    />
  </div>
);

const StudentForm: React.FC<StudentFormProps> = ({ formState, isEditing, setFormState, onSubmit, onCancel, selectedYear }) => {
  const { classes } = useSchoolYear();
  const { formatCurrency } = useCurrency();
  const [classFinancials, setClassFinancials] = useState<ClassFinancials[]>([]);

  // Fetch all financials for the current year once
  useEffect(() => {
    if (selectedYear) {
      apiFetch(`/class-financials?yearId=${selectedYear.id}`)
          .then(data => setClassFinancials(data))
          .catch(err => console.error("Failed to fetch class financials", err));
    }
  }, [selectedYear]);


  useEffect(() => {
    // Set a default class for enrollment if 'enrollNow' is checked and no class is selected
    if (formState.enrollNow && !formState.enrollmentClassName && classes.length > 0) {
      setFormState(prev => ({ ...prev, enrollmentClassName: classes[0].name }));
    }
  }, [classes, formState.enrollNow, formState.enrollmentClassName, setFormState]);

  // When the enrollment class changes, find the default MPPA and set it
  useEffect(() => {
    if (formState.enrollNow && formState.enrollmentClassName && classFinancials.length > 0) {
        const financialInfo = classFinancials.find(cf => cf.class_name === formState.enrollmentClassName);
        if (financialInfo) {
            setFormState(prev => ({ ...prev, enrollmentMppa: financialInfo.mppa }));
        } else {
            setFormState(prev => ({ ...prev, enrollmentMppa: 0 })); // Reset if no default is found
        }
    }
  }, [formState.enrollmentClassName, formState.enrollNow, classFinancials, setFormState]);


  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormState(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
        setFormState(prev => ({ ...prev, [name]: Number(value) }));
    } else {
        setFormState(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePhoneChange = (phone: string) => {
    setFormState(prev => ({ ...prev, tutor_phone: phone }));
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormState(prev => ({ ...prev, photo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg sticky top-24">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 font-display">{isEditing ? 'Modifier le Profil' : 'Ajouter un Élève'}</h2>
      <form onSubmit={onSubmit} className="space-y-6">

        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-slate-500 mb-2 -ml-1">Informations Personnelles</legend>
          <InputField label="Nom" name="nom" value={formState.nom} onChange={handleChange} placeholder="Ex: DUPONT" required />
          <InputField label="Prénom" name="prenom" value={formState.prenom} onChange={handleChange} placeholder="Ex: Jean" required />
          
          <div>
            <label className="block text-sm font-medium text-slate-700">Sexe<span className="text-red-500 ml-1">*</span></label>
            <div className="mt-1 flex items-center space-x-4">
                <label className="flex items-center">
                    <input type="radio" name="sexe" value="M" checked={formState.sexe === 'M'} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" required />
                    <span className="ml-2 text-sm text-slate-700">Masculin</span>
                </label>
                <label className="flex items-center">
                    <input type="radio" name="sexe" value="F" checked={formState.sexe === 'F'} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-slate-700">Féminin</span>
                </label>
            </div>
          </div>

           <div>
            <label htmlFor="classe_ref" className="block text-sm font-medium text-slate-700">Classe de Référence<span className="text-red-500 ml-1">*</span></label>
            <select
              id="classe_ref"
              name="classe_ref"
              value={formState.classe_ref || ''}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
              required
            >
              <option value="">Non spécifiée</option>
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <DateInput
            label="Date de Naissance"
            id="date_of_birth"
            value={formState.date_of_birth || ''}
            onChange={(dateValue) => setFormState(prev => ({ ...prev, date_of_birth: dateValue || null }))}
            required
          />

          <InputField label="Adresse" name="address" value={formState.address} onChange={handleChange} placeholder="Ex: 12, Rue de la Paix" required />
        </fieldset>

        <fieldset className="space-y-2 pt-4 border-t">
          <legend className="text-base font-semibold text-slate-500 mb-2 -ml-1">Identification Scolaire</legend>
          <div>
              <label className="block text-sm font-medium text-slate-700">Avez-vous le NISU officiel de l'élève ?</label>
              <div className="mt-1 flex items-center space-x-4">
                  <label className="flex items-center">
                      <input type="radio" name="hasNisu" checked={formState.hasNisu} onChange={() => setFormState(prev => ({ ...prev, hasNisu: true }))} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                      <span className="ml-2 text-sm text-slate-700">Oui</span>
                  </label>
                  <label className="flex items-center">
                      <input type="radio" name="hasNisu" checked={!formState.hasNisu} onChange={() => setFormState(prev => ({ ...prev, hasNisu: false }))} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                      <span className="ml-2 text-sm text-slate-700">Non</span>
                  </label>
              </div>
              <p className="text-xs text-slate-500 mt-1">Si non, un code temporaire sera généré automatiquement.</p>
          </div>
          {formState.hasNisu && (
              <div>
                  <label htmlFor="nisu" className="block text-sm font-medium text-slate-700">NISU (Numéro d'Identification Scolaire Unique)</label>
                  <input
                      type="text"
                      id="nisu"
                      name="nisu"
                      value={formState.nisu || ''}
                      onChange={e => setFormState(prev => ({ ...prev, nisu: e.target.value.toUpperCase() }))}
                      placeholder="ARMA19740412G0500065"
                      className="font-mono mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
                      maxLength={20}
                      pattern="[A-Z]{4}\d{8}[A-Z]\d{7}"
                      title="Le format doit être: 4 lettres, 8 chiffres, 1 lettre, 7 chiffres (20 caractères au total)."
                  />
                  <p className="text-xs text-slate-500 mt-1">Format attendu: 4 lettres, 8 chiffres, 1 lettre, 7 chiffres (ex: ARMA19740412G0500065).</p>
              </div>
          )}
        </fieldset>
        
        {isEditing && formState.enrollmentId !== null && (
            <fieldset className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <legend className="text-base font-semibold text-slate-500 mb-2 -ml-1">Informations d'Inscription ({selectedYear?.name})</legend>
                <div>
                    <label className="block text-sm font-medium text-slate-700">MPPA de Base (Montant à Payer)</label>
                    <div className="mt-1 block w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md shadow-sm font-bold text-slate-700">
                        {formatCurrency(formState.enrollmentMppa)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Le MPPA de base est géré sur la page de la classe. Les ajustements (bourses, frais) se font aussi sur cette page.</p>
                </div>
            </fieldset>
        )}

        {!isEditing && (
            <fieldset className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <legend className="text-base font-semibold text-slate-500 mb-2 -ml-1">Inscription Immédiate</legend>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="enrollNow"
                        name="enrollNow"
                        checked={formState.enrollNow}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="enrollNow" className="ml-3 block text-sm font-medium text-slate-700">
                        Inscrire cet élève pour l'année en cours ({selectedYear?.name})
                    </label>
                </div>
                {formState.enrollNow && (
                    <div className="space-y-4 pt-4 border-t border-blue-200">
                        <div>
                            <label htmlFor="enrollmentClassName" className="block text-sm font-medium text-slate-700">Classe d'inscription</label>
                            <select
                                id="enrollmentClassName"
                                name="enrollmentClassName"
                                value={formState.enrollmentClassName}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
                            >
                                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">MPPA (Montant à Payer)</label>
                            <div className="mt-1 block w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md shadow-sm font-bold text-slate-700">
                                {formatCurrency(formState.enrollmentMppa)}
                            </div>
                             <p className="text-xs text-slate-500 mt-1">Montant par défaut pour la classe. Géré dans l'onglet "Frais Scolaire" de l'administration.</p>
                        </div>
                    </div>
                )}
            </fieldset>
        )}

        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-slate-500 mb-2 -ml-1">Photo d'identité</legend>
          {formState.photo_url && (
            <div className="flex justify-center">
              <img src={formState.photo_url} alt="Aperçu" className="h-24 w-24 rounded-full object-cover" />
            </div>
          )}
          <div>
            <label htmlFor="photo" className="block text-sm font-medium text-slate-700">Changer la photo</label>
            <input type="file" id="photo" name="photo" accept="image/*" onChange={handlePhotoChange}
              className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </fieldset>
        
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-slate-500 mb-2 -ml-1">Informations Tuteur</legend>
          <InputField label="Nom du Tuteur/Parent" name="tutor_name" value={formState.tutor_name} onChange={handleChange} placeholder="Nom complet" />
          <div>
            <label htmlFor="tutor_phone" className="block text-sm font-medium text-slate-700">Téléphone du Tuteur</label>
            <PhoneInput
                country={'ht'}
                value={formState.tutor_phone || ''}
                onChange={handlePhoneChange}
                containerClass="mt-1"
                inputProps={{
                    id: 'tutor_phone',
                    name: 'tutor_phone',
                }}
            />
          </div>
          <InputField label="Email du Tuteur" name="tutor_email" value={formState.tutor_email} onChange={handleChange} type="email" placeholder="email@example.com" />
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-slate-500 mb-2 -ml-1">Notes Médicales</legend>
           <div>
            <label htmlFor="blood_group" className="block text-sm font-medium text-slate-700">Groupe Sanguin</label>
            <select
              id="blood_group"
              name="blood_group"
              value={formState.blood_group || ''}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
            >
                <option value="">Non spécifié</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
            </select>
          </div>
          <div>
              <label htmlFor="allergies" className="block text-sm font-medium text-slate-700">Allergies</label>
              <input type="text" id="allergies" name="allergies" value={formState.allergies || ''} onChange={handleChange} placeholder="Ex: Pollen, arachides"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition" />
          </div>
          <div>
              <label htmlFor="illnesses" className="block text-sm font-medium text-slate-700">Maladies Connues</label>
              <input type="text" id="illnesses" name="illnesses" value={formState.illnesses || ''} onChange={handleChange} placeholder="Ex: Asthme"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition" />
          </div>
        </fieldset>
        
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
            Annuler
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
            {isEditing ? 'Mettre à jour' : 'Enregistrer le Profil'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentForm;
