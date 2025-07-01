import type { Metadata } from "next";
import { Award } from "lucide-react";

export const metadata: Metadata = {
    title: "Authentication - Guess and Win",
    description: "Login or create an account to start winning.",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 flex justify-center">
                    <div className="flex items-center gap-2">
                         <Award className="w-10 h-10 text-primary" />
                         <h1 className="font-headline text-3xl font-bold">Guess and Win</h1>
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
}
