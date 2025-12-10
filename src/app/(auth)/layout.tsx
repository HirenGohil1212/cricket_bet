
"use client";

import { Award } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { usePwaInstall } from "@/context/pwa-install-context";


export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { promptInstall, setIsDialogOpen } = usePwaInstall();


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
                     <h1 className="font-headline text-5xl font-bold text-primary flex items-baseline">
                        <span>UPI</span>
                        <span className="text-[1.3em] leading-none ml-1">11</span>
                    </h1>
                </div>
                {children}
                 <div className="mt-6 flex justify-center gap-4">
                    <button onClick={() => setIsDialogOpen(true)} aria-label="Download from App Store">
                        <Image src="/icons8-app-store-100.png" alt="Download on the App Store" width={144} height={48} className="object-contain h-12 w-auto" />
                    </button>
                    <button onClick={promptInstall} aria-label="Get it on Google Play">
                        <Image src="/icons8-google-play-store-100.png" alt="Get it on Google Play" width={144} height={48} className="object-contain h-12 w-auto" />
                    </button>
                </div>
            </div>
        </div>
    );
}
