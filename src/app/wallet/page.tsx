import { HomePageClient } from "@/app/home-page-client";
import { getBankDetails } from "@/app/actions/settings.actions";
import { AddFundsCard } from "@/components/wallet/add-funds-card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionHistory } from "@/components/wallet/transaction-history";

export default function WalletPage() {
    return (
        <HomePageClient>
            <div className="space-y-8">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                   <AddFundsSection />
                </Suspense>
                <TransactionHistory />
            </div>
        </HomePageClient>
    );
}

async function AddFundsSection() {
    const bankAccounts = await getBankDetails();
    return <AddFundsCard bankAccounts={bankAccounts} />
}
