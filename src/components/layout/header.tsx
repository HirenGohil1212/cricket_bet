"use client"

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Wallet, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";


const getTitle = (pathname: string) => {
    if (pathname.startsWith('/profile')) return 'My Profile';
    if (pathname.startsWith('/wallet')) return 'My Wallet';
    if (pathname.startsWith('/game-history')) return 'Game History';
    if (pathname.startsWith('/history')) return 'History';
    return 'Matches';
}

export function Header() {
  const { user, userProfile, pendingWagered } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const title = getTitle(pathname);

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
      } catch (error) {
          toast({
              variant: "destructive",
              title: "Logout Failed",
              description: "Something went wrong. Please try again.",
          });
      }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-8">
      <div className="flex items-center gap-2">
        <div className="md:hidden">
            <SidebarTrigger className="h-9 w-9" />
        </div>
        <div className="md:hidden flex items-center gap-1 font-headline">
            <h1 className="text-xl font-bold text-primary flex items-baseline">
                <span>UPI</span>
                <span className="text-[1.2em] leading-none ml-0.5">11</span>
            </h1>
        </div>
      </div>
      <div className="hidden md:block">
        <h1 className="font-headline text-2xl font-bold text-primary">{title}</h1>
      </div>
      <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-4">
        {user && userProfile && (
            <Button asChild variant="outline" className="h-9 px-2 sm:px-4 border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary">
                <Link href="/wallet" className="flex items-center gap-1">
                    <Wallet className="h-4 w-4 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold tabular-nums">{userProfile.walletBalance.toFixed(0)}</span>
                    <span className="text-primary/30 font-light">|</span>
                    <span className="text-xs sm:text-sm font-bold tabular-nums text-primary/70">-{pendingWagered.toFixed(0)}</span>
                </Link>
            </Button>
        )}
        {user && userProfile && (
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                <Avatar className="h-full w-full">
                  <AvatarImage src={user?.photoURL || undefined} alt={userProfile.name} className="object-cover" />
                  <AvatarFallback className="bg-secondary text-primary">
                    <UserIcon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userProfile.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userProfile.phoneNumber}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/profile">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
