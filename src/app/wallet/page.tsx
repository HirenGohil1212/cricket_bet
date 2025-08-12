
import { HomePageClient } from "@/app/home-page-client";
import { getBankDetails } from "@/app/actions/settings.actions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionHistory } from "@/components/wallet/transaction-history";
import { getContent } from "@/app/actions/content.actions";
import type { ContentSettings } from "@/lib/types";
import { WalletView } from "@/components/wallet/wallet-view";


export default async function WalletPage() {
    const content: ContentSettings | null = await getContent();

    return (
        <HomePageClient content={content}>
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
    const bankAccounts = await getBankDetails();
    return <WalletView bankAccounts={bankAccounts} />
}
