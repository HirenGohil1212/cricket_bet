"use client"

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Wallet, Bell } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export function Header() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <div className="hidden md:block">
        <h1 className="font-headline text-2xl font-bold">Matches</h1>
      </div>
      <div className="flex flex-1 items-center justify-end gap-4">
        {user && (
            <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold">
              <Wallet className="h-5 w-5 text-primary" />
              {/* TODO: Fetch balance from Firestore */}
              <span>₹ 1,250.75</span>
            </div>
        )}
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
      </div>
    </header>
  );
}
