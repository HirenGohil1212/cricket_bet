import { HomePageClient } from "@/app/home-page-client";
import { getBankDetails } from "@/app/actions/settings.actions";
import { AddFundsCard } from "@/components/wallet/add-funds-card";
import { DepositHistoryTable } from "@/components/wallet/deposit-history-table";
import { auth } from "@/lib/firebase";
import { getUserDeposits } from "../actions/wallet.actions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WalletPage() {
    return (
        <HomePageClient>
            <div className="space-y-8">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                   <AddFundsSection />
                </Suspense>
                <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                   <DepositHistorySection />
                </Suspense>
            </div>
        </HomePageClient>
    );
}

async function AddFundsSection() {
    const bankAccounts = await getBankDetails();
    return <AddFundsCard bankAccounts={bankAccounts} />
}

async function DepositHistorySection() {
    // This is a server component, but auth state is needed.
    // We get the current user on the server if possible for the initial load.
    const user = auth.currentUser;
    const deposits = user ? await getUserDeposits(user.uid) : [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Deposit History</CardTitle>
            </CardHeader>
            <CardContent>
                <DepositHistoryTable initialDeposits={deposits} />
            </CardContent>
        </Card>
    );
}
