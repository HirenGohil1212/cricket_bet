

"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, QueryDocumentSnapshot, DocumentData, Timestamp, orderBy, query, where } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2, History, ArrowUp, ArrowDown, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReferredUsersDialog } from '@/components/admin/referred-users-dialog';
import { useToast } from '@/hooks/use-toast';
import { getTotalBetAmountForUser } from '@/app/actions/bet.actions';
import { BettingHistoryDialog } from '@/components/dashboard/betting-history-dialog';
import { getTotalDepositsForUser, getTotalWithdrawalsForUser } from '@/app/actions/wallet.actions';
import { getTotalWinningsForUser } from '@/app/actions/user.actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from "@/components/ui/input";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [isReferredUsersDialogOpen, setIsReferredUsersDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [historyUser, setHistoryUser] = useState<UserProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        async function fetchAndProcessUsers() {
            setIsLoading(true);
            const usersCol = collection(db, 'users');
            const q = query(usersCol, orderBy('createdAt', 'desc'));
            const userSnapshot = await getDocs(q);

            const userList: UserProfile[] = userSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
                const data = doc.data();
                return {
                    uid: doc.id,
                    name: data.name,
                    phoneNumber: data.phoneNumber,
                    walletBalance: data.walletBalance,
                    referralCode: data.referralCode,
                    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                    role: data.role || 'user',
                    referredBy: data.referredBy,
                    // Initialize financial fields, they will be populated below
                    totalDeposits: 0,
                    totalWithdrawals: 0,
                    totalBetSpend: 0,
                    totalWinnings: 0,
                } as UserProfile;
            });
            
            // Batch fetch all financial data
            const financialPromises = userList.map(user => Promise.all([
                getTotalDepositsForUser(user.uid),
                getTotalWithdrawalsForUser(user.uid),
                getTotalBetAmountForUser(user.uid),
                getTotalWinningsForUser(user.uid),
                getDocs(query(collection(db, 'users'), where('referredBy', '==', user.uid))).then(snap => snap.size)
            ]));

            const financialResults = await Promise.all(financialPromises);

            const usersWithData = userList.map((user, index) => ({
                ...user,
                totalDeposits: financialResults[index][0],
                totalWithdrawals: financialResults[index][1],
                totalBetSpend: financialResults[index][2],
                totalWinnings: financialResults[index][3],
                totalReferrals: financialResults[index][4],
            }));
            
            setUsers(usersWithData);
            setIsLoading(false);
        }
        fetchAndProcessUsers();
    }, []);
    
    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber.includes(searchTerm)
    );

    const handleViewReferrals = (user: UserProfile) => {
        if (user.totalReferrals && user.totalReferrals > 0) {
            setSelectedUser(user);
            setIsReferredUsersDialogOpen(true);
        }
    }

    const handleViewHistory = (user: UserProfile) => {
        setHistoryUser(user);
        setIsHistoryDialogOpen(true);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>User Accounts</CardTitle>
                            <CardDescription>A complete financial overview of all users.</CardDescription>
                        </div>
                         <Input 
                            placeholder="Search by name or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                         />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead className="text-right hidden md:table-cell">Deposits</TableHead>
                                <TableHead className="text-right hidden md:table-cell">Withdrawals</TableHead>
                                <TableHead className="text-right hidden lg:table-cell">Wagered</TableHead>
                                <TableHead className="text-right hidden lg:table-cell">Won</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                <TableRow key={user.uid}>
                                    <TableCell>
                                        <div className="font-medium">{user.name}</div>
                                        <div className="text-xs text-muted-foreground">{user.phoneNumber}</div>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        INR {user.walletBalance.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right hidden md:table-cell">
                                        <span className="text-green-600 flex items-center justify-end gap-1">
                                            <ArrowUp className="h-4 w-4" /> INR {user.totalDeposits?.toFixed(2)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right hidden md:table-cell">
                                        <span className="text-red-600 flex items-center justify-end gap-1">
                                            <ArrowDown className="h-4 w-4" /> INR {user.totalWithdrawals?.toFixed(2)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right hidden lg:table-cell">INR {user.totalBetSpend?.toFixed(2)}</TableCell>
                                    <TableCell className="text-right hidden lg:table-cell">
                                         <span className="text-indigo-600 flex items-center justify-end gap-1">
                                            <Trophy className="h-4 w-4" /> INR {user.totalWinnings?.toFixed(2)}
                                        </span>
                                    </TableCell>
                                     <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleViewHistory(user)}>
                                            <History className="h-4 w-4" />
                                            <span className="sr-only">View History</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No users found for your search.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {selectedUser && (
                <ReferredUsersDialog 
                    isOpen={isReferredUsersDialogOpen}
                    onClose={() => setIsReferredUsersDialogOpen(false)}
                    referrer={selectedUser}
                />
            )}
            {historyUser && (
                 <BettingHistoryDialog
                    open={isHistoryDialogOpen}
                    onOpenChange={setIsHistoryDialogOpen}
                    user={historyUser}
                />
            )}
        </>
    );
}
