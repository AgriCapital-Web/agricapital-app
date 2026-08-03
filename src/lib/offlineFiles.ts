/**
 * File d'attente des pièces jointes hors ligne (photos / documents).
 * Les blobs sont stockés dans IndexedDB puis uploadés vers Supabase Storage
 * automatiquement dès le retour du réseau.
 */
import { supabase } from '@/integrations/supabase/client';
import { STORES, putItem, getAllItems, deleteItem } from '@/lib/offlineDb';

export interface QueuedFile {
  id: string;
  bucket: string;
  path: string;
  blob: Blob;
  contentType: string;
  table?: string;
  record_id?: string;
  column?: string;
  status: 'pending' | 'error' | 'uploading';
  error?: string;
  createdAt: number;
}

function genId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? (crypto as any).randomUUID()
    : 'f-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

/** Upload immédiat si en ligne, sinon mise en file dans IndexedDB. */
export async function uploadOrQueueFile(opts: {
  bucket: string;
  path: string;
  file: File | Blob;
  table?: string;
  record_id?: string;
  column?: string;
}): Promise<{ path: string; queued: boolean; error: any | null }> {
  const contentType = (opts.file as File).type || 'application/octet-stream';

  if (navigator.onLine) {
    const { error } = await supabase.storage
      .from(opts.bucket)
      .upload(opts.path, opts.file, { upsert: true, contentType });
    if (!error) return { path: opts.path, queued: false, error: null };
    // Échec réseau → on met en file
  }

  const entry: QueuedFile = {
    id: genId(),
    bucket: opts.bucket,
    path: opts.path,
    blob: opts.file,
    contentType,
    table: opts.table,
    record_id: opts.record_id,
    column: opts.column,
    status: 'pending',
    createdAt: Date.now(),
  };
  await putItem(STORES.FILES, entry);
  return { path: opts.path, queued: true, error: null };
}

export async function getQueuedFiles(): Promise<QueuedFile[]> {
  const all = await getAllItems(STORES.FILES);
  return (all as QueuedFile[]).filter(f => f.status !== 'uploading');
}

export async function countQueuedFiles(): Promise<number> {
  return (await getQueuedFiles()).length;
}

/** Vide la file d'attente des fichiers. Retourne le nombre d'uploads réussis. */
export async function flushFileQueue(): Promise<number> {
  if (!navigator.onLine) return 0;
  const files = await getQueuedFiles();
  let ok = 0;

  for (const f of files) {
    try {
      const { error } = await supabase.storage
        .from(f.bucket)
        .upload(f.path, f.blob, { upsert: true, contentType: f.contentType });
      if (error) throw error;

      // Rattachement éventuel de l'URL à la ligne concernée
      if (f.table && f.record_id && f.column) {
        const { data: pub } = supabase.storage.from(f.bucket).getPublicUrl(f.path);
        await (supabase as any)
          .from(f.table)
          .update({ [f.column]: pub?.publicUrl || f.path })
          .eq('id', f.record_id);
      }

      await deleteItem(STORES.FILES, f.id);
      ok++;
    } catch (e: any) {
      await putItem(STORES.FILES, { ...f, status: 'error', error: e?.message || 'Upload échoué' });
    }
  }
  return ok;
}