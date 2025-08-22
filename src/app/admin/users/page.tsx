

"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, QueryDocumentSnapshot, DocumentData, Timestamp, orderBy, query } from 'firebase/firestore';
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
import { Users, Loader2, Wrench, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReferredUsersDialog } from '@/components/admin/referred-users-dialog';
import { fixMissingSignupBonuses } from '@/app/actions/user.actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFixing, setIsFixing] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchAndProcessUsers() {
            setIsLoading(true);
            const usersCol = collection(db, 'users');
            const q = query(usersCol, orderBy('createdAt', 'desc'));
            const userSnapshot = await getDocs(q);
            const userList = userSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
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
                } as UserProfile;
            });

            // Corrected referral count logic
            const referralCounts = new Map<string, number>();
            userList.forEach(user => {
                if (user.referredBy) {
                    referralCounts.set(user.referredBy, (referralCounts.get(user.referredBy) || 0) + 1);
                }
            });

            const usersWithReferrals = userList.map(user => ({
                ...user,
                totalReferrals: referralCounts.get(user.uid) || 0,
            }));
            
            setUsers(usersWithReferrals);
            setIsLoading(false);
        }
        fetchAndProcessUsers();
    }, []);

    const handleViewReferrals = (user: UserProfile) => {
        if (user.totalReferrals > 0) {
            setSelectedUser(user);
            setIsDialogOpen(true);
        }
    }
    
    const handleFixBonuses = async () => {
        setIsFixing(true);
        const result = await fixMissingSignupBonuses();
        if (result.error) {
            toast({ variant: "destructive", title: "Error", description: result.error });
        } else {
            toast({ 
                title: "Process Complete", 
                description: result.success,
                action: result.count > 0 ? <Sparkles className="h-5 w-5 text-accent" /> : undefined,
            });
        }
        setIsFixing(false);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Users</CardTitle>
                            <CardDescription>A list of all the users in your app.</CardDescription>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" disabled={isFixing}>
                                    {isFixing ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Wrench className="mr-2 h-4 w-4" />
                                    )}
                                    Fix Missing Bonuses
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will scan for users who were referred but did not receive a signup bonus and award it to them. It is safe to run this multiple times.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleFixBonuses}>Confirm & Fix</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="hidden sm:table-cell">Phone Number</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Total Referrals</TableHead>
                                <TableHead className="text-right">Wallet Balance</TableHead>
                                <TableHead className="hidden md:table-cell">Referral Code</TableHead>
                                <TableHead className="hidden md:table-cell">Joined On</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : users.map((user) => (
                                <TableRow key={user.uid}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{user.phoneNumber}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="flex items-center gap-2 -ml-3" 
                                            onClick={() => handleViewReferrals(user)}
                                            disabled={!user.totalReferrals || user.totalReferrals === 0}
                                        >
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">{user.totalReferrals || 0}</span>
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-right">INR {user.walletBalance.toFixed(2)}</TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <Badge variant="outline">{user.referralCode}</Badge>
                                    </TableCell>
                                    <TableCell className="hidden whitespace-nowrap md:table-cell">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {selectedUser && (
                <ReferredUsersDialog 
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    referrer={selectedUser}
                />
            )}
        </>
    );
}
