"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.length < 2) {
            toast({ variant: "destructive", title: "Invalid Name", description: "Name must be at least 2 characters." });
            return;
        }
        if (phoneNumber.length !== 10) {
            toast({ variant: "destructive", title: "Invalid Number", description: "Please enter a valid 10-digit mobile number." });
            return;
        }
        if (password.length < 6) {
            toast({ variant: "destructive", title: "Invalid Password", description: "Password must be at least 6 characters." });
            return;
        }
        
        setIsLoading(true);

        // We use the phone number to create a dummy email for Firebase Auth
        const email = `+91${phoneNumber}@guessandwin.app`;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Update the user's profile with their display name
            await updateProfile(user, { displayName: name });

            toast({ title: "Account Created!", description: "You have been successfully signed up." });
            router.push("/");
        } catch (error: any) {
            console.error("Error signing up: ", error);
            let description = "An error occurred. Please try again.";
            if (error.code === 'auth/email-already-in-use') {
                description = "This mobile number is already registered. Please login instead.";
            }
            toast({ variant: "destructive", title: "Signup Failed", description });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>
                    Enter your details below to get started.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                   <div className="space-y-2">
                       <Label htmlFor="name">Full Name</Label>
                       <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading}/>
                   </div>
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
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                </form>
                <div className="mt-4 text-center text-sm">
                    Already have an account?{" "}
                    <Link href="/login" className="underline font-medium text-primary">
                        Login
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
