
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Ticket, History, Award, LogIn, LogOut, User as UserIcon, Shield } from "lucide-react";
import { ReferralCard } from "@/components/dashboard/referral-card";
import { BettingHistoryDialog } from "@/components/dashboard/betting-history-dialog";
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export function AppSidebar() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { toast } = useToast();
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { isMobile } = useSidebar();

  const handleLogout = async () => {
      try {
          await signOut(auth);
          toast({
              title: "Logged Out",
              description: "You have been successfully logged out.",
          });
          router.push('/login');
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
  }

  const HeaderContent = () => (
    <div className="flex items-center gap-2">
      <Award className="w-8 h-8 text-primary" />
      <h1 className="font-headline text-2xl font-bold">Guess and Win</h1>
    </div>
  );

  return (
    <>
      <Sidebar>
        {/* Conditionally render the correct header for mobile vs desktop */}
        {isMobile ? (
          <SheetHeader className="p-4 border-b">
            <SheetTitle>
              <HeaderContent />
            </SheetTitle>
          </SheetHeader>
        ) : (
          <SidebarHeader>
            <HeaderContent />
          </SidebarHeader>
        )}

        <SidebarContent className="p-2">
            {userProfile && (
                <div className="p-2 mb-4">
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
          
          {userProfile?.role === 'admin' && (
            <>
                <SidebarSeparator className="my-2" />
                <div className="px-2">
                    <p className="text-xs font-semibold text-muted-foreground px-2 mb-1">Admin</p>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
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
                    </>
                )}
            </div>
        </SidebarFooter>
      </Sidebar>
      {user && <BettingHistoryDialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen} />}
    </>
  );
}
