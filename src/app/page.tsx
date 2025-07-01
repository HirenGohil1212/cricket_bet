"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { MatchTabs } from "@/components/matches/match-tabs";
import { WhatsAppSupportButton } from "@/components/whatsapp-support-button";
import { useRequireAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { user, loading } = useRequireAuth();

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
          <MatchTabs />
        </main>
        <WhatsAppSupportButton />
      </SidebarInset>
    </SidebarProvider>
  );
}
