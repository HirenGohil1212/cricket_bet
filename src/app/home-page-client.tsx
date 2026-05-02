"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { WhatsAppSupportButton } from "@/components/whatsapp-support-button";
import { useAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppSettings, ContentSettings } from "@/lib/types";
import { PromotionalVideoDialog } from "@/components/promotional-video-dialog";
import { PromotionalCarousel } from "@/components/promotional-carousel";
import { Loader2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { useToast } from "@/hooks/use-toast";

interface HomePageClientProps {
  children: React.ReactNode;
  content?: ContentSettings | null;
  appSettings?: AppSettings | null;
}

const PROMO_VIDEO_SESSION_KEY = 'promoVideoShown';
const QUIET_LOGIN_SESSION_KEY = 'quietLogin';

function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[40vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function HomePageClient({ children, content, appSettings }: HomePageClientProps) {
  const { user, userProfile, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  const promoVideoUrl = content?.smallVideoUrl || content?.youtubeUrl;

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
        router.push('/login');
    }
    
    if (!loading && !initialAuthCheckComplete) {
      setInitialAuthCheckComplete(true);
      if (user) {
        try {
          const isQuietLogin = sessionStorage.getItem(QUIET_LOGIN_SESSION_KEY) === 'true';
          sessionStorage.removeItem(QUIET_LOGIN_SESSION_KEY);

          const hasBeenShown = sessionStorage.getItem(PROMO_VIDEO_SESSION_KEY) === 'true';
          
          if (isQuietLogin && promoVideoUrl && !hasBeenShown) {
             setIsPromoOpen(true);
             sessionStorage.setItem(PROMO_VIDEO_SESSION_KEY, 'true');
          } else if (isQuietLogin) {
             toast({
                title: `Welcome, ${userProfile?.name || 'friend'}!`,
                description: "You've successfully signed in."
             });
          }

        } catch (error) {
          console.error("Session storage is not available.", error);
        }
      }
    }
  }, [loading, initialAuthCheckComplete, user, userProfile, promoVideoUrl, router, toast]);


  if (loading || !user) {
    return (
      <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b px-4 md:px-8 bg-background">
             <Skeleton className="h-8 w-8 rounded-full md:hidden" />
             <Skeleton className="h-8 w-48 hidden md:block" />
             <div className="flex flex-1 items-center justify-end gap-4">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
             </div>
          </header>
          <div className="flex flex-1 overflow-hidden">
             <main className="flex-1 p-4 sm:p-6 md:p-8">
                 <Skeleton className="h-10 w-3/4 md:w-1/2 mb-6" />
                 <div className="space-y-6">
                    <Skeleton className="h-40 w-full rounded-2xl" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <Skeleton className="h-64 w-full rounded-2xl" />
                        <Skeleton className="h-64 w-full rounded-2xl" />
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
      <SidebarInset className="flex flex-col min-h-screen bg-background overflow-x-hidden">
        <Header />
        <main className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col mb-20 max-w-full">
          <div className="mb-6 flex gap-3">
              <Button asChild className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black uppercase text-xs sm:text-sm h-11 sm:h-12 rounded-xl shadow-lg shadow-green-500/20 active:scale-95 transition-transform">
                <Link href="/wallet?action=deposit">
                  <ArrowUpCircle className="mr-2 h-4 w-4" /> Deposit
                </Link>
              </Button>
              <Button asChild variant="destructive" className="flex-1 font-black uppercase text-xs sm:text-sm h-11 sm:h-12 rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-transform">
                <Link href="/wallet?action=withdraw">
                  <ArrowDownCircle className="mr-2 h-4 w-4" /> Withdraw
                </Link>
              </Button>
          </div>
          <PromotionalCarousel banners={content?.banners} />
          <div className="w-full">
            {isNavigating ? <PageLoader /> : children}
          </div>
        </main>
        <Footer />
        <WhatsAppSupportButton appSettings={appSettings} />
        {promoVideoUrl && (
            <PromotionalVideoDialog 
                videoUrl={promoVideoUrl}
                isOpen={isPromoOpen}
                onOpenChange={setIsPromoOpen}
            />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
