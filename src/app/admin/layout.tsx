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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userProfile, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return <AdminSkeleton />;
  }

  if (!userProfile || userProfile.role !== "admin") {
    return <AccessDenied />;
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
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
          <div className="flex-1">
            <nav className="grid items-start space-y-1 px-2 py-4 text-sm font-medium lg:px-4">
              <Link
                href="/admin/dashboard"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  pathname === "/admin/dashboard"
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  pathname === "/admin/users"
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <Users className="h-4 w-4" />
                Users
              </Link>
              <Link
                href="/admin/matches"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  pathname.startsWith("/admin/matches")
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <Swords className="h-4 w-4" />
                Matches
              </Link>
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
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
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
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                  href="/admin/dashboard"
                  className="mb-4 flex items-center gap-2 text-lg font-semibold"
                >
                  <Award className="h-6 w-6 text-primary" />
                  <span>Guess & Win Admin</span>
                </Link>
                <Link
                  href="/admin/dashboard"
                  className={cn(
                    "flex items-center gap-4 rounded-lg px-3 py-2 transition-all",
                    pathname === "/admin/dashboard"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary"
                  )}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link
                  href="/admin/users"
                  className={cn(
                    "flex items-center gap-4 rounded-lg px-3 py-2 transition-all",
                    pathname === "/admin/users"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary"
                  )}
                >
                  <Users className="h-5 w-5" />
                  Users
                </Link>
                <Link
                  href="/admin/matches"
                  className={cn(
                    "flex items-center gap-4 rounded-lg px-3 py-2 transition-all",
                    pathname.startsWith("/admin/matches")
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary"
                  )}
                >
                  <Swords className="h-5 w-5" />
                  Matches
                </Link>
              </nav>
              <div className="mt-auto">
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
          {children}
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
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
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
