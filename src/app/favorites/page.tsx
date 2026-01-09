
import { HomePageClient } from "@/app/home-page-client";
import { getContent } from "@/app/actions/content.actions";
import type { AppSettings, ContentSettings, Winner, Sport } from "@/lib/types";
import { Suspense } from "react";
import { SportMatchListLoader } from "@/components/matches/sport-match-list-loader";
import { SportMatchList } from "@/components/matches/sport-match-list";
import { getMatches } from "@/app/actions/match.actions";
import { getAppSettings } from "@/app/actions/settings.actions";
import { getWinnersForMatch } from "../actions/qna.actions";
import { subDays, startOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

async function FavoritesMatchData() {
  const allMatches = await getMatches();
  
  const upcomingAndLive = allMatches.filter(
    (m) => (m.status === "Upcoming" || m.status === "Live")
  );

  const sevenDaysAgo = startOfDay(subDays(new Date(), 7));
  const finished = allMatches.filter(
    (m) => {
        if (m.status !== "Finished") return false;
        const matchDate = new Date(m.startTime);
        return matchDate >= sevenDaysAgo;
    }
  ).reverse(); // Reverse to show most recent first
  
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

  return (
    <SportMatchList
      upcomingAndLiveMatches={upcomingAndLive}
      finishedMatches={augmentedFinishedMatches}
      isFavoritesPage={true}
    />
  );
}

export default async function FavoritesPage() {
  const [content, appSettings] = await Promise.all([
    getContent(),
    getAppSettings()
  ]);
  
  return (
    <HomePageClient content={content} appSettings={appSettings}>
      <h1 className="font-headline text-3xl font-bold mb-6">Favorite Matches</h1>
      <Suspense fallback={<SportMatchListLoader />}>
        <FavoritesMatchData />
      </Suspense>
    </HomePageClient>
  );
}
