import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageUp, Loader2, ScanLine } from "lucide-react";

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
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open || !videoRef.current) return;
    let cancelled = false;
    setErreur(null);
    setStarting(true);
    const scanner = new QrScanner(
      videoRef.current,
      (res) => {
        onCode(extraireCode(res.data));
        onOpenChange(false);
      },
      {
        preferredCamera: "environment",
        highlightScanRegion: true,
        highlightCodeOutline: true,
        returnDetailedScanResult: true,
        maxScansPerSecond: 12,
      },
    );
    scannerRef.current = scanner;
    const start = async () => {
      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        setErreur("La caméra exige une connexion sécurisée HTTPS. Vous pouvez choisir une photo du QR code.");
        setStarting(false);
        return;
      }
      try {
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) throw new Error("Aucune caméra détectée");
        await scanner.start();
        if (!cancelled) setStarting(false);
      } catch (error) {
        if (!cancelled) {
          const denied = error instanceof DOMException && error.name === "NotAllowedError";
          setErreur(denied
            ? "Accès caméra refusé. Autorisez la caméra dans les réglages du navigateur, puis réessayez."
            : "Caméra indisponible. Choisissez une photo du QR code pour le scanner.");
          setStarting(false);
        }
      }
    };
    window.requestAnimationFrame(() => void start());
    return () => {
      cancelled = true;
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [open, onCode, onOpenChange]);

  const scannerImage = async (file?: File) => {
    if (!file) return;
    setErreur(null);
    setStarting(true);
    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      onCode(extraireCode(result.data));
      onOpenChange(false);
    } catch {
      setErreur("Aucun QR code lisible n'a été trouvé dans cette image.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScanLine className="h-5 w-5" />Scanner une carte</DialogTitle>
          <DialogDescription>Présentez le QR code devant la caméra arrière.</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
          {starting && <div className="absolute inset-0 flex items-center justify-center bg-background/70"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>}
          {!erreur && <div className="pointer-events-none absolute inset-[15%] rounded-md border-2 border-primary" />}
        </div>
        {erreur ? (
          <p className="text-sm text-destructive">{erreur}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Placez le QR code de la carte dans le cadre.</p>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="inline-flex">
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => void scannerImage(event.target.files?.[0])} />
            <Button variant="secondary" className="w-full" asChild><span><ImageUp className="mr-2 h-4 w-4" />Photo du QR</span></Button>
          </label>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScanCarteDialog;
