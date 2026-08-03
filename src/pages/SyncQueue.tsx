import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SyncStatusBadge, OnlineBadge, type SyncState } from "@/components/offline/SyncStatusBadge";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { getAllItems, STORES } from "@/lib/offlineDb";
import { getQueuedFiles } from "@/lib/offlineFiles";
import { RefreshCw } from "lucide-react";

/** Écran de suivi des opérations hors ligne en attente (données + pièces jointes). */
export default function SyncQueue() {
  const { isOnline, isSyncing, syncNow, pendingCount, pendingFiles, lastSync } = useOfflineSync();
  const [ops, setOps] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);

  const load = useCallback(async () => {
    const queue = await getAllItems(STORES.SYNC_QUEUE);
    setOps((queue as any[]).filter((o) => o.status !== "synced"));
    setFiles(await getQueuedFiles());
  }, []);

  useEffect(() => {
    load();
    const onDone = () => load();
    window.addEventListener("offline-sync-complete", onDone);
    const t = setInterval(load, 10000);
    return () => {
      window.removeEventListener("offline-sync-complete", onDone);
      clearInterval(t);
    };
  }, [load]);

  const stateOf = (status: string): SyncState =>
    status === "error" ? "error" : status === "syncing" ? "syncing" : "queued";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Synchronisation</h1>
          <p className="text-sm text-muted-foreground">
            {pendingCount} opération(s) et {pendingFiles} fichier(s) en attente
            {lastSync ? ` • dernière synchro : ${new Date(lastSync).toLocaleString("fr-FR")}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OnlineBadge isOnline={isOnline} />
          <Button onClick={syncNow} disabled={!isOnline || isSyncing} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            Synchroniser
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Opérations de données</CardTitle></CardHeader>
        <CardContent>
          {ops.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune opération en attente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Enregistrement</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>État</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ops.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell>{op.table}</TableCell>
                    <TableCell>{op.operation}</TableCell>
                    <TableCell className="font-mono text-xs">{String(op.record_id).slice(0, 12)}…</TableCell>
                    <TableCell className="text-xs">{new Date(op.timestamp).toLocaleString("fr-FR")}</TableCell>
                    <TableCell>
                      <SyncStatusBadge state={stateOf(op.status)} />
                      {op.error && <p className="text-xs text-destructive mt-1">{op.error}</p>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pièces jointes en attente</CardTitle></CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun fichier en attente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Chemin</TableHead>
                  <TableHead>État</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.bucket}</TableCell>
                    <TableCell className="text-xs break-all">{f.path}</TableCell>
                    <TableCell>
                      <SyncStatusBadge state={f.status === "error" ? "error" : "queued"} />
                      {f.error && <p className="text-xs text-destructive mt-1">{f.error}</p>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}