
'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { getReferredUsers } from '@/app/actions/user.actions';

interface ReferredUsersDialogProps {
    isOpen: boolean;
    onClose: () => void;
    referrer: UserProfile;
}

export function ReferredUsersDialog({ isOpen, onClose, referrer }: ReferredUsersDialogProps) {
    const [referredUsers, setReferredUsers] = React.useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    
    React.useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getReferredUsers(referrer.uid)
                .then(users => {
                    setReferredUsers(users);
                    setIsLoading(false);
                })
                .catch(error => {
                    console.error("Failed to fetch referred users:", error);
                    setIsLoading(false);
                });
        }
    }, [isOpen, referrer.uid]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Users Referred by {referrer.name}</DialogTitle>
                    <DialogDescription>
                        This is a list of all users who signed up using the referral code <span className="font-semibold">{referrer.referralCode}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    <ScrollArea className="h-72 border rounded-md">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : referredUsers.length > 0 ? (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Referred User</TableHead>
                                        <TableHead>Phone Number</TableHead>
                                        <TableHead className="text-right">Joined On</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {referredUsers.map((user) => (
                                        <TableRow key={user.uid}>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell>{user.phoneNumber}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                                <p>No referred users found.</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>
                <DialogFooter className="mt-6">
                     <Button onClick={onClose}>Close</Button>
               </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
