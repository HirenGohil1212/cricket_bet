"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, updateProfile, type ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

declare global {
    interface Window {
        recaptchaVerifier?: RecaptchaVerifier;
        confirmationResult?: ConfirmationResult;
    }
}

export default function SignupPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const setupRecaptcha = () => {
        if (window.recaptchaVerifier) return;
        try {
             window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => {}
            });
        } catch(error) {
            console.error("Recaptcha Verifier error", error)
        }
    };

    useEffect(() => {
        setupRecaptcha();
    }, []);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.length < 2) {
            toast({ variant: "destructive", title: "Invalid Name", description: "Name must be at least 2 characters." });
            return;
        }
         if (phoneNumber.length !== 10) {
            toast({ variant: "destructive", title: "Invalid Number", description: "Please enter a valid 10-digit mobile number." });
            return;
        }
        setIsLoading(true);
        setupRecaptcha();
        const appVerifier = window.recaptchaVerifier!;
        const formattedPhoneNumber = `+91${phoneNumber}`;

        try {
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
            window.confirmationResult = confirmationResult;
            setIsOtpSent(true);
            toast({ title: "OTP Sent", description: `An OTP has been sent to ${formattedPhoneNumber}` });
        } catch (error) {
            console.error("Error sending OTP: ", error);
            toast({ variant: "destructive", title: "Error", description: "Could not send OTP. This number might already be in use or the format is incorrect." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtpAndSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            toast({ variant: "destructive", title: "Invalid OTP", description: "Please enter the 6-digit OTP." });
            return;
        }
        setIsLoading(true);
        if (!window.confirmationResult) {
            toast({ variant: "destructive", title: "Error", description: "Something went wrong. Please try sending the OTP again."});
            setIsLoading(false);
            setIsOtpSent(false);
            return;
        }
        try {
            const userCredential = await window.confirmationResult.confirm(otp);
            const user = userCredential.user;
            await updateProfile(user, { displayName: name });
            
            toast({ title: "Account Created!", description: "You have been successfully signed up." });
            router.push("/");
        } catch (error) {
            console.error("Error verifying OTP: ", error);
            toast({ variant: "destructive", title: "Signup Failed", description: "Invalid OTP or another error occurred. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div id="recaptcha-container"></div>
            <Card>
                <CardHeader>
                    <CardTitle>Create an account</CardTitle>
                    <CardDescription>
                        {isOtpSent ? 'Verify your number to finish signing up.' : 'Enter your details below to get started.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   {!isOtpSent ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
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
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Sending OTP...' : 'Send OTP'}
                            </Button>
                        </form>
                   ) : (
                        <form onSubmit={handleVerifyOtpAndSignup} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="otp">OTP</Label>
                                <Input
                                    id="otp"
                                    type="text"
                                    placeholder="123456"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    disabled={isLoading}
                                    maxLength={6}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => { setIsOtpSent(false); setIsLoading(false);}}>
                                    Edit Details
                                </Button>
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Verifying...' : 'Verify & Create Account'}
                            </Button>
                        </form>
                   )}
                    <div className="mt-4 text-center text-sm">
                        Already have an account?{" "}
                        <Link href="/login" className="underline font-medium text-primary">
                            Login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
