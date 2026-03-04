/**
 * IndexedDB-based offline storage for AgriCapital CRM
 * Handles caching of souscripteurs, plantations, and auth credentials
 * with bidirectional sync when network is available.
 */

const DB_NAME = 'agricapital_offline';
const DB_VERSION = 1;

const STORES = {
  SOUSCRIPTEURS: 'souscripteurs',
  PLANTATIONS: 'plantations',
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
      if (!db.objectStoreNames.contains(STORES.SOUSCRIPTEURS)) {
        db.createObjectStore(STORES.SOUSCRIPTEURS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.PLANTATIONS)) {
        db.createObjectStore(STORES.PLANTATIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains(STORES.AUTH_CACHE)) {
        db.createObjectStore(STORES.AUTH_CACHE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' });
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

// Sync queue operations
export interface SyncOperation {
  id?: number;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  record_id: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

export async function addToSyncQueue(op: Omit<SyncOperation, 'id' | 'synced'>): Promise<void> {
  await putItem(STORES.SYNC_QUEUE, { ...op, synced: false });
}

export async function getPendingSyncOps(): Promise<SyncOperation[]> {
  const all = await getAllItems(STORES.SYNC_QUEUE);
  return all.filter(op => !op.synced).sort((a, b) => a.timestamp - b.timestamp);
}

export async function markSynced(id: number): Promise<void> {
  const item = await getItem(STORES.SYNC_QUEUE, String(id));
  if (item) {
    item.synced = true;
    await putItem(STORES.SYNC_QUEUE, item);
  }
}

export async function clearSyncedOps(): Promise<void> {
  const all = await getAllItems(STORES.SYNC_QUEUE);
  const db = await openDB();
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
  const store = tx.objectStore(STORES.SYNC_QUEUE);
  all.filter(op => op.synced).forEach(op => store.delete(op.id));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
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

export async function getCachedAuth(): Promise<{email: string; passwordHash: string; profile: any; roles: string[]; cachedAt: number} | null> {
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

// Cache souscripteurs & plantations
export async function cacheSouscripteurs(items: any[]): Promise<void> {
  await putItems(STORES.SOUSCRIPTEURS, items);
  await setLastSyncTime(STORES.SOUSCRIPTEURS);
}

export async function getCachedSouscripteurs(): Promise<any[]> {
  return getAllItems(STORES.SOUSCRIPTEURS);
}

export async function cachePlantations(items: any[]): Promise<void> {
  await putItems(STORES.PLANTATIONS, items);
  await setLastSyncTime(STORES.PLANTATIONS);
}

export async function getCachedPlantations(): Promise<any[]> {
  return getAllItems(STORES.PLANTATIONS);
}

// Simple hash for offline auth (not cryptographically secure, just for offline verification)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'agricapital_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export { STORES };
