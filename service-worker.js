const CACHE_NAME = 'scolalink-cache-v2';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/scolalink_logo.png',
  '/scolalink_logo.jpg',
  '/login_image.jpg',
  'https://esm.sh/react@^19.1.0',
  'https://esm.sh/react-dom@^19.1.0/client',
  'https://esm.sh/react-router-dom@^7.6.3',
  'https://esm.sh/react-phone-input-2@2.15.1',
  'https://esm.sh/uuid@^9.0.1',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://unpkg.com/react-phone-input-2/lib/style.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(APP_SHELL_URLS).catch(error => {
            console.error('[Service Worker] Failed to cache some app shell resources:', error);
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    // Ne pas mettre en cache les requêtes API par défaut ici, géré par apiFetch
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Mettre en cache les nouvelles ressources statiques accédées
        if (networkResponse.ok && event.request.method === 'GET') {
            cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(error => {
          console.warn('[Service Worker] Fetch failed, relying on cache for:', event.request.url);
          // Si le fetch échoue, et qu'il y a une réponse en cache, on la retourne.
          if (cachedResponse) {
              return cachedResponse;
          }
      });

      // Stratégie "Stale-While-Revalidate": retourne le cache immédiatement, puis met à jour en arrière-plan.
      return cachedResponse || fetchPromise;
    })
  );
});


// --- BACKGROUND SYNC LOGIC ---

const DB_NAME = 'ScolaLinkDB';
const DB_VERSION = 2;
const SYNC_STORE_NAME = 'sync-queue';
const CACHE_STORE_NAME = 'keyValueStore';


function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function processSyncQueue() {
    const db = await openDB();
    const transaction = db.transaction(SYNC_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SYNC_STORE_NAME);
    const requests = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    if (!requests || requests.length === 0) {
        console.log('[Service Worker] Sync: No requests in queue.');
        return;
    }

    console.log('[Service Worker] Sync: Processing', requests.length, 'requests.');
    let successfulSyncs = 0;

    for (const request of requests) {
        try {
            // Recréer les Headers à partir de l'objet stocké
            const headers = new Headers(request.options.headers);
            const response = await fetch(request.url, { ...request.options, headers });
            
            if (response.ok) {
                console.log('[Service Worker] Sync: Successfully sent request for', request.url);
                store.delete(request.id);
                successfulSyncs++;
            } else {
                console.error('[Service Worker] Sync: Server error for request', request.url, response.status, response.statusText);
                // Si l'erreur est 4xx (erreur client), on pourrait envisager de ne pas réessayer. Pour l'instant on laisse pour retenter.
            }
        } catch (error) {
            console.error('[Service Worker] Sync: Network error for request', request.url, error);
            // Si une requête échoue, on arrête pour ne pas perdre de données et on réessaiera plus tard.
            break; 
        }
    }
    
    if (successfulSyncs > 0) {
        // Invalider le cache de données après une synchronisation réussie
        const cacheTransaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
        await cacheTransaction.objectStore(CACHE_STORE_NAME).clear();

        // Notifier les clients (onglets ouverts) que la synchronisation est terminée
        self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETE' }));
        });

        self.registration.showNotification('ScolaLink', {
            body: `Synchronisation terminée. ${successfulSyncs} modification(s) envoyée(s) au serveur. L'application va se recharger.`,
            icon: '/scolalink_logo.png'
        });
    }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[Service Worker] Sync event received for "sync-data"');
    event.waitUntil(processSyncQueue());
  }
});
