
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import type { Bet } from '@/lib/types';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface WinsLossesHistoryTableProps {
  type: 'Won' | 'Lost';
}

export function WinsLossesHistoryTable({ type }: WinsLossesHistoryTableProps) {
  const { user, loading: authLoading } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (user) {
      setIsLoading(true);
      const betsCol = collection(db, 'bets');
      const q = query(betsCol, where('userId', '==', user.uid), where('status', '==', type));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userBets = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
            } as Bet;
        });

        userBets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setBets(userBets);
        setIsLoading(false);
      }, (error) => {
          console.error(`Error fetching real-time ${type} bets: `, error);
          setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
      setBets([]);
      setIsLoading(false);
    }
  }, [user, authLoading, type]);

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

    if (bets.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
            You have no {type.toLowerCase()} bets.
          </TableCell>
        </TableRow>
      );
    }

    return bets.map((bet) => (
      <TableRow key={bet.id}>
        <TableCell className="font-medium">
          {type === 'Won' ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Win
              </Badge>
          ) : (
             <Badge variant="secondary" className="bg-red-100 text-red-800">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Loss
              </Badge>
          )}
        </TableCell>
        <TableCell>
            <div className={cn("font-semibold", type === 'Won' ? 'text-green-600' : 'text-red-600')}>
                INR {type === 'Won' ? bet.potentialWin.toFixed(2) : bet.amount.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">{bet.matchDescription}</div>
        </TableCell>
        <TableCell className="hidden text-right md:table-cell">
          {new Date(bet.timestamp).toLocaleString()}
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Amount & Match</TableHead>
          <TableHead className="hidden text-right md:table-cell">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {renderContent()}
      </TableBody>
    </Table>
  );
}
