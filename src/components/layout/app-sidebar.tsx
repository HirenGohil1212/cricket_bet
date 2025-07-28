
"use client";

import { useState } from 'react';
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
import { Ticket, History, Award, LogIn, LogOut, User as UserIcon, Shield, Wallet } from "lucide-react";
import { ReferralCard } from "@/components/dashboard/referral-card";
import { BettingHistoryDialog } from "@/components/dashboard/betting-history-dialog";
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  onNavigate: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { toast } = useToast();
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();

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

  const handleMyBetsClick = () => {
      if(user) {
          setIsHistoryOpen(true);
      } else {
          toast({
              variant: "destructive",
              title: "Not Logged In",
              description: "Please login to see your betting history.",
          });
          router.push('/login');
      }
      if (isMobile) {
        setOpenMobile(false);
      }
  }

  const HeaderContent = () => (
    <div className="flex items-center gap-2">
      <Award className="w-8 h-8 text-primary" />
      <h1 className="font-headline text-2xl font-bold">ScoreCast</h1>
    </div>
  );

  const MobileHeader = () => (
    <SheetHeader className="p-4 border-b">
        <SheetTitle className={cn("flex items-center gap-2 font-headline text-2xl font-bold")}>
            <Award className="w-8 h-8 text-primary" />
            <span>ScoreCast</span>
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
      <Sidebar className="bg-gradient-to-b from-background to-muted/50">
        {isMobile ? <MobileHeader /> : <DesktopHeader />}
        
        <SidebarContent className="p-2">
            {userProfile && (
                <div className="p-2 mb-2">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                       <Avatar>
                         <AvatarImage src={user?.photoURL || ''} alt={userProfile.name || 'User'}/>
                         <AvatarFallback>
                           <UserIcon />
                         </AvatarFallback>
                       </Avatar>
                       <div className="flex flex-col truncate">
                         <span className="font-semibold text-sm truncate">{userProfile.name || 'Welcome'}</span>
                         <span className="text-xs text-muted-foreground truncate">{userProfile.phoneNumber}</span>
                       </div>
                    </div>
                </div>
            )}
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
              <SidebarMenuButton onClick={() => handleLinkClick('/wallet')} asChild isActive={pathname === '/wallet'}>
                <Link href="/wallet">
                    <Wallet />
                    My Wallet
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleMyBetsClick}>
                <History />
                My Bets
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
          </SidebarMenu>
          
          {userProfile?.role === 'admin' && (
            <>
                <SidebarSeparator className="my-2" />
                <div className="px-2">
                    <p className="text-xs font-semibold text-muted-foreground px-2 mb-1">Admin</p>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => handleLinkClick('/admin/dashboard')} asChild isActive={pathname.startsWith('/admin')}>
                                <Link href="/admin/dashboard">
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
      {user && <BettingHistoryDialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen} />}
    </>
  );
}
