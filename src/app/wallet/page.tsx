
import { HomePageClient } from "@/app/home-page-client";
import { getBankDetails } from "@/app/actions/settings.actions";
import { AddFundsCard } from "@/components/wallet/add-funds-card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionHistory } from "@/components/wallet/transaction-history";
import { WithdrawFundsCard } from "@/components/wallet/withdraw-funds-card";


export default function WalletPage() {
    return (
        <HomePageClient>
            <div className="space-y-8">
                <Suspense fallback={<Skeleton className="h-[450px] w-full" />}>
                   <WalletActionsSection />
                </Suspense>
                <TransactionHistory />
            </div>
        </HomePageClient>
    );
}

async function WalletActionsSection() {
    // Fetch data on the server to pass down to client components
    const bankAccounts = await getBankDetails();

    return (
        <div className="grid md:grid-cols-2 gap-8">
            <AddFundsCard bankAccounts={bankAccounts} />
            <WithdrawFundsCard />
        </div>
    )
}
