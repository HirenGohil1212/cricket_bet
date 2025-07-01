
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phoneNumber.length !== 10) {
            toast({ variant: "destructive", title: "Invalid Number", description: "Please enter a valid 10-digit mobile number." });
            return;
        }
        if (!password) {
            toast({ variant: "destructive", title: "Password Required", description: "Please enter your password." });
            return;
        }
        setIsLoading(true);

        // We use the phone number to create the dummy email used for Firebase Auth
        const email = `+91${phoneNumber}@guessandwin.app`;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast({ title: "Login Successful", description: "Welcome back!" });
            router.push("/");
        } catch (error: any) {
            console.error("Error logging in: ", error);
            let description = "Invalid credentials. Please check your mobile number and password.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                 description = "Invalid mobile number or password. Please try again.";
            }
            toast({ variant: "destructive", title: "Login Failed", description });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                    Enter your mobile number and password to login.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Mobile Number</Label>
                        <div className="flex items-center">
                            <span className="inline-flex items-center h-10 px-3 text-sm border border-r-0 rounded-l-md border-input bg-muted text-muted-foreground">
                                +91
                            </span>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="9876543210"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                disabled={isLoading}
                                className="rounded-l-none"
                                maxLength={10}
                            />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            <Link href="/forgot-password" passHref>
                                <span className="text-sm font-medium text-primary hover:underline cursor-pointer">
                                    Forgot Password?
                                </span>
                            </Link>
                        </div>
                        <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </Button>
                </form>
                <div className="mt-4 text-center text-sm">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="underline font-medium text-primary">
                        Sign up
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
