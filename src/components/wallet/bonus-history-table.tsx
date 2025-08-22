
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import type { Transaction, Referral } from '@/lib/types';
import { getBonusTransactions, getPendingReferrals } from '@/app/actions/referral.actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, Clock } from 'lucide-react';

export function BonusHistoryTable() {
  const { user, loading: authLoading } = useAuth();
  const [completedBonuses, setCompletedBonuses] = useState<Transaction[]>([]);
  const [pendingBonuses, setPendingBonuses] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This function will be called to fetch data.
    const fetchBonuses = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        // Fetch both completed and pending bonuses in parallel.
        const [completed, pending] = await Promise.all([
          getBonusTransactions(user.uid),
          getPendingReferrals(user.uid)
        ]);
        setCompletedBonuses(completed);
        setPendingBonuses(pending);
      } catch (error) {
        console.error("Failed to fetch bonus history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // If auth is not loading, fetch the bonuses.
    if (!authLoading) {
      fetchBonuses();
    }
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

    if (completedBonuses.length === 0 && pendingBonuses.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
            You haven't received any bonuses yet.
          </TableCell>
        </TableRow>
      );
    }

    return (
      <>
        {/* Pending Bonuses */}
        {pendingBonuses.map((referral) => (
          <TableRow key={referral.id}>
            <TableCell className="font-medium">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                </Badge>
            </TableCell>
            <TableCell>
              <div className="font-semibold">INR {referral.potentialBonus.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">For referring {referral.referredUserName}</div>
            </TableCell>
            <TableCell className="hidden text-right md:table-cell">
              {new Date(referral.createdAt).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      
        {/* Completed Bonuses */}
        {completedBonuses.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell className="font-medium">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Gift className="h-3 w-3 mr-1" />
                    Credited
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
        ))}
      </>
    );
  };


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
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
