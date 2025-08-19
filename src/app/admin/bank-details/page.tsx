
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BankAccountList } from "@/components/admin/bank-account-list";
import { getBankDetails } from "@/app/actions/settings.actions";
import { AddBankAccountForm } from "@/components/admin/add-bank-account-form";
import { Separator } from "@/components/ui/separator";
import type { BankAccount } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

function BankDetailsPageSkeleton() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
                    <CardDescription><Skeleton className="h-4 w-72" /></CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
            <Separator />
            <Card>
                <CardHeader>
                    <CardTitle><Skeleton className="h-6 w-40" /></CardTitle>
                    <CardDescription><Skeleton className="h-4 w-60" /></CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}

export default function BankDetailsPage() {
    const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const loadAccounts = async () => {
            setIsLoading(true);
            const accounts = await getBankDetails();
            setBankAccounts(accounts);
            setIsLoading(false);
        };
        loadAccounts();
    }, []);

    const handleAccountAdded = (newAccount: BankAccount) => {
        setBankAccounts(currentAccounts => [newAccount, ...currentAccounts]);
    };
    
    const handleAccountDeleted = (deletedAccountId: string) => {
        setBankAccounts(currentAccounts => currentAccounts.filter(acc => acc.id !== deletedAccountId));
    };

    if (isLoading) {
        return <BankDetailsPageSkeleton />;
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Add New Bank Account</CardTitle>
                    <CardDescription>
                        Add a new bank account or UPI detail for receiving payments.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AddBankAccountForm onAccountAdded={handleAccountAdded} />
                </CardContent>
            </Card>

            <Separator />
            
            <Card>
                <CardHeader>
                    <CardTitle>Saved Bank Accounts</CardTitle>
                    <CardDescription>
                       Manage your existing bank accounts.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <BankAccountList 
                        initialBankAccounts={bankAccounts} 
                        onAccountDeleted={handleAccountDeleted}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
