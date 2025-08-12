
import { MatchTabs } from "@/components/matches/match-tabs";
import { HomePageClient } from "@/app/home-page-client";
import { getContent } from "@/app/actions/content.actions";
import type { ContentSettings, Sport } from "@/lib/types";
import { sports } from "@/lib/data";
import { TabsContent } from "@/components/ui/tabs";
import { Suspense } from "react";
import { SportMatchListLoader } from "@/components/matches/sport-match-list-loader";
import { SportMatchList } from "@/components/matches/sport-match-list";
import { getMatches } from "@/app/actions/match.actions";
import { getBettingSettings } from "@/app/actions/settings.actions";
import { FinishedMatchesList } from "@/components/matches/finished-matches-list";

export const dynamic = 'force-dynamic';

async function MatchData({ sport }: { sport: Sport }) {
  const [matches, settings] = await Promise.all([
    getMatches(),
    getBettingSettings()
  ]);

  const upcomingAndLiveMatches = matches.filter(
    (m) => m.sport === sport && (m.status === "Upcoming" || m.status === "Live")
  );

  const finishedMatches = matches.filter(
    (m) => m.sport === sport && m.status === "Finished"
  );

  return (
    <>
      <SportMatchList
        upcomingAndLiveMatches={upcomingAndLiveMatches}
        finishedMatches={finishedMatches}
        sport={sport}
        betOptions={settings.betOptions}
      />
    </>
  )
}

export default async function Home() {
  const content: ContentSettings | null = await getContent();
  
  return (
    <HomePageClient content={content}>
      <MatchTabs>
        {sports.map((sport) => (
          <TabsContent key={sport} value={sport} className="mt-6">
            <Suspense fallback={<SportMatchListLoader />}>
              <MatchData sport={sport} />
            </Suspense>
          </TabsContent>
        ))}
      </MatchTabs>
    </HomePageClient>
  );
}
