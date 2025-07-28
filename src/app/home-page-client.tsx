
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { WhatsAppSupportButton } from "@/components/whatsapp-support-button";
import { useAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContentSettings } from "@/lib/types";
import { PromotionalVideoDialog } from "@/components/promotional-video-dialog";
import { BannerAd } from "@/components/banner-ad";
import { Loader2 } from "lucide-react";
import { InstallPwaDialog } from "@/components/install-pwa-dialog";

interface HomePageClientProps {
  children: React.ReactNode;
  content?: ContentSettings | null;
}

const PROMO_VIDEO_SESSION_KEY = 'promoVideoShown';

function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function HomePageClient({ children, content }: HomePageClientProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

      setIsIos(isIosDevice);
      
      if (isIosDevice && !isInStandaloneMode) {
        setShowInstallDialog(true);
      } else {
        const handleBeforeInstallPrompt = (e: Event) => {
          e.preventDefault();
          setDeferredPrompt(e);
          setShowInstallDialog(true);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => {
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
      }
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    setShowInstallDialog(false);
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };


  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
        router.push('/login');
    }
    
    if (!loading && !initialAuthCheckComplete) {
      setInitialAuthCheckComplete(true);
      if (user && content?.youtubeUrl) {
        try {
          const hasBeenShown = sessionStorage.getItem(PROMO_VIDEO_SESSION_KEY);
          if (!hasBeenShown) {
            setIsPromoOpen(true);
            sessionStorage.setItem(PROMO_VIDEO_SESSION_KEY, 'true');
          }
        } catch (error) {
          console.error("Session storage is not available.", error);
        }
      }
    }
  }, [loading, initialAuthCheckComplete, user, content, router]);


  if (loading || !user) {
    return (
      <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 md:px-8 backdrop-blur-sm">
             <Skeleton className="h-8 w-8 rounded-full md:hidden" />
             <Skeleton className="h-8 w-48 hidden md:block" />
             <div className="flex flex-1 items-center justify-end gap-4">
                <Skeleton className="h-8 w-32 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
             </div>
          </header>
          <div className="flex flex-1">
             <aside className="hidden md:flex w-64 border-r">
                 <div className="flex flex-col h-full w-full p-4 gap-4">
                     <Skeleton className="h-10 w-full" />
                     <div className="p-2 space-y-2">
                        <Skeleton className="h-16 w-full" />
                     </div>
                     <Skeleton className="h-8 w-full" />
                     <Skeleton className="h-8 w-full" />
                     <div className="p-2 mt-6">
                        <Skeleton className="h-32 w-full" />
                     </div>
                 </div>
             </aside>
             <main className="flex-1 p-4 sm:p-6 md:p-8">
                 <Skeleton className="h-10 w-full md:w-1/2 mb-6" />
                 <div className="space-y-8">
                     <div>
                        <Skeleton className="h-8 w-48 mb-4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-64 w-full" />
                        </div>
                     </div>
                 </div>
             </main>
          </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar onNavigate={() => setIsNavigating(true)} />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col">
          <BannerAd imageUrl={content?.bannerImageUrl} />
          {isNavigating ? <PageLoader /> : children}
        </main>
        <WhatsAppSupportButton />
        {content?.youtubeUrl && (
            <PromotionalVideoDialog 
                youtubeUrl={content.youtubeUrl}
                isOpen={isPromoOpen}
                onOpenChange={setIsPromoOpen}
            />
        )}
        <InstallPwaDialog
            isOpen={showInstallDialog}
            isIos={isIos}
            onOpenChange={setShowInstallDialog}
            onInstall={handleInstallClick}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
