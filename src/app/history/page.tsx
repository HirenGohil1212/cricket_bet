
import { HomePageClient } from "@/app/home-page-client";
import { getContent } from "@/app/actions/content.actions";
import { getAppSettings } from "@/app/actions/settings.actions";
import { TransactionHistory } from "@/components/wallet/transaction-history";

export default async function HistoryPage() {
    const [content, appSettings] = await Promise.all([
      getContent(),
      getAppSettings()
    ]);

    return (
        <HomePageClient content={content} appSettings={appSettings}>
            <div className="space-y-8">
                <TransactionHistory />
            </div>
        </HomePageClient>
    );
}
