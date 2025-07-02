
"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { WhatsAppSupportButton } from "@/components/whatsapp-support-button";
import { useRequireAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContentSettings } from "@/lib/types";
import { PromotionalVideoDialog } from "@/components/promotional-video-dialog";

interface HomePageClientProps {
  children: React.ReactNode;
  content?: ContentSettings | null;
}

const PROMO_VIDEO_SESSION_KEY = 'promoVideoShown';

export function HomePageClient({ children, content }: HomePageClientProps) {
  const { user, loading } = useRequireAuth();
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  
  // This state tracks if we've already run the check after the initial auth loading.
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState(false);

  useEffect(() => {
    // We only want to run this logic *once* after the initial authentication check is done.
    if (!loading && !initialAuthCheckComplete) {
      // Mark that the check has been performed to prevent re-triggering on subsequent re-renders.
      setInitialAuthCheckComplete(true);

      // If the auth check is complete, we have a user, and there's a video URL...
      if (user && content?.youtubeUrl) {
        try {
          // Check if the video has already been shown in this session.
          const hasBeenShown = sessionStorage.getItem(PROMO_VIDEO_SESSION_KEY);
          if (!hasBeenShown) {
            setIsPromoOpen(true);
            // Mark it as shown for this session.
            sessionStorage.setItem(PROMO_VIDEO_SESSION_KEY, 'true');
          }
        } catch (error) {
          // sessionStorage may not be available in all environments (e.g., SSR-like scenarios)
          console.error("Session storage is not available.", error);
        }
      }
    }
  }, [loading, initialAuthCheckComplete, user, content]);


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
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
        <WhatsAppSupportButton />
        {content?.youtubeUrl && (
            <PromotionalVideoDialog 
                youtubeUrl={content.youtubeUrl}
                isOpen={isPromoOpen}
                onOpenChange={setIsPromoOpen}
            />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
