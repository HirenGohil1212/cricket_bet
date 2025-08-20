

import { MatchTabs } from "@/components/matches/match-tabs";
import { HomePageClient } from "@/app/home-page-client";
import { getContent } from "@/app/actions/content.actions";
import type { AppSettings, ContentSettings, Sport, Winner, BetOption } from "@/lib/types";
import { sports } from "@/lib/data";
import { TabsContent } from "@/components/ui/tabs";
import { Suspense } from "react";
import { SportMatchListLoader } from "@/components/matches/sport-match-list-loader";
import { SportMatchList } from "@/components/matches/sport-match-list";
import { getMatches } from "@/app/actions/match.actions";
import { getBettingSettings, getAppSettings } from "@/app/actions/settings.actions";
import { getWinnersForMatch } from "./actions/qna.actions";

export const dynamic = 'force-dynamic';

async function MatchData({ sport }: { sport?: Sport }) {
  const [matches, settings] = await Promise.all([
    getMatches(),
    getBettingSettings()
  ]);
  
  const upcomingAndLive = matches.filter(
    (m) => (m.status === "Upcoming" || m.status === "Live")
  );

  const finished = matches.filter(
    (m) => m.status === "Finished"
  );
  
  // Fetch winners for all finished matches in parallel
  const winnersPromises = finished.map(match => getWinnersForMatch(match.id));
  const winnersResults = await Promise.all(winnersPromises);
  
  const winnersMap = new Map<string, Winner[]>();
  winnersResults.forEach((winners, index) => {
    if (winners.length > 0) {
      winnersMap.set(finished[index].id, winners);
    }
  });

  const augmentedFinishedMatches = finished.map(match => ({
    ...match,
    winners: winnersMap.get(match.id) || [],
  }));


  const filteredUpcomingAndLiveMatches = sport ? upcomingAndLive.filter(m => m.sport === sport) : upcomingAndLive;
  const filteredFinishedMatches = sport ? augmentedFinishedMatches.filter(m => m.sport === sport) : augmentedFinishedMatches;

  let betOptionsForSport: BetOption[];
  if (sport === 'Cricket') {
    // For cricket on the main page, we show the general bet options.
    // The specific options (one-sided, player) will be used in the GuessDialog.
    betOptionsForSport = settings.betOptions.Cricket.general;
  } else if (sport) {
    betOptionsForSport = settings.betOptions[sport];
  } else {
    // Default to Cricket's general options for the "All" tab.
    betOptionsForSport = settings.betOptions.Cricket.general;
  }


  return (
    <SportMatchList
      upcomingAndLiveMatches={filteredUpcomingAndLiveMatches}
      finishedMatches={filteredFinishedMatches}
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
