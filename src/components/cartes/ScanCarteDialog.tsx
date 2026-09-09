import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Reçoit le code de vérification extrait du QR code. */
  onCode: (code: string) => void;
}

/** Extrait le code de vérification d'une URL /verifier-carte/<code> ou d'un code brut. */
export const extraireCode = (valeur: string) => {
  const v = valeur.trim();
  const m = v.match(/verifier-carte\/([A-Za-z0-9-]{6,64})/);
  return m ? m[1] : v;
};

/** Lecteur de QR code par caméra pour vérifier l'authenticité d'une carte. */
const ScanCarteDialog = ({ open, onOpenChange, onCode }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !videoRef.current) return;
    setErreur(null);
    const scanner = new QrScanner(
      videoRef.current,
      (res) => {
        onCode(extraireCode(res.data));
        onOpenChange(false);
      },
      { highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true },
    );
    scannerRef.current = scanner;
    scanner.start().catch(() => setErreur("Caméra indisponible. Autorisez l'accès ou saisissez le code manuellement."));
    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [open, onCode, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scanner une carte</DialogTitle>
        </DialogHeader>
        <div className="overflow-hidden rounded-md bg-muted">
          <video ref={videoRef} className="h-64 w-full object-cover" muted playsInline />
        </div>
        {erreur ? (
          <p className="text-sm text-destructive">{erreur}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Placez le QR code de la carte dans le cadre.</p>
        )}
        <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
      </DialogContent>
    </Dialog>
  );
};

export default ScanCarteDialog;
