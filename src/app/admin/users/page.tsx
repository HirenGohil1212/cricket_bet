

"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, QueryDocumentSnapshot, DocumentData, Timestamp, orderBy, query, where, onSnapshot } from 'firebase/firestore';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from '@/components/ui/badge';
import { Users, Loader2, History, ArrowUp, ArrowDown, Trophy, UserCog, MoreHorizontal, KeyRound, UserX, Trash2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BettingHistoryDialog } from '@/components/dashboard/betting-history-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from "@/components/ui/input";
import { ManagePermissionsDialog } from '@/components/admin/manage-permissions-dialog';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { toggleUserAccount, deleteUserAccount } from '@/app/actions/user.actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


export default function AdminUsersPage() {
    const { userProfile: adminProfile } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
    const [historyUser, setHistoryUser] = useState<UserProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        const usersCol = collection(db, 'users');
        const q = query(usersCol, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userList = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    uid: doc.id,
                    name: data.name,
                    phoneNumber: data.phoneNumber,
                    walletBalance: data.walletBalance,
                    referralCode: data.referralCode,
                    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                    role: data.role || 'user',
                    permissions: data.permissions || {},
                    referredBy: data.referredBy,
                    totalDeposits: data.totalDeposits || 0,
                    totalWithdrawals: data.totalWithdrawals || 0,
                    totalWagered: data.totalWagered || 0,
                    totalWinnings: data.totalWinnings || 0,
                    disabled: data.disabled || false,
                } as UserProfile;
            });

            setUsers(userList);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not load user data.'
            });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);
    
    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber.includes(searchTerm)
    );

    const handleViewHistory = (user: UserProfile) => {
        setHistoryUser(user);
        setIsHistoryDialogOpen(true);
    };

    const handleManagePermissions = (user: UserProfile) => {
        setSelectedUser(user);
        setIsPermissionsDialogOpen(true);
    };

    const handleToggleAccount = async (user: UserProfile) => {
        const result = await toggleUserAccount(user.uid, !user.disabled);
         if (result.error) {
            toast({ variant: 'destructive', title: 'Failed', description: result.error });
        } else {
            toast({ title: 'Success', description: `User account has been ${!user.disabled ? 'disabled' : 'enabled'}.` });
        }
    }
    
    const handleDeleteAccount = async (user: UserProfile) => {
        const result = await deleteUserAccount(user.uid);
         if (result.error) {
            toast({ variant: 'destructive', title: 'Failed', description: result.error });
        } else {
            toast({ title: 'Success', description: 'User account has been deleted.' });
        }
    }

    const getRoleBadge = (role: UserProfile['role']) => {
        const variants = {
            admin: 'default',
            'sub-admin': 'secondary',
            user: 'outline'
        } as const;
        return (
            <Badge variant={variants[role]} className="capitalize font-normal">
                {role.replace('-', ' ')}
            </Badge>
        )
    }

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
                                <TableHead className="hidden sm:table-cell">Role</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead className="text-right hidden lg:table-cell">Deposits</TableHead>
                                <TableHead className="text-right hidden lg:table-cell">Withdrawals</TableHead>
                                <TableHead className="text-right hidden xl:table-cell">Wagered</TableHead>
                                <TableHead className="text-right hidden xl:table-cell">Won</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                <TableRow key={user.uid} className={cn(user.role === 'admin' && 'bg-primary/10', user.disabled && 'bg-destructive/10 text-muted-foreground')}>
                                    <TableCell>
                                        <div className="font-medium">{user.name}</div>
                                        <div className="text-xs">{user.phoneNumber}</div>
                                         {user.disabled && <Badge variant="destructive" className="mt-1">Disabled</Badge>}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">{getRoleBadge(user.role)}</TableCell>
                                    <TableCell className="text-right font-semibold">
                                        INR {user.walletBalance.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right hidden lg:table-cell">
                                        <span className="text-green-600 flex items-center justify-end gap-1">
                                            <ArrowUp className="h-4 w-4" /> INR {user.totalDeposits?.toFixed(2)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right hidden lg:table-cell">
                                        <span className="text-red-600 flex items-center justify-end gap-1">
                                            <ArrowDown className="h-4 w-4" /> INR {user.totalWithdrawals?.toFixed(2)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right hidden xl:table-cell">INR {user.totalWagered?.toFixed(2)}</TableCell>
                                    <TableCell className="text-right hidden xl:table-cell">
                                         <span className="text-indigo-600 flex items-center justify-end gap-1">
                                            <Trophy className="h-4 w-4" /> INR {user.totalWinnings?.toFixed(2)}
                                        </span>
                                    </TableCell>
                                     <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">User Actions</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleViewHistory(user)}>
                                                    <History className="mr-2 h-4 w-4" /> View History
                                                </DropdownMenuItem>
                                                 {adminProfile?.role === 'admin' && adminProfile.uid !== user.uid && (
                                                    <DropdownMenuItem onClick={() => handleManagePermissions(user)}>
                                                        <UserCog className="mr-2 h-4 w-4" /> Manage Permissions
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} className={cn(user.disabled ? 'text-green-600 focus:text-green-600' : 'text-orange-600 focus:text-orange-600')}>
                                                            {user.disabled ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                                                            {user.disabled ? 'Enable Account' : 'Disable Account'}
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure you want to {user.disabled ? 'enable' : 'disable'} this account?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {user.disabled ? 'Enabling this account will allow the user to log in and use the app again.' : 'Disabling this account will prevent the user from logging in.'}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleToggleAccount(user)}>Confirm</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                                
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                         <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the user's account and all associated data from the system.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDeleteAccount(user)}>Delete Permanently</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                                
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        No users found for your search.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {selectedUser && (
                <ManagePermissionsDialog
                    user={selectedUser}
                    isOpen={isPermissionsDialogOpen}
                    onClose={() => setIsPermissionsDialogOpen(false)}
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



