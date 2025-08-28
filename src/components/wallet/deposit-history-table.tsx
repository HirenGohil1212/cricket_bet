
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import type { DepositRequest } from '@/lib/types';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { subDays, startOfDay } from 'date-fns';

export function DepositHistoryTable() {
  const { user, loading: authLoading } = useAuth();
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (user) {
      setIsLoading(true);
      const depositsCol = collection(db, 'deposits');
      const q = query(depositsCol, where('userId', '==', user.uid));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userDeposits = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
            } as DepositRequest;
        });

        // Sort on the client-side to ensure newest are first
        userDeposits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setDeposits(userDeposits);
        setIsLoading(false);
      }, (error) => {
          console.error("Error fetching real-time deposits: ", error);
          setIsLoading(false);
      });

      // Cleanup subscription on component unmount
      return () => unsubscribe();
    } else {
      setDeposits([]);
      setIsLoading(false);
    }
  }, [user, authLoading]);


  const getStatusClass = (status: DepositRequest['status']) => {
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

    if (deposits.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
            No deposits found.
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
