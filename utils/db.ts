// utils/db.ts
const DB_NAME = 'ScolaLinkDB';
const DB_VERSION = 2; // Version incrémentée pour la nouvelle structure

interface CachedData<T> {
  key: string;
  data: T;
  timestamp: number;
}

// Interface pour les requêtes à synchroniser
export interface SyncRequest {
    id?: number; // Clé auto-incrémentée
    url: string;
    options: RequestInit;
    timestamp: number;
}


let db: IDBDatabase;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (event.oldVersion < 1 || !dbInstance.objectStoreNames.contains('keyValueStore')) {
        dbInstance.createObjectStore('keyValueStore', { keyPath: 'key' });
      }
      if (event.oldVersion < 2) {
        if (!dbInstance.objectStoreNames.contains('sync-queue')) {
            dbInstance.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
        }
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      reject('Error opening IndexedDB.');
    };
  });
};

export const saveData = async <T>(key: string, data: T): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction('keyValueStore', 'readwrite');
  const store = transaction.objectStore('keyValueStore');
  
  const cacheEntry: CachedData<T> = {
    key,
    data,
    timestamp: new Date().getTime(),
  };

  store.put(cacheEntry);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getData = async <T>(key: string): Promise<CachedData<T> | null> => {
  const db = await openDB();
  const transaction = db.transaction('keyValueStore', 'readonly');
  const store = transaction.objectStore('keyValueStore');
  const request = store.get(key);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

// Nouvelle fonction pour ajouter une requête à la file d'attente de synchronisation
export const addToSyncQueue = async (request: Omit<SyncRequest, 'id'>): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction('sync-queue', 'readwrite');
    const store = transaction.objectStore('sync-queue');
    store.add(request);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
