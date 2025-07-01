
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import type { DepositRequest } from '@/lib/types';
import { getUserDeposits } from '@/app/actions/wallet.actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function DepositHistoryTable() {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
        setIsLoading(true);
        getUserDeposits(user.uid).then(userDeposits => {
            setDeposits(userDeposits);
            setIsLoading(false);
        });
    } else {
        // This case can be hit if the auth state is still loading or user is logged out.
        // We ensure the table is empty and not in a loading state.
        setDeposits([]);
        setIsLoading(false);
    }
  }, [user]);

  const getStatusClass = (status: DepositRequest['status']) => {
    switch (status) {
      case 'Completed': return 'bg-green-500/80 text-white';
      case 'Failed': return 'bg-red-500/80 text-white';
      case 'Pending': return 'bg-yellow-500/80 text-black';
      default: return 'bg-gray-500/80 text-white';
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell>
        </TableRow>
      ));
    }

    if (deposits.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
            You haven't made any deposits yet.
          </TableCell>
        </TableRow>
      );
    }

    return deposits.map((deposit) => (
      <TableRow key={deposit.id}>
        <TableCell className="font-medium">
          <div>INR {deposit.amount.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(deposit.createdAt).toLocaleString()}
          </div>
        </TableCell>
        <TableCell>
            <Badge className={cn("text-xs font-semibold", getStatusClass(deposit.status))}>
                {deposit.status}
            </Badge>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {new Date(deposit.updatedAt).toLocaleString()}
        </TableCell>
      </TableRow>
    ));
  };


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Amount & Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Last Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {renderContent()}
      </TableBody>
    </Table>
  );
}
