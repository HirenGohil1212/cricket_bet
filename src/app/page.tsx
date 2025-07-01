import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { MatchTabs } from "@/components/matches/match-tabs";
import { WhatsAppSupportButton } from "@/components/whatsapp-support-button";

export default function Home() {
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
