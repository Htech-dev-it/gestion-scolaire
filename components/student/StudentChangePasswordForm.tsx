import React, { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { apiFetch } from '../../utils/api';

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const StudentChangePasswordForm: React.FC = () => {
  const { addNotification } = useNotification();
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addNotification({ type: 'error', message: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }
     if (passwordData.newPassword.length < 6) {
      addNotification({ type: 'error', message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiFetch('/student/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      
      addNotification({ type: 'success', message: data.message });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

    } catch (error) {
      if (error instanceof Error) {
        addNotification({ type: 'error', message: error.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700">
          Mot de passe actuel
        </label>
        <input
          type="password"
          name="currentPassword"
          id="currentPassword"
          value={passwordData.currentPassword}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">
          Nouveau mot de passe
        </label>
        <input
          type="password"
          name="newPassword"
          id="newPassword"
          value={passwordData.newPassword}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
          Confirmer le nouveau mot de passe
        </label>
        <input
          type="password"
          name="confirmPassword"
          id="confirmPassword"
          value={passwordData.confirmPassword}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
          required
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 disabled:bg-slate-400"
        >
          {isLoading ? 'Changement...' : 'Changer le mot de passe'}
        </button>
      </div>
    </form>
  );
};

export default StudentChangePasswordForm;