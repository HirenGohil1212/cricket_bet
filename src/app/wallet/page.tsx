import { HomePageClient } from "@/app/home-page-client";
import { getAppSettings, getBankDetails } from "@/app/actions/settings.actions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getContent }from "@/app/actions/content.actions";
import type { AppSettings, ContentSettings } from "@/lib/types";
import { WalletView } from "@/components/wallet/wallet-view";
import { WalletActions } from "@/components/wallet/wallet-actions";


export default async function WalletPage() {
    const [content, appSettings] = await Promise.all([
      getContent(),
      getAppSettings()
    ]);

    return (
        <HomePageClient content={content} appSettings={appSettings}>
            <div className="space-y-8">
                <Suspense fallback={<Skeleton className="h-[450px] w-full" />}>
                   <WalletActions />
                </Suspense>
            </div>
        </HomePageClient>
    );
}
