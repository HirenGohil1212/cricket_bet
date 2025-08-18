
import { MatchTabs } from "@/components/matches/match-tabs";
import { HomePageClient } from "@/app/home-page-client";
import { getContent } from "@/app/actions/content.actions";
import type { AppSettings, ContentSettings, Sport } from "@/lib/types";
import { sports } from "@/lib/data";
import { TabsContent } from "@/components/ui/tabs";
import { Suspense } from "react";
import { SportMatchListLoader } from "@/components/matches/sport-match-list-loader";
import { SportMatchList } from "@/components/matches/sport-match-list";
import { getMatches } from "@/app/actions/match.actions";
import { getBettingSettings, getAppSettings } from "@/app/actions/settings.actions";

export const dynamic = 'force-dynamic';

async function MatchData({ sport }: { sport?: Sport }) {
  const [matches, settings] = await Promise.all([
    getMatches(),
    getBettingSettings()
  ]);
  
  const filteredMatches = sport ? matches.filter(m => m.sport === sport) : matches;

  const upcomingAndLiveMatches = filteredMatches.filter(
    (m) => (m.status === "Upcoming" || m.status === "Live")
  );

  const finishedMatches = filteredMatches.filter(
    (m) => m.status === "Finished"
  );
  
  // If a specific sport is selected, use its settings. Otherwise, default to Cricket for the "All" tab.
  const betOptionsForSport = sport ? settings.betOptions[sport] : settings.betOptions["Cricket"];

  return (
    <SportMatchList
      upcomingAndLiveMatches={upcomingAndLiveMatches}
      finishedMatches={finishedMatches}
      sport={sport}
      betOptions={betOptionsForSport}
    />
  )
}

export default async function Home() {
  const [content, appSettings] = await Promise.all([
    getContent(),
    getAppSettings()
  ]);
  
  return (
    <HomePageClient content={content} appSettings={appSettings}>
      <MatchTabs>
        <TabsContent key="All" value="All" className="mt-6">
          <Suspense fallback={<SportMatchListLoader />}>
            <MatchData />
          </Suspense>
        </TabsContent>
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
