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
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://unpkg.com/react-phone-input-2/lib/style.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        const cachePromises = APP_SHELL_URLS.map(url => {
            return cache.add(url).catch(err => {
                console.warn(`[Service Worker] Failed to cache ${url}:`, err);
            });
        });
        return Promise.all(cachePromises);
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
  const { request } = event;
  const url = new URL(request.url);

  // --- STRONGER GUARD CLAUSES ---
  // 1. Explicitly ignore non-http/https requests (like chrome-extension://)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }
  // 2. Ignore all API calls from this caching strategy
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  // 3. Ignore all non-GET requests from this caching strategy
  if (request.method !== 'GET') {
      return;
  }
  // --- END OF GUARD CLAUSES ---

  // Strategy: Cache then network for app shell resources and GET requests
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);
      
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          // Clone and cache the valid network response
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(err => {
          // Network failed, we might already have a cached response
          console.warn(`[Service Worker] Network request for ${request.url} failed.`, err);
          // If we don't have a cached response either, this will propagate the error.
          if (cachedResponse) return cachedResponse;
          throw err;
      });

      // Return the cached response if available, otherwise wait for the network.
      return cachedResponse || fetchPromise;
    })
  );
});


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
    let db;
    try {
        db = await openDB();
    } catch (e) {
        console.error("Failed to open DB for sync", e);
        return;
    }
    
    let requests;
    try {
        const tx = db.transaction(SYNC_STORE_NAME, 'readonly');
        const store = tx.objectStore(SYNC_STORE_NAME);
        requests = await new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error("Failed to read sync queue", e);
        return;
    }
    
    if (!requests || requests.length === 0) {
        console.log('[Service Worker] Sync: No requests in queue.');
        return;
    }

    console.log('[Service Worker] Sync: Processing', requests.length, 'requests.');
    const idsToDelete = [];
    let successfulRequestCount = 0;
    
    for (const request of requests) {
        try {
            const response = await fetch(request.url, request.options);
            
            if (response.ok) {
                console.log('[Service Worker] Sync: Successfully sent request for', request.url);
                idsToDelete.push(request.id);
                successfulRequestCount++;
            } else {
                console.error('[Service Worker] Sync: Server error for request', request.url, response.status, response.statusText);
                // If it's a client error (e.g., 401 Unauthorized, 409 Conflict),
                // it's not a temporary network issue. The request will never succeed,
                // so we should delete it to avoid blocking the queue.
                if (response.status >= 400 && response.status < 500) {
                    console.warn(`[Service Worker] Sync: Deleting request due to client error ${response.status}. It will not be retried.`);
                    idsToDelete.push(request.id);
                } else {
                    // For 5xx server errors or other issues, we stop and retry the whole queue later.
                    break; 
                }
            }
        } catch (error) {
            console.error('[Service Worker] Sync: Network error for request', request.url, error);
            // On network error, we stop and retry the whole queue later.
            break; 
        }
    }
    
    if (idsToDelete.length > 0) {
        try {
            const deleteTx = db.transaction(SYNC_STORE_NAME, 'readwrite');
            const deleteStore = deleteTx.objectStore(SYNC_STORE_NAME);
            for (const id of idsToDelete) {
                deleteStore.delete(id);
            }
            await new Promise((resolve, reject) => {
                deleteTx.oncomplete = resolve;
                deleteTx.onerror = reject;
            });
        } catch (e) {
            console.error("Failed to delete processed requests from queue", e);
            return;
        }

        // Only notify and clear cache if there were SUCCESSFUL requests.
        // Don't refresh the page just because we cleaned up bad requests.
        if (successfulRequestCount > 0) {
            console.log(`[Service Worker] Sync: ${successfulRequestCount} successful syncs. Notifying clients.`);
            
            try {
                const cacheTx = db.transaction(CACHE_STORE_NAME, 'readwrite');
                await new Promise((resolve, reject) => {
                    const clearRequest = cacheTx.objectStore(CACHE_STORE_NAME).clear();
                    clearRequest.onerror = reject;
                    cacheTx.oncomplete = resolve;
                });
                 console.log('[Service Worker] Sync: Cleared API cache.');
            } catch(e) {
                console.error('Failed to clear API cache after sync', e);
            }

            self.clients.matchAll().then(clients => {
                clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETE' }));
            });

            self.registration.showNotification('ScolaLink', {
                body: `Synchronisation terminée. ${successfulRequestCount} modification(s) envoyée(s) au serveur.`,
                icon: '/scolalink_logo.png'
            });
        }
    }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[Service Worker] Sync event received for "sync-data"');
    event.waitUntil(processSyncQueue());
  }
});