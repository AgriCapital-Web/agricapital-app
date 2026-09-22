import { useCallback, useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageUp, Loader2, RefreshCw, ScanLine } from "lucide-react";

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

type Detecteur = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };

/**
 * Lecteur de QR code par caméra. Le flux est ouvert manuellement via
 * getUserMedia (plus fiable en iframe et sur mobile) puis analysé image par
 * image avec BarcodeDetector si disponible, sinon avec qr-scanner.
 */
const ScanCarteDialog = ({ open, onOpenChange, onCode }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const boucleRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [essai, setEssai] = useState(0);

  const arreter = useCallback(() => {
    if (boucleRef.current !== null) {
      window.clearTimeout(boucleRef.current);
      boucleRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!open) {
      arreter();
      return;
    }
    let annule = false;
    setErreur(null);
    setStarting(true);

    const demarrer = async () => {
      const video = videoRef.current;
      if (!video) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        setErreur("Ce navigateur ne permet pas d'ouvrir la caméra. Utilisez « Photo du QR ».");
        setStarting(false);
        return;
      }
      if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
        setErreur("La caméra exige une connexion sécurisée (HTTPS). Utilisez « Photo du QR ».");
        setStarting(false);
        return;
      }
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (annule) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play().catch(() => undefined);
        if (annule) return;
        setStarting(false);

        const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detecteur }).BarcodeDetector;
        const detecteur = Detector ? new Detector({ formats: ["qr_code"] }) : null;
        const canvas = canvasRef.current ?? document.createElement("canvas");
        canvasRef.current = canvas;

        const analyser = async () => {
          if (annule || !videoRef.current) return;
          const v = videoRef.current;
          if (v.readyState >= 2 && v.videoWidth) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(v, 0, 0, canvas.width, canvas.height);
            try {
              let valeur: string | null = null;
              if (detecteur) {
                const codes = await detecteur.detect(canvas);
                valeur = codes[0]?.rawValue ?? null;
              } else {
                const res = await QrScanner.scanImage(canvas, { returnDetailedScanResult: true });
                valeur = res.data;
              }
              if (valeur) {
                onCode(extraireCode(valeur));
                onOpenChange(false);
                return;
              }
            } catch {
              /* aucun QR code dans cette image */
            }
          }
          boucleRef.current = window.setTimeout(() => void analyser(), 180);
        };
        void analyser();
      } catch (error) {
        if (annule) return;
        const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
        const absente = error instanceof DOMException && error.name === "NotFoundError";
        setErreur(
          denied
            ? "Accès caméra refusé. Autorisez la caméra pour ce site puis réessayez."
            : absente
              ? "Aucune caméra détectée sur cet appareil."
              : "Impossible d'ouvrir la caméra. Réessayez ou utilisez « Photo du QR ».",
        );
        setStarting(false);
      }
    };

    void demarrer();
    return () => {
      annule = true;
      arreter();
    };
  }, [open, essai, onCode, onOpenChange, arreter]);

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
          <DialogDescription>Présentez le QR code devant la caméra.</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          )}
          {!erreur && !starting && <div className="pointer-events-none absolute inset-[15%] rounded-md border-2 border-primary" />}
        </div>
        {erreur ? (
          <p className="text-sm text-destructive">{erreur}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Placez le QR code de la carte dans le cadre.</p>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={() => setEssai((n) => n + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />Réessayer
          </Button>
          <label className="inline-flex">
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => void scannerImage(event.target.files?.[0])} />
            <Button variant="secondary" className="w-full" asChild>
              <span><ImageUp className="mr-2 h-4 w-4" />Photo du QR</span>
            </Button>
          </label>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScanCarteDialog;
