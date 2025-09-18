// This interface declaration fixes TypeScript errors for `import.meta.env`.
// It replaces the `/// <reference types="vite/client" />` which was causing an error.

// FIX: Add SyncManager and extend ServiceWorkerRegistration to include 'sync' property for Background Sync API.
interface SyncManager {
  register(tag: string): Promise<void>;
}

declare global {
  interface ServiceWorkerRegistration {
    readonly sync: SyncManager;
  }
  interface ImportMeta {
    readonly env: {
      readonly VITE_API_URL?: string;
    };
  }
}

import { addNotification } from '../contexts/NotificationContext';
import * as db from './db'; // Import IndexedDB utilities

const API_URL = import.meta.env.VITE_API_URL || '/api';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('authToken');
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const isOnline = navigator.onLine;
  const modificationMethods = ['POST', 'PUT', 'DELETE'];
  const isModification = options.method && modificationMethods.includes(options.method.toUpperCase());

  const queueRequestForSync = async () => {
    // We need to convert Headers to a plain object for IndexedDB storage.
    const headersObject: Record<string, string> = {};
    headers.forEach((value, key) => {
        headersObject[key] = value;
    });

    const requestToSync: Omit<db.SyncRequest, 'id'> = {
        url: `${API_URL}${endpoint}`,
        options: { ...options, headers: headersObject },
        timestamp: new Date().getTime(),
    };
    
    await db.addToSyncQueue(requestToSync);

    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-data');
        } catch (err) {
            console.error('Background Sync registration failed:', err);
        }
    }
    
    addNotification({ type: 'info', message: "Vous êtes hors ligne. Votre modification est sauvegardée et sera synchronisée plus tard." });
    return { queued: true };
  };

  if (isOnline) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

      if ((response.status === 401 || response.status === 403) && window.location.hash !== '#/login') {
        localStorage.removeItem('authToken');
        window.dispatchEvent(new Event('auth-expired'));
        window.location.hash = '/login';
        return new Promise(() => {});
      }
      
      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : {};

      if (!response.ok) {
        throw new Error(data.message || `Erreur serveur (${response.status})`);
      }
      
      if (options.method === 'GET' || !options.method) {
          await db.saveData(endpoint, data);
      }

      return data;
    } catch (error) {
      console.warn(`Online request for ${endpoint} failed.`, error);

      if (isModification) {
        return await queueRequestForSync();
      }

      if (options.method === 'GET' || !options.method) {
        const cachedData = await db.getData(endpoint);
        if (cachedData) {
          addNotification({ type: 'warning', message: 'Erreur réseau. Affichage des dernières données disponibles.' });
          return cachedData.data;
        }
      }
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
         throw new Error("Impossible de communiquer avec le serveur. Vérifiez votre connexion.");
      }
      throw error;
    }
  } else { // Offline logic
    if (isModification) {
      return await queueRequestForSync();
    }
    
    // GET requests when offline
    const cachedData = await db.getData(endpoint);
    if (cachedData) {
      addNotification({ type: 'info', message: 'Vous êtes hors ligne. Affichage des données sauvegardées.' });
      return cachedData.data;
    } else {
      throw new Error("Cette page n'a pas été consultée auparavant et n'est pas disponible hors ligne.");
    }
  }
}
