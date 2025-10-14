
"use client";

import { Award } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";


export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            router.push('/');
        }
    }, [user, loading, router]);
    
    if (loading || user) {
        return (
             <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
                 <div className="w-full max-w-sm space-y-8">
                    <div className="flex justify-center">
                        <Skeleton className="h-10 w-48" />
                    </div>
                    <Skeleton className="h-[450px] w-full" />
                 </div>
             </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 flex justify-center">
                    <div className="flex items-center gap-2">
                         <Award className="w-10 h-10 text-primary" />
                         <h1 className="font-headline text-3xl font-bold">UPI11</h1>
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
}
