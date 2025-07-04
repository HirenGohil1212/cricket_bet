import { MatchTabs } from "@/components/matches/match-tabs";
import { HomePageClient } from "@/app/home-page-client";
import { getContent } from "@/app/actions/content.actions";
import type { ContentSettings } from "@/lib/types";
import { sports } from "@/lib/types";
import { TabsContent } from "@/components/ui/tabs";
import { Suspense } from "react";
import { SportMatchListLoader } from "@/components/matches/sport-match-list-loader";
import { SportMatchList } from "@/components/matches/sport-match-list";

export default async function Home() {
  const content: ContentSettings | null = await getContent();
  
  return (
    <HomePageClient content={content}>
      <MatchTabs>
        {sports.map((sport) => (
          <TabsContent key={sport} value={sport} className="mt-6">
            <Suspense fallback={<SportMatchListLoader />}>
              <SportMatchList sport={sport} />
            </Suspense>
          </TabsContent>
        ))}
      </MatchTabs>
    </HomePageClient>
  );
}
