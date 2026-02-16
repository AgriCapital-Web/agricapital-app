import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    setIsIOS(isIOSDevice);
    if (isInStandaloneMode) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem('pwa-install-dismissed-crm');
      if (!dismissed) setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (isIOSDevice && !isInStandaloneMode) {
      const dismissed = localStorage.getItem('pwa-install-dismissed-crm');
      if (!dismissed) setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed-crm', 'true');
  };

  if (!showPrompt) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="max-w-md mx-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <span>Installer CRM AgriCapital</span>
          </DialogTitle>
          <DialogDescription className="text-left">
            {isIOS ? (
              <div className="space-y-3 mt-4">
                <p className="text-foreground font-medium">Pour installer sur iOS :</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Appuyez sur <strong>Partager</strong> ⬆️</li>
                  <li>Sélectionnez <strong>"Sur l'écran d'accueil"</strong></li>
                  <li>Appuyez sur <strong>Ajouter</strong></li>
                </ol>
              </div>
            ) : (
              <p className="mt-4">Gérez votre plateforme AgriCapital directement depuis l'écran d'accueil</p>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-6">
          {!isIOS && deferredPrompt && (
            <Button onClick={handleInstall} size="lg" className="w-full gap-2">
              <Download className="h-5 w-5" />
              Installer l'application
            </Button>
          )}
          <Button variant="outline" onClick={handleDismiss} className="w-full">Plus tard</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstallPrompt;
