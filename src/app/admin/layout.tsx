

"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Terminal,
  LayoutDashboard,
  Users,
  ArrowLeft,
  Swords,
  Menu,
  Award,
  Banknote,
  Wallet,
  CircleDollarSign,
  MessageSquareQuote,
  Gift,
  GalleryHorizontal,
  LineChart,
  Percent,
  Loader2,
  UsersRound,
  DatabaseZap,
  Settings,
  UserRoundX,
  Landmark,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, useEffect } from "react";

function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // This effect will run when a new page has finished loading, turning off the loader.
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);
  
  // **FIX**: The check now correctly waits for loading to be false AND for the userProfile
  // to be loaded before denying access. If the user is logged in but the profile is still
  // loading, it will show the skeleton.
  if (loading || (user && !userProfile)) {
    return <AdminSkeleton />;
  }

  if (!user || userProfile.role !== "admin") {
    return <AccessDenied />;
  }

  const handleLinkClick = (href: string, isMobile: boolean) => {
    // Only show loader if navigating to a different page
    if (pathname !== href) {
      setIsNavigating(true);
    }
    if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  const navLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/matches", label: "Matches", icon: Swords },
    { href: "/admin/players", label: "Players", icon: UsersRound },
    { href: "/admin/dummy-users", label: "Dummy Users", icon: UserRoundX },
    { href: "/admin/q-and-a", label: "Result", icon: MessageSquareQuote },
    { href: "/admin/deposits", label: "Deposits", icon: Wallet },
    { href: "/admin/withdrawals", label: "Withdrawals", icon: CircleDollarSign },
    { href: "/admin/finance", label: "Finance", icon: Landmark },
    { href: "/admin/financial-reports", label: "Financials", icon: LineChart },
    { href: "/admin/referrals", label: "Referrals", icon: Gift },
    { href: "/admin/betting-settings", label: "Betting Settings", icon: Percent },
    { href: "/admin/bank-details", label: "Bank Details", icon: Banknote },
    { href: "/admin/content", label: "Content", icon: GalleryHorizontal },
    { href: "/admin/data-management", label: "Data Management", icon: DatabaseZap },
    { href: "/admin/settings", label: "Support", icon: Settings },
  ];

  const renderNavLinks = (isMobile = false) =>
    navLinks.map(({ href, label, icon: Icon }) => (
      <Link
        key={href}
        href={href}
        onClick={() => handleLinkClick(href, isMobile)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
          pathname.startsWith(href)
            ? "bg-muted text-primary"
            : "text-muted-foreground hover:text-primary",
          isMobile && "gap-4 text-lg"
        )}
      >
        <Icon className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
        {label}
      </Link>
    ));

  return (
    <div className="grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r bg-background md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2 font-semibold"
            >
              <Award className="h-6 w-6 text-primary" />
              <span className="">Guess & Win Admin</span>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="grid items-start space-y-1 px-2 py-4 text-sm font-medium lg:px-4">
              {renderNavLinks()}
            </nav>
          </div>
          <div className="mt-auto p-4">
            <Button size="sm" asChild className="w-full">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to App
              </Link>
            </Button>
          </div>
        </div>
      </aside>
      <div className="flex flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <SheetHeader className="border-b p-4">
                <SheetTitle asChild>
                   <Link
                      href="/admin/dashboard"
                      className="flex items-center gap-2 text-lg font-semibold"
                      onClick={() => {
                        handleLinkClick('/admin/dashboard', true);
                      }}
                    >
                      <Award className="h-6 w-6 text-primary" />
                      <span>Guess & Win Admin</span>
                    </Link>
                </SheetTitle>
              </SheetHeader>
              <nav className="grid gap-2 text-lg font-medium p-4 flex-1 overflow-y-auto">
                {renderNavLinks(true)}
              </nav>
              <div className="mt-auto border-t p-4">
                <Button size="sm" className="w-full" asChild>
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to App
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1" />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
          {isNavigating ? <PageLoader /> : children}
        </main>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-lg">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to view this page. Please contact an
          administrator if you believe this is an error.
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/">Go to Homepage</Link>
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-background md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Skeleton className="h-6 w-36" />
          </div>
          <div className="flex-1 p-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
          <div className="mt-auto p-4">
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Skeleton className="h-8 w-8 shrink-0 md:hidden" />
          <div className="w-full flex-1" />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <Skeleton className="mb-4 h-8 w-32" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    </div>
  );
}
