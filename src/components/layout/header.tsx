
"use client"

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Wallet, Bell, User as UserIcon, LogOut } from "lucide-react";
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
    if (pathname.startsWith('/wallet')) return 'My Wallet';
    if (pathname.startsWith('/profile')) return 'My Profile';
    return 'Matches';
}

export function Header() {
  const { user, userProfile } = useAuth();
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
        {user && userProfile && (
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.photoURL || undefined} alt={userProfile.name} />
                  <AvatarFallback>
                    <UserIcon />
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
