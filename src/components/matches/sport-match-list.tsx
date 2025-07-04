import { getMatches } from "@/app/actions/match.actions";
import { getBettingSettings } from "@/app/actions/settings.actions";
import type { Sport } from "@/lib/types";
import { MatchList } from "./match-list";
import { Suspense } from "react";
import { FinishedMatchesList } from "./finished-matches-list";
import { FinishedMatchesLoader } from "./finished-matches-loader";

interface SportMatchListProps {
  sport: Sport;
}

export async function SportMatchList({ sport }: SportMatchListProps) {
  const [allMatches, settings] = await Promise.all([
    getMatches(),
    getBettingSettings(),
  ]);

  const upcomingAndLiveMatches = allMatches.filter(
    (m) => m.sport === sport && (m.status === "Upcoming" || m.status === "Live")
  );

  const finishedMatches = allMatches.filter(
    (m) => m.sport === sport && m.status === "Finished"
  );
  
  const noMatchesExist = upcomingAndLiveMatches.length === 0 && finishedMatches.length === 0;

  return (
    <div className="space-y-8">
      {/* This renders upcoming and live matches almost instantly */}
      <MatchList
        matches={upcomingAndLiveMatches}
        sport={sport}
        betOptions={settings.betOptions}
      />

      {/* This section is deferred, preventing it from blocking the initial render */}
      {finishedMatches.length > 0 && (
        <Suspense fallback={<FinishedMatchesLoader />}>
          <FinishedMatchesList
            matches={finishedMatches}
            betOptions={settings.betOptions}
          />
        </Suspense>
      )}
      
      {noMatchesExist && (
        <div className="text-center text-muted-foreground py-20 rounded-lg border border-dashed">
            <p className="text-lg font-semibold">No matches found for {sport}.</p>
            <p className="text-sm">Check back later for updates!</p>
        </div>
      )}
    </div>
  );
}
