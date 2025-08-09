/// <reference types="vite/client" />

import { addNotification } from '../contexts/NotificationContext';

// Logique d'URL d'API dynamique pour le cloud et le local
// En production (sur Render.com), VITE_API_URL sera défini (ex: 'https://votre-backend.onrender.com/api')
// En local, VITE_API_URL ne sera pas défini, et l'URL de l'API sera '/api', utilisant le proxy de Vite.
const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * A global wrapper for the Fetch API.
 * - Adds authentication headers automatically.
 * - Handles JSON parsing.
 * - Centralizes error handling for network and auth errors.
 * - Triggers a page redirect on session expiration.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  try {
    const token = localStorage.getItem('authToken');
    const headers = new Headers(options.headers);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // On utilise la nouvelle variable API_URL qui s'adapte à l'environnement
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    // Handle session expiry/auth failure globally, for both 401 and 403 statuses
    if ((response.status === 401 || response.status === 403) && window.location.hash !== '#/login') {
      // Don't show an error notification, just redirect to login.
      // The user will understand they need to log in again.
      localStorage.removeItem('authToken');
      window.dispatchEvent(new Event('auth-expired'));
      window.location.hash = '/login';
      
      // Stop execution and prevent errors from being thrown and caught by callers
      return new Promise(() => {});
    }
    
    const responseText = await response.text();
    // Handle empty responses from server (e.g., for DELETE or 204 No Content)
    const data = responseText ? JSON.parse(responseText) : {};

    if (!response.ok) {
      // Use the server's error message if available, otherwise a default one
      throw new Error(data.message || `Erreur serveur (${response.status})`);
    }

    return data;
  } catch (error) {
    // Catch fetch-specific network errors and provide a user-friendly message
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      const friendlyError = new Error("Impossible de communiquer avec le serveur. Vérifiez que le backend est en cours d'exécution.");
      // This is a special case where we might want to show a toast directly,
      // as the component's catch block might not be reached if the app crashes.
      // However, for consistency, we'll let the component's catch block handle it.
      throw friendlyError;
    }
    
    // Re-throw other errors (including the ones we created) to be handled by the calling function's catch block
    throw error;
  }
}