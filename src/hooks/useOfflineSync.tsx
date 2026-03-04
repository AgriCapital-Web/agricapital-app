import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  cacheSouscripteurs,
  cachePlantations,
  getCachedSouscripteurs,
  getCachedPlantations,
  getPendingSyncOps,
  clearSyncedOps,
  addToSyncQueue,
  getLastSyncTime,
  STORES,
} from '@/lib/offlineDb';
import { useToast } from '@/hooks/use-toast';

export function useOfflineSync() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pull data from Supabase → IndexedDB
  const pullData = useCallback(async () => {
    if (!navigator.onLine || !user) return;
    try {
      const lastSyncSous = await getLastSyncTime(STORES.SOUSCRIPTEURS);
      const lastSyncPlant = await getLastSyncTime(STORES.PLANTATIONS);

      // Fetch souscripteurs (with incremental sync if possible)
      let sousQuery = (supabase as any).from('souscripteurs').select('*');
      if (lastSyncSous) {
        sousQuery = sousQuery.gte('updated_at', lastSyncSous);
      }
      const { data: souscripteurs } = await sousQuery.limit(1000);
      if (souscripteurs?.length) {
        await cacheSouscripteurs(souscripteurs);
      }

      // Fetch plantations
      let plantQuery = (supabase as any).from('plantations').select('*');
      if (lastSyncPlant) {
        plantQuery = plantQuery.gte('updated_at', lastSyncPlant);
      }
      const { data: plantations } = await plantQuery.limit(1000);
      if (plantations?.length) {
        await cachePlantations(plantations);
      }

      setLastSync(new Date().toISOString());
    } catch (error) {
      console.error('[OfflineSync] Pull error:', error);
    }
  }, [user]);

  // Push pending local changes → Supabase
  const pushData = useCallback(async () => {
    if (!navigator.onLine) return;
    const pendingOps = await getPendingSyncOps();
    if (!pendingOps.length) return;

    setIsSyncing(true);
    let syncedCount = 0;

    for (const op of pendingOps) {
      try {
        if (op.operation === 'insert') {
          await (supabase as any).from(op.table).insert(op.data);
        } else if (op.operation === 'update') {
          await (supabase as any).from(op.table).update(op.data).eq('id', op.record_id);
        } else if (op.operation === 'delete') {
          await (supabase as any).from(op.table).delete().eq('id', op.record_id);
        }
        syncedCount++;
      } catch (error) {
        console.error('[OfflineSync] Push error for op:', op, error);
      }
    }

    await clearSyncedOps();
    setIsSyncing(false);

    if (syncedCount > 0) {
      toast({
        title: 'Synchronisation terminée',
        description: `${syncedCount} modification(s) synchronisée(s)`,
      });
    }
  }, [toast]);

  // Full sync: push then pull
  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      toast({ variant: 'destructive', title: 'Hors ligne', description: 'Synchronisation impossible sans connexion.' });
      return;
    }
    setIsSyncing(true);
    await pushData();
    await pullData();
    setIsSyncing(false);
    toast({ title: 'Synchronisation complète', description: 'Données à jour.' });
  }, [pushData, pullData, toast]);

  // Queue an offline mutation
  const queueMutation = useCallback(async (
    table: string,
    operation: 'insert' | 'update' | 'delete',
    recordId: string,
    data: any
  ) => {
    await addToSyncQueue({ table, operation, record_id: recordId, data, timestamp: Date.now() });

    // If online, sync immediately
    if (navigator.onLine) {
      setTimeout(() => pushData(), 500);
    }
  }, [pushData]);

  // Get cached data (for offline use)
  const getOfflineSouscripteurs = useCallback(() => getCachedSouscripteurs(), []);
  const getOfflinePlantations = useCallback(() => getCachedPlantations(), []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: 'Connexion rétablie', description: 'Synchronisation en cours...' });
      syncNow();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast({ variant: 'destructive', title: 'Mode hors ligne', description: 'Les modifications seront synchronisées automatiquement.' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow, toast]);

  // Initial sync + periodic sync every 5 minutes
  useEffect(() => {
    if (user && navigator.onLine) {
      pullData();
    }

    syncIntervalRef.current = setInterval(() => {
      if (navigator.onLine && user) {
        pullData();
      }
    }, 5 * 60 * 1000);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [user, pullData]);

  return {
    isOnline,
    isSyncing,
    lastSync,
    syncNow,
    queueMutation,
    getOfflineSouscripteurs,
    getOfflinePlantations,
  };
}
