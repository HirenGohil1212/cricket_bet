
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

interface PwaInstallContextType {
  canInstall: boolean;
  promptInstall: () => void;
  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
  isIos: boolean;
}

const PwaInstallContext = createContext<PwaInstallContextType>({
  canInstall: false,
  promptInstall: () => {},
  isDialogOpen: false,
  setIsDialogOpen: () => {},
  isIos: false,
});

export const PwaInstallProvider = ({ children }: { children: ReactNode }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkIsIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const checkIsInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

    setIsIos(checkIsIos);

    if (checkIsIos && !checkIsInStandaloneMode) {
      setCanInstall(true);
    } else {
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setCanInstall(true);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const promptInstall = useCallback(async () => {
    if (isIos) {
      setIsDialogOpen(true); // For iOS, we just show the instructions dialog
      return;
    }
    
    if (!deferredPrompt) {
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt, isIos]);

  return (
    <PwaInstallContext.Provider value={{ canInstall, promptInstall, isDialogOpen, setIsDialogOpen, isIos }}>
      {children}
    </PwaInstallContext.Provider>
  );
};

export const usePwaInstall = () => {
  const context = useContext(PwaInstallContext);
  if (context === undefined) {
    throw new Error('usePwaInstall must be used within a PwaInstallProvider');
  }
  return context;
};
