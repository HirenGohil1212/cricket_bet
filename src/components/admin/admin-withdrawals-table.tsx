
"use client";

import React, { useState } from 'react';
import type { WithdrawalRequest } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { WithdrawalReviewDialog } from './withdrawal-review-dialog';

interface AdminWithdrawalsTableProps {
    withdrawals: WithdrawalRequest[];
}

export function AdminWithdrawalsTable({ withdrawals }: AdminWithdrawalsTableProps) {
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    const handleReview = (withdrawal: WithdrawalRequest) => {
        setSelectedWithdrawal(withdrawal);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setSelectedWithdrawal(null);
    }
    
    const getStatusClass = (status: WithdrawalRequest['status']) => {
        switch (status) {
          case 'Completed': return 'bg-green-500/80 text-white';
          case 'Failed': return 'bg-red-500/80 text-white';
          case 'Pending': return 'bg-yellow-500/80 text-black';
          default: return 'bg-gray-500/80 text-white';
        }
    };

    if (withdrawals.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-12 border rounded-md mt-4">
                <p>No withdrawal requests in this category.</p>
            </div>
        );
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {withdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                            <TableCell className="font-medium">{withdrawal.userName}</TableCell>
                            <TableCell className="text-right">INR {withdrawal.amount.toFixed(2)}</TableCell>
                            <TableCell className="hidden md:table-cell">{new Date(withdrawal.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                                <Badge className={cn("text-xs font-semibold", getStatusClass(withdrawal.status))}>
                                    {withdrawal.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {withdrawal.status === 'Pending' ? (
                                    <Button size="sm" onClick={() => handleReview(withdrawal)}>Review</Button>
                                ) : (
                                     <Button size="sm" variant="outline" disabled>Reviewed</Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {selectedWithdrawal && (
                <WithdrawalReviewDialog
                    isOpen={isDialogOpen}
                    onClose={handleCloseDialog}
                    withdrawal={selectedWithdrawal}
                />
            )}
        </>
    );
}
