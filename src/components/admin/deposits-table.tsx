
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import type { DepositRequest } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { approveDeposit, rejectDeposit } from '@/app/actions/wallet.actions';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

interface DepositsTableProps {
    deposits: DepositRequest[];
}

export function DepositsTable({ deposits }: DepositsTableProps) {
    const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    const handleReview = (deposit: DepositRequest) => {
        setSelectedDeposit(deposit);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setSelectedDeposit(null);
    }
    
    const getStatusClass = (status: DepositRequest['status']) => {
        switch (status) {
          case 'Approved': return 'bg-green-500/80 text-white';
          case 'Rejected': return 'bg-red-500/80 text-white';
          case 'Processing': return 'bg-yellow-500/80 text-black';
          default: return 'bg-gray-500/80 text-white';
        }
    };


    if (deposits.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-12 border rounded-md mt-4">
                <p>No deposit requests in this category.</p>
            </div>
        );
    }

    return (
        <>
            {/* Mobile View: List of Cards */}
            <div className="md:hidden space-y-4">
                {deposits.map((deposit) => (
                    <div key={deposit.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="font-medium">{deposit.userName}</div>
                            <Badge className={cn("text-xs font-semibold", getStatusClass(deposit.status))}>
                                {deposit.status}
                            </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Amount: <span className="font-semibold text-foreground">INR {deposit.amount.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {new Date(deposit.createdAt).toLocaleString()}
                        </div>
                        <div className="pt-3 mt-3 border-t">
                             {deposit.status === 'Processing' ? (
                                <Button size="sm" onClick={() => handleReview(deposit)} className="w-full">Review</Button>
                            ) : (
                                 <Button size="sm" variant="outline" onClick={() => handleReview(deposit)} className="w-full">View</Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <Table className="hidden md:table">
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {deposits.map((deposit) => (
                        <TableRow key={deposit.id}>
                            <TableCell className="font-medium">{deposit.userName}</TableCell>
                            <TableCell className="text-right">INR {deposit.amount.toFixed(2)}</TableCell>
                            <TableCell>{new Date(deposit.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                                <Badge className={cn("text-xs font-semibold", getStatusClass(deposit.status))}>
                                    {deposit.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {deposit.status === 'Processing' ? (
                                    <Button size="sm" onClick={() => handleReview(deposit)}>Review</Button>
                                ) : (
                                     <Button size="sm" variant="outline" onClick={() => handleReview(deposit)}>View</Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {selectedDeposit && (
                <ReviewDialog
                    isOpen={isDialogOpen}
                    onClose={handleCloseDialog}
                    deposit={selectedDeposit}
                />
            )}
        </>
    );
}


interface ReviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    deposit: DepositRequest;
}

function ReviewDialog({ isOpen, onClose, deposit }: ReviewDialogProps) {
    const { toast } = useToast();
    const router = useRouter();
    const { userProfile } = useAuth();
    const [amount, setAmount] = useState(deposit.amount);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isAdmin = userProfile?.role === 'admin';
    const hasPermission = isAdmin || (userProfile?.role === 'sub-admin' && userProfile?.permissions?.canManageDeposits);
    const isProcessing = deposit.status === 'Processing';

    const handleApprove = async () => {
        if (!hasPermission || !isProcessing) {
            toast({ variant: 'destructive', title: 'Permission Denied' });
            return;
        }
        setIsSubmitting(true);
        const result = await approveDeposit(deposit.id, deposit.userId, Number(amount));
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
        if (!hasPermission || !isProcessing) {
            toast({ variant: 'destructive', title: 'Permission Denied' });
            return;
        }
        setIsSubmitting(true);
        const result = await rejectDeposit(deposit.id);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Rejection Failed', description: result.error });
        } else {
            toast({ title: 'Success', description: result.success });
            router.refresh();
            onClose();
        }
        setIsSubmitting(false);
    }
    
    // Reset amount when deposit changes
    React.useEffect(() => {
        setAmount(deposit.amount);
    }, [deposit]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Review Deposit from {deposit.userName}</DialogTitle>
                    <DialogDescription>
                        {isProcessing ? 'Verify the payment screenshot and approve or reject the request.' : 'Viewing details for a completed deposit.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {deposit.screenshotUrl ? (
                        <div className="flex justify-center">
                            <a href={deposit.screenshotUrl} target="_blank" rel="noopener noreferrer" title="View full screenshot">
                               <Image src={deposit.screenshotUrl} alt="Payment Screenshot" width={300} height={400} className="rounded-md border object-contain max-h-64" />
                            </a>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground p-4 bg-muted rounded-md">
                            No screenshot was provided for this deposit.
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Deposit Amount (INR)</Label>
                        <Input 
                            id="amount" 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            disabled={!isProcessing}
                        />
                    </div>
                </div>
                {isProcessing ? (
                    <DialogFooter className="grid grid-cols-2 gap-2">
                        <Button variant="destructive" onClick={handleReject} disabled={isSubmitting || !hasPermission}>
                            {isSubmitting ? 'Rejecting...' : 'Reject'}
                        </Button>
                        <Button onClick={handleApprove} disabled={isSubmitting || !hasPermission}>
                            {isSubmitting ? 'Approving...' : 'Approve'}
                        </Button>
                    </DialogFooter>
                ) : (
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
