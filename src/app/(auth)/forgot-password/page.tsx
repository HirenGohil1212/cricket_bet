
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

// Make recaptchaVerifier accessible to component functions
declare global {
    interface Window {
        recaptchaVerifier: any;
        confirmationResult: any;
    }
}

export default function ForgotPasswordPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [step, setStep] = useState<'mobile' | 'otp' | 'success'>('mobile');
    const [isLoading, setIsLoading] = useState(false);
    
    // Set up reCAPTCHA on component mount
    useEffect(() => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                }
            });
        }
    }, []);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phoneNumber.length !== 10) {
            toast({ variant: "destructive", title: "Invalid Number", description: "Please enter a valid 10-digit mobile number." });
            return;
        }
        setIsLoading(true);
        try {
            const formattedPhoneNumber = `+91${phoneNumber}`;
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, window.recaptchaVerifier);
            window.confirmationResult = confirmationResult;
            toast({ title: "OTP Sent", description: "Please check your phone for the OTP." });
            setStep('otp');
        } catch (error) {
            console.error("Error sending OTP: ", error);
            toast({ variant: "destructive", title: "Failed to send OTP", description: "Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtpAndResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            toast({ variant: "destructive", title: "Invalid OTP", description: "Please enter the 6-digit OTP." });
            return;
        }
        if (newPassword.length < 6) {
            toast({ variant: "destructive", title: "Invalid Password", description: "Password must be at least 6 characters." });
            return;
        }
        setIsLoading(true);
        try {
            // Verify OTP, which signs the user in
            await window.confirmationResult.confirm(otp);
            
            // Now that the user is authenticated, update their password
            const user = auth.currentUser;
            if (!user) {
                throw new Error("User not found after OTP verification.");
            }
            await updatePassword(user, newPassword);
            
            toast({ title: "Password Reset Successful", description: "Please login with your new password." });
            setStep('success');
             // Log the user out after successful password reset
            await auth.signOut();
            router.push('/login');

        } catch (error) {
            console.error("Error resetting password: ", error);
            toast({ variant: "destructive", title: "Reset Failed", description: "Invalid OTP or an error occurred. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>Forgot Password</CardTitle>
                <CardDescription>
                    {step === 'mobile' && "Enter your mobile number to receive a reset OTP."}
                    {step === 'otp' && "Enter the OTP and your new password."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div id="recaptcha-container"></div>
                {step === 'mobile' && (
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
                )}

                {step === 'otp' && (
                    <form onSubmit={handleVerifyOtpAndResetPassword} className="space-y-6">
                         <div className="space-y-2">
                            <Label htmlFor="otp">One-Time Password (OTP)</Label>
                            <Input id="otp" type="text" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} disabled={isLoading} maxLength={6} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input id="new-password" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isLoading} />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </form>
                )}

                <div className="mt-4 text-center text-sm">
                    Remember your password?{" "}
                    <Link href="/login" className="underline font-medium text-primary">
                        Login
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
