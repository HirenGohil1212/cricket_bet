
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import type { Transaction } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getBonusTransactions } from '@/app/actions/referral.actions';
import { Gift } from 'lucide-react';

export function BonusHistoryTable() {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTransactions() {
        if (authLoading) {
            setIsLoading(true);
            return;
        }

        if (user) {
            setIsLoading(true);
            const userTransactions = await getBonusTransactions(user.uid);
            setTransactions(userTransactions);
            setIsLoading(false);
        } else {
            setTransactions([]);
            setIsLoading(false);
        }
    }
    fetchTransactions();
  }, [user, authLoading]);
  
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

    if (transactions.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
            You haven't received any bonuses yet.
          </TableCell>
        </TableRow>
      );
    }

    return transactions.map((tx) => (
      <TableRow key={tx.id}>
        <TableCell className="font-medium">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Gift className="h-3 w-3 mr-1" />
                Bonus
            </Badge>
        </TableCell>
        <TableCell>
          <div className="font-semibold">INR {tx.amount.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">{tx.description}</div>
        </TableCell>
        <TableCell className="hidden text-right md:table-cell">
          {new Date(tx.timestamp).toLocaleString()}
        </TableCell>
      </TableRow>
    ));
  };


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Amount & Description</TableHead>
          <TableHead className="hidden text-right md:table-cell">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {renderContent()}
      </TableBody>
    </Table>
  );
}
