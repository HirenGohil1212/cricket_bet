"use client";

import { useState } from 'react';
import Link from 'next/link';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Ticket, History, Award, LogIn } from "lucide-react";
import { ReferralCard } from "@/components/dashboard/referral-card";
import { BettingHistoryDialog } from "@/components/dashboard/betting-history-dialog";
import { useToast } from '@/hooks/use-toast';

export function AppSidebar() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { toast } = useToast();
  // This will be replaced by a proper auth context later
  const isLoggedIn = false; 

  const handleMyBetsClick = () => {
      if(isLoggedIn) {
          setIsHistoryOpen(true);
      } else {
          toast({
              variant: "destructive",
              title: "Not Logged In",
              description: "Please login to see your betting history.",
          });
      }
  }

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Award className="w-8 h-8 text-primary" />
            <h1 className="font-headline text-2xl font-bold">Guess and Win</h1>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive>
                <Ticket />
                Matches
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleMyBetsClick}>
                <History />
                My Bets
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="mt-6 p-2">
            <ReferralCard />
          </div>
        </SidebarContent>
        <SidebarFooter>
            <div className="flex flex-col gap-2 p-2">
                <Button asChild>
                    <Link href="/login">
                        <LogIn />
                        Login
                    </Link>
                </Button>
                 <Button variant="secondary" asChild>
                    <Link href="/signup">
                        Sign Up
                    </Link>
                </Button>
            </div>
        </SidebarFooter>
      </Sidebar>
      {isLoggedIn && <BettingHistoryDialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen} />}
    </>
  );
}
