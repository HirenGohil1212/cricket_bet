"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
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

export default function LoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const setupRecaptcha = () => {
        if (window.recaptchaVerifier) return;
        try {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => {
                    // reCAPTCHA solved
                }
            });
        } catch (error) {
            console.error("Recaptcha Verifier error", error)
        }
    };

    useEffect(() => {
        setupRecaptcha();
    }, []);


    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
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
            toast({ variant: "destructive", title: "Error", description: "Could not send OTP. Please try again later." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
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
            await window.confirmationResult.confirm(otp);
            toast({ title: "Login Successful", description: "Welcome back!" });
            router.push("/");
        } catch (error) {
            console.error("Error verifying OTP: ", error);
            toast({ variant: "destructive", title: "Login Failed", description: "Invalid OTP. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div id="recaptcha-container"></div>
            <Card>
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                    <CardDescription>
                        {isOtpSent ? 'Enter the OTP sent to your mobile.' : 'Enter your mobile number to login.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!isOtpSent ? (
                        <form onSubmit={handleSendOtp} className="space-y-6">
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
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
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
                                    Change Number
                                </Button>
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Verifying...' : 'Verify OTP & Login'}
                            </Button>
                        </form>
                    )}
                    <div className="mt-4 text-center text-sm">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="underline font-medium text-primary">
                            Sign up
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
