
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import type { WithdrawalRequest } from '@/lib/types';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { subDays, startOfDay } from 'date-fns';

export function WithdrawalHistoryTable() {
  const { user, loading: authLoading } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (user) {
      setIsLoading(true);
      const withdrawalsCol = collection(db, 'withdrawals');
      const startDate = startOfDay(subDays(new Date(), 7));
      const startTimestamp = Timestamp.fromDate(startDate);
      const q = query(withdrawalsCol, where('userId', '==', user.uid), where('createdAt', '>=', startTimestamp));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userWithdrawals = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
            } as WithdrawalRequest;
        });

        userWithdrawals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setWithdrawals(userWithdrawals);
        setIsLoading(false);
      }, (error) => {
          console.error("Error fetching real-time withdrawals: ", error);
          setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
      setWithdrawals([]);
      setIsLoading(false);
    }
  }, [user, authLoading]);


  const getStatusClass = (status: WithdrawalRequest['status']) => {
    switch (status) {
      case 'Approved': return 'bg-green-500/80 text-white';
      case 'Rejected': return 'bg-red-500/80 text-white';
      case 'Processing': return 'bg-yellow-500/80 text-black';
      default: return 'bg-gray-500/80 text-white';
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-10 w-full" /></TableCell>
          <TableCell><Skeleton className="h-10 w-full" /></TableCell>
          <TableCell className="hidden md:table-cell"><Skeleton className="h-10 w-full" /></TableCell>
        </TableRow>
      ));
    }

    if (withdrawals.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
            No withdrawal requests found in the last 7 days.
          </TableCell>
        </TableRow>
      );
    }

    return withdrawals.map((withdrawal) => (
      <TableRow key={withdrawal.id}>
        <TableCell className="font-medium">
          <div>INR {withdrawal.amount.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(withdrawal.createdAt).toLocaleString()}
          </div>
        </TableCell>
        <TableCell>
            <Badge className={cn("text-xs font-semibold", getStatusClass(withdrawal.status))}>
                {withdrawal.status}
            </Badge>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {new Date(withdrawal.updatedAt).toLocaleString()}
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
