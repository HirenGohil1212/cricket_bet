
import { HomePageClient } from "@/app/home-page-client";
import { getBankDetails, getAppSettings } from "@/app/actions/settings.actions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionHistory } from "@/components/wallet/transaction-history";
import { getContent } from "@/app/actions/content.actions";
import type { AppSettings, ContentSettings } from "@/lib/types";
import { WalletView } from "@/components/wallet/wallet-view";


export default async function WalletPage() {
    const [content, appSettings] = await Promise.all([
      getContent(),
      getAppSettings()
    ]);

    return (
        <HomePageClient content={content} appSettings={appSettings}>
            <div className="space-y-8">
                <Suspense fallback={<Skeleton className="h-[450px] w-full" />}>
                   <WalletActionsSection />
                </Suspense>
            </div>
        </HomePageClient>
    );
}

async function WalletActionsSection() {
    const bankAccounts = await getBankDetails();
    return <WalletView bankAccounts={bankAccounts} />
}
