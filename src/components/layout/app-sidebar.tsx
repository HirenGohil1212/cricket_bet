"use client";

import { useState } from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Ticket, History, LogOut, Settings, Award } from "lucide-react";
import { ReferralCard } from "@/components/dashboard/referral-card";
import { BettingHistoryDialog } from "@/components/dashboard/betting-history-dialog";

export function AppSidebar() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Award className="w-8 h-8 text-primary" />
            <h1 className="font-headline text-2xl font-bold">ScoreCast</h1>
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
              <SidebarMenuButton onClick={() => setIsHistoryOpen(true)}>
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
          <div className="flex items-center gap-3 p-2">
            <Avatar>
              <AvatarImage src="https://placehold.co/40x40.png" alt="User" data-ai-hint="person avatar" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-sm">User</p>
              <p className="text-xs text-muted-foreground">user@example.com</p>
            </div>
            <Button variant="ghost" size="icon">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <BettingHistoryDialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen} />
    </>
  );
}
