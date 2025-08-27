
import { HomePageClient } from "@/app/home-page-client";
import { getContent } from "@/app/actions/content.actions";
import { getAppSettings } from "@/app/actions/settings.actions";
import { GameHistoryList } from "@/components/game-history/game-history-list";

export default async function GameHistoryPage() {
    const [content, appSettings] = await Promise.all([
      getContent(),
      getAppSettings()
    ]);

    return (
        <HomePageClient content={content} appSettings={appSettings}>
            <div className="space-y-8">
                <GameHistoryList />
            </div>
        </HomePageClient>
    );
}
