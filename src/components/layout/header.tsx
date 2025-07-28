
"use client"

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Wallet, Bell } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const getTitle = (pathname: string) => {
    if (pathname.startsWith('/wallet')) return 'My Wallet';
    if (pathname.startsWith('/profile')) return 'My Profile';
    return 'Matches';
}

export function Header() {
  const { user, userProfile } = useAuth();
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <div className="hidden md:block">
        <h1 className="font-headline text-2xl font-bold">{title}</h1>
      </div>
      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
        {user && userProfile && (
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary shadow-sm">
              <Wallet className="h-5 w-5" />
              <span><span className="hidden sm:inline">INR </span>{userProfile.walletBalance.toFixed(2)}</span>
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
