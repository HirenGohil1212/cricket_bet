"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, LayoutDashboard, Users, ArrowLeft, Swords } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
    
    if (!userProfile || userProfile.role !== 'admin') {
         return <AccessDenied />;
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
                <div className="flex flex-col gap-2 p-4">
                     <div className="flex h-16 items-center border-b px-2">
                         <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
                            <span className="">Guess & Win Admin</span>
                         </Link>
                     </div>
                     <div className="flex-1 mt-4 space-y-1">
                        <Link href="/admin/dashboard" className={cn("flex items-center gap-3 rounded-lg px-3 py-2 transition-all", pathname === "/admin/dashboard" ? "bg-muted text-primary" : "text-muted-foreground hover:text-primary")}>
                           <LayoutDashboard className="h-4 w-4" />
                           Dashboard
                        </Link>
                        <Link href="/admin/users" className={cn("flex items-center gap-3 rounded-lg px-3 py-2 transition-all", pathname === "/admin/users" ? "bg-muted text-primary" : "text-muted-foreground hover:text-primary")}>
                           <Users className="h-4 w-4" />
                           Users
                        </Link>
                         <Link href="/admin/matches" className={cn("flex items-center gap-3 rounded-lg px-3 py-2 transition-all", pathname.startsWith("/admin/matches") ? "bg-muted text-primary" : "text-muted-foreground hover:text-primary")}>
                           <Swords className="h-4 w-4" />
                           Matches
                        </Link>
                     </div>
                </div>
                 <div className="mt-auto p-4">
                    <Button size="sm" asChild>
                      <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to App
                      </Link>
                    </Button>
                </div>
            </aside>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:ml-60 sm:p-6">
                {children}
            </main>
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
                    You do not have permission to view this page. Please contact an administrator if you believe this is an error.
                     <Button variant="outline" size="sm" className="mt-4" asChild>
                         <Link href="/">Go to Homepage</Link>
                     </Button>
                </AlertDescription>
            </Alert>
        </div>
    )
}

function AdminSkeleton() {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden w-60 flex-col border-r bg-background p-4 sm:flex">
          <div className="flex h-16 items-center border-b px-2">
             <Skeleton className="h-6 w-32" />
          </div>
          <div className="space-y-2 mt-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="mt-auto">
             <Skeleton className="h-10 w-full" />
          </div>
        </aside>
        <main className="flex-1 p-8">
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
}
