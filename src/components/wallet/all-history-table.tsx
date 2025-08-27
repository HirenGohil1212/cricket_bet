
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import type { Transaction, Bet, DepositRequest, WithdrawalRequest, Referral } from '@/lib/types';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, Gift, Clock } from 'lucide-react';

type CombinedHistoryItem = {
    id: string;
    type: 'Win' | 'Loss' | 'Deposit' | 'Withdrawal' | 'Bonus' | 'Pending Bonus';
    amount: number;
    description: string;
    date: Date;
};

export function AllHistoryTable() {
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<CombinedHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) {
      setIsLoading(!authLoading);
      return;
    }

    const collectionsToWatch = [
      { name: 'bets', typePrefix: '' },
      { name: 'deposits', typePrefix: 'Deposit' },
      { name: 'withdrawals', typePrefix: 'Withdrawal' },
      { name: 'transactions', typePrefix: 'Bonus' },
      { name: 'referrals', typePrefix: 'Pending Bonus'}
    ];

    const unsubscribes = collectionsToWatch.map(({ name, typePrefix }) => {
      let q;
      if (name === 'referrals') {
          q = query(collection(db, name), where('referrerId', '==', user.uid), where('status', '==', 'pending'));
      } else {
          q = query(collection(db, name), where('userId', '==', user.uid));
      }
      
      return onSnapshot(q, () => {
         // This is a bit inefficient as it refetches everything on any change,
         // but it's the simplest way to handle multi-collection real-time updates.
         fetchAllData();
      });
    });
    
    const fetchAllData = async () => {
        try {
            const betsQuery = query(collection(db, 'bets'), where('userId', '==', user.uid));
            const depositsQuery = query(collection(db, 'deposits'), where('userId', '==', user.uid));
            const withdrawalsQuery = query(collection(db, 'withdrawals'), where('userId', '==', user.uid));
            const bonusesQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('type', '==', 'referral_bonus'));
            const pendingQuery = query(collection(db, 'referrals'), where('referrerId', '==', user.uid), where('status', '==', 'pending'));

            const [betsSnap, depositsSnap, withdrawalsSnap, bonusesSnap, pendingSnap] = await Promise.all([
                onSnapshot(betsQuery, () => {}), // Use onSnapshot to get a promise that resolves on first fetch
                onSnapshot(depositsQuery, () => {}),
                onSnapshot(withdrawalsQuery, () => {}),
                onSnapshot(bonusesQuery, () => {}),
                onSnapshot(pendingQuery, () => {}),
            ]);

            const betsData = onSnapshot(betsQuery, snapshot => {
                return snapshot.docs.flatMap(doc => {
                    const data = doc.data() as Bet;
                    if (data.status === 'Won') {
                        return [{
                            id: doc.id + '-win',
                            type: 'Win',
                            amount: data.potentialWin,
                            description: `Won bet on ${data.matchDescription}`,
                            date: (data.timestamp as any).toDate()
                        } as CombinedHistoryItem];
                    }
                    if (data.status === 'Lost') {
                         return [{
                            id: doc.id + '-loss',
                            type: 'Loss',
                            amount: data.amount,
                            description: `Lost bet on ${data.matchDescription}`,
                            date: (data.timestamp as any).toDate()
                        } as CombinedHistoryItem];
                    }
                    return [];
                });
            });

            const depositsData = onSnapshot(depositsQuery, snapshot => snapshot.docs.map(doc => {
                const data = doc.data() as DepositRequest;
                return {
                    id: doc.id,
                    type: 'Deposit',
                    amount: data.amount,
                    description: `Deposit request (${data.status})`,
                    date: (data.createdAt as any).toDate(),
                } as CombinedHistoryItem;
            }));
            
            const withdrawalsData = onSnapshot(withdrawalsQuery, snapshot => snapshot.docs.map(doc => {
                const data = doc.data() as WithdrawalRequest;
                return {
                    id: doc.id,
                    type: 'Withdrawal',
                    amount: data.amount,
                    description: `Withdrawal request (${data.status})`,
                    date: (data.createdAt as any).toDate(),
                } as CombinedHistoryItem;
            }));

            const bonusesData = onSnapshot(bonusesQuery, snapshot => snapshot.docs.map(doc => {
                const data = doc.data() as Transaction;
                return {
                    id: doc.id,
                    type: 'Bonus',
                    amount: data.amount,
                    description: data.description,
                    date: (data.timestamp as any).toDate(),
                } as CombinedHistoryItem;
            }));

            const pendingData = onSnapshot(pendingQuery, snapshot => snapshot.docs.map(doc => {
                const data = doc.data() as Referral;
                return {
                    id: doc.id,
                    type: 'Pending Bonus',
                    amount: data.potentialBonus,
                    description: `For referring ${data.referredUserName}`,
                    date: (data.createdAt as any).toDate(),
                } as CombinedHistoryItem;
            }));

            const allData = [...betsData, ...depositsData, ...withdrawalsData, ...bonusesData, ...pendingData];
            allData.sort((a, b) => b.date.getTime() - a.date.getTime());
            setHistory(allData);

        } catch (error) {
            console.error("Failed to fetch all history:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchAllData();

    return () => unsubscribes.forEach(unsub => unsub());

  }, [user, authLoading]);

  const renderIconAndBadge = (item: CombinedHistoryItem) => {
    switch (item.type) {
      case 'Win': return <Badge variant="secondary" className="bg-green-100 text-green-800"><TrendingUp className="h-3 w-3 mr-1" />Win</Badge>;
      case 'Loss': return <Badge variant="secondary" className="bg-red-100 text-red-800"><TrendingDown className="h-3 w-3 mr-1" />Loss</Badge>;
      case 'Deposit': return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><ArrowUp className="h-3 w-3 mr-1" />Deposit</Badge>;
      case 'Withdrawal': return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><ArrowDown className="h-3 w-3 mr-1" />Withdrawal</Badge>;
      case 'Bonus': return <Badge variant="secondary" className="bg-purple-100 text-purple-800"><Gift className="h-3 w-3 mr-1" />Bonus</Badge>;
      case 'Pending Bonus': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default: return null;
    }
  };

   const renderAmount = (item: CombinedHistoryItem) => {
    const isCredit = ['Win', 'Deposit', 'Bonus'].includes(item.type);
    const isDebit = ['Loss', 'Withdrawal'].includes(item.type);
    
    if (item.type === 'Pending Bonus') {
        return <span className="font-semibold text-muted-foreground">INR {item.amount.toFixed(2)}</span>
    }
    
    return (
      <span className={cn("font-semibold", isCredit && "text-green-600", isDebit && "text-red-600")}>
        {isCredit ? '+' : isDebit ? '-' : ''} INR {item.amount.toFixed(2)}
      </span>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-10 w-full" /></TableCell>
          <TableCell><Skeleton className="h-10 w-full" /></TableCell>
          <TableCell className="hidden md:table-cell"><Skeleton className="h-10 w-full" /></TableCell>
        </TableRow>
      ));
    }

    if (history.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
            No transaction history found.
          </TableCell>
        </TableRow>
      );
    }

    return history.map((item) => (
      <TableRow key={item.id}>
        <TableCell>
          {renderIconAndBadge(item)}
        </TableCell>
        <TableCell>
          <div>{renderAmount(item)}</div>
          <div className="text-xs text-muted-foreground">{item.description}</div>
        </TableCell>
        <TableCell className="hidden text-right md:table-cell">
          {item.date.toLocaleString()}
        </TableCell>
      </TableRow>
    ));
  };


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Details</TableHead>
          <TableHead className="hidden text-right md:table-cell">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {renderContent()}
      </TableBody>
    </Table>
  );
}
