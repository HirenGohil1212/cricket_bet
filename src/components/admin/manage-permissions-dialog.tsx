
'use client';

import React, { useState, useEffect } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { type UserProfile, type UserRole, type UserPermissions } from '@/lib/types';
import { updateUserRoleAndPermissions } from '@/app/actions/user.actions';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '../ui/select';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { Separator } from '../ui/separator';

interface ManagePermissionsDialogProps {
    user: UserProfile;
    isOpen: boolean;
    onClose: () => void;
}

const allPermissions: { key: keyof UserPermissions, label: string, description: string }[] = [
    { key: 'canManageDashboard', label: 'Manage Dashboard', description: 'View the main dashboard.' },
    { key: 'canManageControlPanel', label: 'Manage Control Panel', description: 'Access real-time match controls.' },
    { key: 'canManageUsers', label: 'Manage Users', description: 'View user data.' },
    { key: 'canManageMatches', label: 'Manage Matches', description: 'Create, edit, and delete matches.' },
    { key: 'canManagePlayers', label: 'Manage Players', description: 'Add or remove players.' },
    { key: 'canManageDummyUsers', label: 'Manage Dummy Users', description: 'Create and manage house accounts.' },
    { key: 'canManageResults', label: 'Manage Results', description: 'Enter match results and settle bets.' },
    { key: 'canManageDeposits', label: 'Manage Deposits', description: 'Approve or reject deposits.' },
    { key: 'canManageWithdrawals', label: 'Manage Withdrawals', description: 'Approve or reject withdrawals.' },
    { key: 'canViewFinancials', label: 'View Financials', description: 'Access financial reports.' },
    { key: 'canManageReferrals', label: 'Manage Referrals', description: 'Configure referral settings.' },
    { key: 'canManageBettingSettings', label: 'Manage Betting Settings', description: 'Change bet amounts.' },
    { key: 'canManageBankDetails', label: 'Manage Bank Details', description: 'Manage company bank accounts.' },
    { key: 'canManageContent', label: 'Manage Content', description: 'Update promo content.' },
    { key: 'canManageDataManagement', label: 'Manage Data Management', description: 'Access data deletion tools.' },
    { key: 'canManageSupport', label: 'Manage Support', description: 'Change support number.' },
    { key: 'canManagePermissions', label: 'Manage Permissions', description: 'Grant or revoke permissions for other users.' }
];

export function ManagePermissionsDialog({ user, isOpen, onClose }: ManagePermissionsDialogProps) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
    const [permissions, setPermissions] = useState<Partial<UserPermissions>>(user.permissions || {});

    useEffect(() => {
        setSelectedRole(user.role);
        setPermissions(user.permissions || {});
    }, [user]);

    const handlePermissionChange = (key: keyof UserPermissions, value: boolean) => {
        setPermissions(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateUserRoleAndPermissions(user.uid, selectedRole, permissions);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
            toast({ title: 'Success', description: result.success });
            onClose();
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Permissions for {user.name}</DialogTitle>
                    <DialogDescription>
                        Assign a role and set specific permissions for this user.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="role-select">User Role</Label>
                        <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                            <SelectTrigger id="role-select">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="sub-admin">Sub-Admin</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedRole === 'sub-admin' && (
                        <div>
                            <Separator className="my-4" />
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Sub-Admin Permissions</h3>
                             <ScrollArea className="h-64 rounded-md border p-4">
                                <div className="space-y-4">
                                    {allPermissions.map(({ key, label, description }) => (
                                        <div key={key} className="flex items-start justify-between space-x-2">
                                            <div className="flex flex-col space-y-1">
                                                <Label htmlFor={key} className="font-normal">{label}</Label>
                                                <p className="text-xs text-muted-foreground">{description}</p>
                                            </div>
                                            <Switch
                                                id={key}
                                                checked={permissions[key] || false}
                                                onCheckedChange={(checked) => handlePermissionChange(key, checked)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
