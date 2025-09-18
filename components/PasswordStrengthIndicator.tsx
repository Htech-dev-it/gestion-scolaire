import React from 'react';

interface PasswordStrengthIndicatorProps {
  password?: string;
}

const criteria = [
  { id: 'length', regex: /.{11,}/, text: 'Au moins 11 caractères' },
  { id: 'lowercase', regex: /[a-z]/, text: 'Une lettre minuscule' },
  { id: 'uppercase', regex: /[A-Z]/, text: 'Une lettre majuscule' },
  { id: 'number', regex: /[0-9]/, text: 'Un chiffre' },
  { id: 'special', regex: /[^A-Za-z0-9]/, text: 'Un caractère spécial (ex: !@#$%)' },
];

const CheckIcon: React.FC<{ isValid: boolean }> = ({ isValid }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={`h-5 w-5 transition-colors ${isValid ? 'text-green-500' : 'text-slate-300'}`} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path 
      fillRule="evenodd" 
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
      clipRule="evenodd" 
    />
  </svg>
);


const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password = '' }) => {
  return (
    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <p className="text-sm font-semibold text-slate-700 mb-2">Votre mot de passe doit contenir :</p>
      <ul className="space-y-1.5">
        {criteria.map(criterion => {
          const isValid = criterion.regex.test(password);
          return (
            <li key={criterion.id} className="flex items-center gap-2">
              <CheckIcon isValid={isValid} />
              <span className={`text-sm transition-colors ${isValid ? 'text-slate-600' : 'text-slate-400'}`}>
                {criterion.text}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordStrengthIndicator;
