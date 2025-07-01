
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import type { WithdrawalRequest } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { approveWithdrawal, rejectWithdrawal } from '@/app/actions/withdrawal.actions';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

interface ReviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    withdrawal: WithdrawalRequest;
}

export function WithdrawalReviewDialog({ isOpen, onClose, withdrawal }: ReviewDialogProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userBalance, setUserBalance] = useState<number | null>(null);
    const [isLoadingBalance, setIsLoadingBalance] = useState(true);

    useEffect(() => {
        if (isOpen && withdrawal.userId) {
            setIsLoadingBalance(true);
            const userRef = doc(db, 'users', withdrawal.userId);
            getDoc(userRef).then(userDoc => {
                if (userDoc.exists()) {
                    setUserBalance(userDoc.data().walletBalance ?? 0);
                } else {
                    setUserBalance(null); // User not found
                }
                setIsLoadingBalance(false);
            }).catch(error => {
                console.error("Error fetching user balance:", error);
                setIsLoadingBalance(false);
                setUserBalance(null);
            });
        }
    }, [isOpen, withdrawal.userId]);


    const handleApprove = async () => {
        setIsSubmitting(true);
        const result = await approveWithdrawal(withdrawal.id, withdrawal.userId, withdrawal.amount);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Approval Failed', description: result.error });
        } else {
            toast({ title: 'Success', description: result.success });
            router.refresh();
            onClose();
        }
        setIsSubmitting(false);
    };

    const handleReject = async () => {
        setIsSubmitting(true);
        const result = await rejectWithdrawal(withdrawal.id);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Rejection Failed', description: result.error });
        } else {
            toast({ title: 'Success', description: result.success });
            router.refresh();
            onClose();
        }
        setIsSubmitting(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Review Withdrawal from {withdrawal.userName}</DialogTitle>
                    <DialogDescription asChild>
                       <div className="space-y-1 pt-1">
                          <div>Requested Amount: <span className="font-bold">INR {withdrawal.amount.toFixed(2)}</span></div>
                          <div className="flex items-center gap-1.5">
                              <span>User's Current Balance:</span>
                              {isLoadingBalance ? (
                                  <Skeleton className="h-4 w-24" />
                              ) : (
                                  <span className="font-bold">
                                      INR {userBalance !== null ? userBalance.toFixed(2) : 'N/A'}
                                  </span>
                              )}
                          </div>
                       </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="text-base">User Bank Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                           <DetailRow label="Account Name" value={withdrawal.userBankAccount.accountHolderName} />
                           <DetailRow label="Account Number" value={withdrawal.userBankAccount.accountNumber} />
                           <DetailRow label="IFSC Code" value={withdrawal.userBankAccount.ifscCode} />
                           <DetailRow label="UPI ID" value={withdrawal.userBankAccount.upiId} />
                        </CardContent>
                     </Card>
                </div>
                <DialogFooter className="grid grid-cols-2 gap-2">
                    <Button variant="destructive" onClick={handleReject} disabled={isSubmitting}>
                        {isSubmitting ? 'Rejecting...' : 'Reject'}
                    </Button>
                    <Button onClick={handleApprove} disabled={isSubmitting}>
                        {isSubmitting ? 'Approving...' : 'Approve & Pay'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return (
        <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-medium text-right">{value}</span>
        </div>
    );
}
