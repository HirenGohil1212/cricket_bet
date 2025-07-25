
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { 
    updateProfile, 
    RecaptchaVerifier, 
    signInWithPhoneNumber,
    EmailAuthProvider,
    linkWithCredential
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

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

export default function SignupPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'details' | 'otp'>('details');
    const [isLoading, setIsLoading] = useState(false);

    // Set up reCAPTCHA on component mount
    useEffect(() => {
        if (step === 'details' && !window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                }
            });
        }
    }, [step]);
    
    const handleRequestOtp = async (e: React.FormEvent) => {
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
        try {
            const formattedPhoneNumber = `+91${phoneNumber}`;
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, window.recaptchaVerifier);
            window.confirmationResult = confirmationResult;
            toast({ title: "OTP Sent", description: "Please check your phone for the OTP." });
            setStep('otp');
        } catch (error: any) {
            console.error("Error sending OTP: ", error);
            let description = "Please try again later.";
            if (error.code === 'auth/too-many-requests') {
                description = "Too many requests. Please try again later.";
            } else if (error.code === 'auth/invalid-phone-number') {
                description = "The phone number is not valid.";
            }
            toast({ variant: "destructive", title: "Failed to send OTP", description });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtpAndCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
             toast({ variant: "destructive", title: "Invalid OTP", description: "Please enter the 6-digit OTP." });
            return;
        }
        setIsLoading(true);
        try {
            // Confirm the OTP, this signs the user in via phone
            const phoneUserCredential = await window.confirmationResult.confirm(otp);
            const phoneUser = phoneUserCredential.user;

            // Create an email/password credential to link
            const email = `+91${phoneNumber}@guessandwin.app`;
            const emailPasswordCredential = EmailAuthProvider.credential(email, password);

            // Link the email/password credential to the phone-authed user
            await linkWithCredential(phoneUser, emailPasswordCredential);

            // Update the user's profile with their display name
            await updateProfile(phoneUser, { displayName: name });

            // Generate a simple referral code
            const ownReferralCode = `GUESSWIN${phoneUser.uid.substring(0, 6).toUpperCase()}`;

            // Check if a valid referral code was entered
            let referrerId: string | null = null;
            if (referralCode.trim()) {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('referralCode', '==', referralCode.trim().toUpperCase()));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    referrerId = querySnapshot.docs[0].id;
                    toast({ title: "Referral Applied!", description: "You and your friend will receive a bonus soon." });
                } else {
                    toast({ variant: "destructive", title: "Invalid Referral Code", description: "The code you entered was not found. You can continue without it." });
                }
            }
            
            // Save user data to Firestore
            await setDoc(doc(db, "users", phoneUser.uid), {
                uid: phoneUser.uid,
                name: name,
                phoneNumber: `+91${phoneNumber}`,
                createdAt: new Date(),
                walletBalance: 0,
                referralCode: ownReferralCode,
                role: 'user',
                bankAccount: null,
                isFirstBetPlaced: false,
                referralBonusAwarded: false,
                ...(referrerId && { referredBy: referrerId }), // Conditionally add referredBy
            });


            toast({ title: "Account Created!", description: "You have been successfully signed up." });
            router.push("/");

        } catch (error: any) {
            console.error("Error creating account: ", error);
            let description = "An error occurred. Please try again.";
            if (error.code === 'auth/invalid-verification-code') {
                description = "The OTP you entered is incorrect. Please try again.";
            } else if (error.code === 'auth/credential-already-in-use' || error.code === 'auth/email-already-in-use') {
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
                    {step === 'details' 
                        ? "Enter your details below to get started."
                        : "Enter the OTP sent to your mobile number."
                    }
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div id="recaptcha-container"></div>
                {step === 'details' ? (
                    <form onSubmit={handleRequestOtp} className="space-y-4">
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
                        <div className="space-y-2">
                            <Label htmlFor="referral">Referral Code (Optional)</Label>
                            <Input id="referral" placeholder="GUESSWIN123" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} disabled={isLoading} />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Sending OTP...' : 'Send OTP'}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtpAndCreateUser} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="otp">One-Time Password (OTP)</Label>
                            <Input id="otp" type="text" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} disabled={isLoading} maxLength={6} />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Creating Account...' : 'Verify & Create Account'}
                        </Button>
                        <Button variant="link" size="sm" className="w-full" onClick={() => setStep('details')} disabled={isLoading}>
                            Back to details
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
    );
}
