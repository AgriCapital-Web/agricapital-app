import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  cacheSouscripteurs, cachePlantations, cacheReferenceData,
  getCachedSouscripteurs, getCachedPlantations, getCachedItems,
  getPendingSyncOps, clearSyncedOps, addToSyncQueue, markOpStatus,
  getLastSyncTime, getOfflineStats, getSyncQueueStats,
  STORES, type SyncOperation,
} from '@/lib/offlineDb';
import { useToast } from '@/hooks/use-toast';

const SYNC_INTERVAL = 3 * 60 * 1000; // 3 minutes
const SLOW_NET_THRESHOLD = 1500; // ms

// Reference tables to cache for full offline use
const REF_TABLES = [
  { store: STORES.OFFRES, table: 'offres' },
  { store: STORES.REGIONS, table: 'regions' },
  { store: STORES.DEPARTEMENTS, table: 'departements' },
  { store: STORES.SOUS_PREFECTURES, table: 'sous_prefectures' },
  { store: STORES.VILLAGES, table: 'villages' },
] as const;

export function useOfflineSync() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [networkQuality, setNetworkQuality] = useState<'good' | 'slow' | 'offline'>('good');
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncLockRef = useRef(false);

  // Measure network latency
  const checkNetworkQuality = useCallback(async () => {
    if (!navigator.onLine) { setNetworkQuality('offline'); return 'offline' as const; }
    try {
      const start = performance.now();
      await fetch(`https://rfzfsmpsuempafhkqhra.supabase.co/rest/v1/`, {
        method: 'HEAD',
        headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmemZzbXBzdWVtcGFmaGtxaHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDE5NjcsImV4cCI6MjA4NjcxNzk2N30.v3sQGr7QHdDqkg4EVHf8l702KKbcOZ8XiP9ALisJFl4' },
        signal: AbortSignal.timeout(5000),
      });
      const latency = performance.now() - start;
      const quality = latency > SLOW_NET_THRESHOLD ? 'slow' : 'good';
      setNetworkQuality(quality);
      return quality;
    } catch {
      setNetworkQuality('slow');
      return 'slow' as const;
    }
  }, []);

  // Pull reference data (small tables cached entirely)
  const pullReferenceData = useCallback(async () => {
    for (const { store, table } of REF_TABLES) {
      try {
        const { data } = await (supabase as any).from(table).select('*');
        if (data?.length) await cacheReferenceData(store, data);
      } catch (err) {
        console.warn(`[OfflineSync] Failed to cache ${table}:`, err);
      }
    }
  }, []);

  // Pull main data from Supabase → IndexedDB (incremental)
  const pullData = useCallback(async () => {
    if (!navigator.onLine || !user) return;
    try {
      // Souscripteurs
      const lastSyncSous = await getLastSyncTime(STORES.SOUSCRIPTEURS);
      let sousQuery = (supabase as any).from('souscripteurs').select('*');
      if (lastSyncSous) sousQuery = sousQuery.gte('updated_at', lastSyncSous);
      const { data: souscripteurs } = await sousQuery.order('updated_at', { ascending: false }).limit(1000);
      if (souscripteurs?.length) await cacheSouscripteurs(souscripteurs);

      // Plantations
      const lastSyncPlant = await getLastSyncTime(STORES.PLANTATIONS);
      let plantQuery = (supabase as any).from('plantations').select('*');
      if (lastSyncPlant) plantQuery = plantQuery.gte('updated_at', lastSyncPlant);
      const { data: plantations } = await plantQuery.order('updated_at', { ascending: false }).limit(1000);
      if (plantations?.length) await cachePlantations(plantations);

      // Paiements
      const lastSyncPaie = await getLastSyncTime(STORES.PAIEMENTS);
      let paieQuery = (supabase as any).from('paiements').select('*');
      if (lastSyncPaie) paieQuery = paieQuery.gte('updated_at', lastSyncPaie);
      const { data: paiements } = await paieQuery.order('updated_at', { ascending: false }).limit(1000);
      if (paiements?.length) await cacheReferenceData(STORES.PAIEMENTS, paiements);

      // Reference tables (full cache)
      await pullReferenceData();

      setLastSync(new Date().toISOString());
    } catch (error) {
      console.error('[OfflineSync] Pull error:', error);
    }
  }, [user, pullReferenceData]);

  // Push pending local changes → Supabase with per-op error handling
  const pushData = useCallback(async () => {
    if (!navigator.onLine) return;
    const pendingOps = await getPendingSyncOps();
    if (!pendingOps.length) return;

    setIsSyncing(true);
    let syncedCount = 0;

    for (const op of pendingOps) {
      try {
        await markOpStatus(op.id!, 'syncing');
        let result: any;

        if (op.operation === 'insert') {
          result = await (supabase as any).from(op.table).insert(op.data);
        } else if (op.operation === 'update') {
          result = await (supabase as any).from(op.table).update(op.data).eq('id', op.record_id);
        } else if (op.operation === 'delete') {
          result = await (supabase as any).from(op.table).delete().eq('id', op.record_id);
        }

        if (result?.error) {
          throw new Error(result.error.message);
        }

        await markOpStatus(op.id!, 'synced');
        syncedCount++;
      } catch (error: any) {
        console.error('[OfflineSync] Push error for op:', op.id, error);
        await markOpStatus(op.id!, 'error', error?.message || 'Unknown error');
      }
    }

    await clearSyncedOps();
    const stats = await getSyncQueueStats();
    setPendingCount(stats.pending + stats.error);
    setIsSyncing(false);

    if (syncedCount > 0) {
      toast({
        title: 'Synchronisation terminée',
        description: `${syncedCount} modification(s) synchronisée(s)${stats.error > 0 ? `, ${stats.error} erreur(s)` : ''}`,
      });
    }
  }, [toast]);

  // Full sync: push then pull
  const syncNow = useCallback(async () => {
    if (syncLockRef.current) return;
    if (!navigator.onLine) {
      toast({ variant: 'destructive', title: 'Hors ligne', description: 'Synchronisation impossible sans connexion.' });
      return;
    }
    syncLockRef.current = true;
    setIsSyncing(true);
    try {
      await pushData();
      await pullData();
      toast({ title: 'Synchronisation complète', description: 'Toutes les données sont à jour.' });
    } finally {
      setIsSyncing(false);
      syncLockRef.current = false;
    }
  }, [pushData, pullData, toast]);

  // Queue an offline mutation + update local cache immediately
  const queueMutation = useCallback(async (
    table: string,
    operation: 'insert' | 'update' | 'delete',
    recordId: string,
    data: any
  ) => {
    await addToSyncQueue({ table, operation, record_id: recordId, data, timestamp: Date.now() });

    // Optimistic local update
    const storeMap: Record<string, string> = {
      souscripteurs: STORES.SOUSCRIPTEURS,
      plantations: STORES.PLANTATIONS,
      paiements: STORES.PAIEMENTS,
    };
    const store = storeMap[table];
    if (store && operation !== 'delete') {
      const { putItem } = await import('@/lib/offlineDb');
      await putItem(store, { id: recordId, ...data, _offline: true, updated_at: new Date().toISOString() });
    }

    const stats = await getSyncQueueStats();
    setPendingCount(stats.pending);

    // If online, sync immediately
    if (navigator.onLine) {
      setTimeout(() => pushData(), 300);
    }
  }, [pushData]);

  // Get cached data for offline use
  const getOfflineSouscripteurs = useCallback(() => getCachedSouscripteurs(), []);
  const getOfflinePlantations = useCallback(() => getCachedPlantations(), []);
  const getOfflineItems = useCallback((store: string) => getCachedItems(store), []);
  const getStats = useCallback(() => getOfflineStats(), []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const quality = await checkNetworkQuality();
      if (quality !== 'offline') {
        toast({ title: 'Connexion rétablie', description: 'Synchronisation automatique en cours...' });
        syncNow();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setNetworkQuality('offline');
      toast({ variant: 'destructive', title: 'Mode hors ligne', description: 'Vos modifications seront synchronisées automatiquement.' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow, toast, checkNetworkQuality]);

  // Initial sync + periodic sync + slow network detection
  useEffect(() => {
    if (user && navigator.onLine) {
      pullData();
      checkNetworkQuality();
    }

    // Load pending count
    getSyncQueueStats().then(s => setPendingCount(s.pending + s.error));

    syncIntervalRef.current = setInterval(async () => {
      if (navigator.onLine && user && !syncLockRef.current) {
        const quality = await checkNetworkQuality();
        // On slow network, trigger sync to push pending changes
        if (quality === 'slow') {
          console.log('[OfflineSync] Slow network detected, pushing pending...');
          pushData();
        } else {
          pullData();
        }
      }
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [user, pullData, pushData, checkNetworkQuality]);

  return {
    isOnline,
    isSyncing,
    lastSync,
    pendingCount,
    networkQuality,
    syncNow,
    queueMutation,
    getOfflineSouscripteurs,
    getOfflinePlantations,
    getOfflineItems,
    getStats,
  };
}
