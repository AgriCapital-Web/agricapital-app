/**
 * IndexedDB-based offline storage for AgriCapital CRM
 * Full offline support: auth, data caching, sync queue, conflict resolution
 */

const DB_NAME = 'agricapital_offline';
const DB_VERSION = 2;

export const STORES = {
  SOUSCRIPTEURS: 'souscripteurs',
  PLANTATIONS: 'plantations',
  PAIEMENTS: 'paiements',
  OFFRES: 'offres',
  REGIONS: 'regions',
  DEPARTEMENTS: 'departements',
  SOUS_PREFECTURES: 'sous_prefectures',
  VILLAGES: 'villages',
  SYNC_QUEUE: 'sync_queue',
  AUTH_CACHE: 'auth_cache',
  META: 'meta',
} as const;

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const storeNames = Object.values(STORES);
      for (const name of storeNames) {
        if (!db.objectStoreNames.contains(name)) {
          if (name === STORES.SYNC_QUEUE) {
            const store = db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
            store.createIndex('timestamp', 'timestamp');
            store.createIndex('status', 'status');
          } else if (name === STORES.AUTH_CACHE || name === STORES.META) {
            db.createObjectStore(name, { keyPath: 'key' });
          } else {
            const store = db.createObjectStore(name, { keyPath: 'id' });
            store.createIndex('updated_at', 'updated_at');
          }
        }
      }
    };
    request.onsuccess = () => { dbInstance = request.result; resolve(dbInstance); };
    request.onerror = () => reject(request.error);
  });
}

async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly') {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

// Generic CRUD
export async function putItem(storeName: string, item: any): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function putItems(storeName: string, items: any[]): Promise<void> {
  if (!items.length) return;
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  items.forEach(item => store.put(item));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getItem(storeName: string, key: string): Promise<any> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllItems(storeName: string): Promise<any[]> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteItem(storeName: string, key: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function countItems(storeName: string): Promise<number> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Sync queue operations
export interface SyncOperation {
  id?: number;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  record_id: string;
  data: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  retries: number;
  error_message?: string;
}

export async function addToSyncQueue(op: Omit<SyncOperation, 'id' | 'status' | 'retries'>): Promise<void> {
  await putItem(STORES.SYNC_QUEUE, { ...op, status: 'pending', retries: 0 });
}

export async function getPendingSyncOps(): Promise<SyncOperation[]> {
  const all = await getAllItems(STORES.SYNC_QUEUE);
  return all
    .filter(op => op.status === 'pending' || op.status === 'error')
    .filter(op => (op.retries || 0) < 5)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function markOpStatus(id: number, status: SyncOperation['status'], errorMsg?: string): Promise<void> {
  const item = await getItem(STORES.SYNC_QUEUE, String(id));
  if (item) {
    item.status = status;
    if (errorMsg) item.error_message = errorMsg;
    if (status === 'error') item.retries = (item.retries || 0) + 1;
    await putItem(STORES.SYNC_QUEUE, item);
  }
}

export async function clearSyncedOps(): Promise<void> {
  const all = await getAllItems(STORES.SYNC_QUEUE);
  const db = await openDB();
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
  const store = tx.objectStore(STORES.SYNC_QUEUE);
  all.filter(op => op.status === 'synced').forEach(op => store.delete(op.id));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSyncQueueStats(): Promise<{ pending: number; error: number; total: number }> {
  const all = await getAllItems(STORES.SYNC_QUEUE);
  return {
    pending: all.filter(o => o.status === 'pending').length,
    error: all.filter(o => o.status === 'error').length,
    total: all.length,
  };
}

// Auth cache for offline login
export async function cacheAuthCredentials(email: string, passwordHash: string, profile: any, roles: string[]): Promise<void> {
  await putItem(STORES.AUTH_CACHE, {
    key: 'last_auth',
    email,
    passwordHash,
    profile,
    roles,
    cachedAt: Date.now(),
  });
}

export async function getCachedAuth(): Promise<{ email: string; passwordHash: string; profile: any; roles: string[]; cachedAt: number } | null> {
  return getItem(STORES.AUTH_CACHE, 'last_auth');
}

// Meta: last sync timestamps
export async function setLastSyncTime(table: string): Promise<void> {
  await putItem(STORES.META, { key: `last_sync_${table}`, timestamp: new Date().toISOString() });
}

export async function getLastSyncTime(table: string): Promise<string | null> {
  const meta = await getItem(STORES.META, `last_sync_${table}`);
  return meta?.timestamp || null;
}

// Cache helpers
export async function cacheSouscripteurs(items: any[]): Promise<void> {
  await putItems(STORES.SOUSCRIPTEURS, items);
  await setLastSyncTime(STORES.SOUSCRIPTEURS);
}

export const getCachedSouscripteurs = () => getAllItems(STORES.SOUSCRIPTEURS);

export async function cachePlantations(items: any[]): Promise<void> {
  await putItems(STORES.PLANTATIONS, items);
  await setLastSyncTime(STORES.PLANTATIONS);
}

export const getCachedPlantations = () => getAllItems(STORES.PLANTATIONS);

export async function cacheReferenceData(storeName: string, items: any[]): Promise<void> {
  await putItems(storeName, items);
  await setLastSyncTime(storeName);
}

export const getCachedItems = (storeName: string) => getAllItems(storeName);

// Simple hash for offline auth
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'agricapital_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get offline data stats
export async function getOfflineStats(): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  for (const [key, store] of Object.entries(STORES)) {
    if (store !== STORES.AUTH_CACHE && store !== STORES.META && store !== STORES.SYNC_QUEUE) {
      try {
        stats[key] = await countItems(store);
      } catch { stats[key] = 0; }
    }
  }
  const queueStats = await getSyncQueueStats();
  stats['PENDING_SYNC'] = queueStats.pending;
  stats['ERROR_SYNC'] = queueStats.error;
  return stats;
}
