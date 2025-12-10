
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Ticket, History, LogIn, LogOut, User as UserIcon, Shield, Wallet, Download, Swords, Heart } from "lucide-react";
import { ReferralCard } from "@/components/dashboard/referral-card";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { usePwaInstall } from '@/context/pwa-install-context';
import Image from 'next/image';
import { navLinks } from '@/lib/admin-nav';


interface AppSidebarProps {
  onNavigate: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { toast } = useToast();
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const { canInstall, promptInstall, setIsDialogOpen, isIos } = usePwaInstall();

  const handleLinkClick = (href: string) => {
    if (pathname !== href) {
        onNavigate();
    }
    if (isMobile) {
        setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
      try {
          await signOut(auth);
          try {
            sessionStorage.removeItem('promoVideoShown');
          } catch (error) {
             console.error("Session storage is not available for cleanup.", error);
          }
          toast({
              title: "Logged Out",
              description: "You have been successfully logged out.",
          });
          router.push('/login');
          if (isMobile) {
            setOpenMobile(false);
          }
      } catch (error) {
          toast({
              variant: "destructive",
              title: "Logout Failed",
              description: "Something went wrong. Please try again.",
          });
      }
  };

  const handleInstallClick = () => {
    if (isIos) {
      setIsDialogOpen(true);
    } else {
      promptInstall();
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  // Determine the correct admin link
  const adminPanelLink = useMemo(() => {
    if (userProfile?.role === 'admin') {
      return '/admin/dashboard';
    }
    if (userProfile?.role === 'sub-admin') {
      const firstAllowedLink = navLinks.find(link => userProfile.permissions?.[link.permission]);
      return firstAllowedLink?.href || '/admin/dashboard'; // Fallback to dashboard
    }
    return '/admin/dashboard';
  }, [userProfile]);

  const HeaderContent = () => (
    <div className="flex items-center gap-2">
      <h1 className="font-headline text-3xl font-bold text-primary flex items-baseline">
        <span>UPI</span>
        <span className="text-[1.2em] leading-none ml-1">11</span>
      </h1>
    </div>
  );

  const MobileHeader = () => (
    <SheetHeader className="p-4 border-b">
        <SheetTitle className={cn("flex items-center gap-2")}>
             <HeaderContent />
        </SheetTitle>
    </SheetHeader>
  )

  const DesktopHeader = () => (
     <SidebarHeader>
        <HeaderContent />
    </SidebarHeader>
  )

  return (
    <>
      <Sidebar className="bg-transparent border-r border-border">
        {isMobile ? <MobileHeader /> : <DesktopHeader />}
        
        <SidebarContent className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleLinkClick('/')} asChild isActive={pathname === '/'}>
                <Link href="/">
                    <Ticket />
                    Matches
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleLinkClick('/favorites')} asChild isActive={pathname === '/favorites'}>
                <Link href="/favorites">
                    <Heart />
                    Favorites
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleLinkClick('/game-history')} asChild isActive={pathname === '/game-history'}>
                <Link href="/game-history">
                    <Swords />
                    Game History
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleLinkClick('/history')} asChild isActive={pathname === '/history'}>
                <Link href="/history">
                    <History />
                    Transaction History
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleLinkClick('/profile')} asChild isActive={pathname === '/profile'}>
                <Link href="/profile">
                    <UserIcon />
                    My Profile
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             {canInstall && (
               <SidebarMenuItem>
                <SidebarMenuButton onClick={handleInstallClick}>
                    <Download />
                    Install App
                </SidebarMenuButton>
              </SidebarMenuItem>
             )}
          </SidebarMenu>
          
          {(userProfile?.role === 'admin' || userProfile?.role === 'sub-admin') && (
            <>
                <SidebarSeparator className="my-2" />
                <div className="px-2">
                    <p className="text-xs font-semibold text-muted-foreground px-2 mb-1">Admin</p>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => handleLinkClick(adminPanelLink)} asChild isActive={pathname.startsWith('/admin')}>
                                <Link href={adminPanelLink}>
                                    <Shield />
                                    Admin Panel
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>
            </>
          )}

          <div className="mt-6 p-2">
            <ReferralCard />
          </div>
        </SidebarContent>

        <SidebarFooter>
            <div className="flex flex-col gap-2 p-2">
                {loading ? null : user ? (
                     <Button variant="ghost" onClick={handleLogout}>
                        <LogOut />
                        Logout
                    </Button>
                ) : (
                    <>
                        <Button onClick={() => handleLinkClick('/login')} asChild>
                            <Link href="/login">
                                <LogIn />
                                Login
                            </Link>
                        </Button>
                        <Button variant="secondary" onClick={() => handleLinkClick('/signup')} asChild>
                            <Link href="/signup">
                                Sign Up
                            </Link>
                        </Button>
                    </>
                )}
            </div>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}

    
