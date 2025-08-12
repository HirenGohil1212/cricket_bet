
'use client';

import { getMatches } from "@/app/actions/match.actions";
import { getBettingSettings } from "@/app/actions/settings.actions";
import type { Sport } from "@/lib/types";
import { MatchList } from "./match-list";
import { Suspense, useState, useEffect } from "react";
import { FinishedMatchesList } from "./finished-matches-list";
import { FinishedMatchesLoader } from "./finished-matches-loader";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SportMatchListProps {
  sport: Sport;
}

export function SportMatchList({ sport }: SportMatchListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  // We manage the matches in state to provide a more responsive filtering experience
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ betOptions: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
        getMatches(),
        getBettingSettings(),
    ]).then(([matches, bettingSettings]) => {
        setAllMatches(matches);
        setSettings(bettingSettings);
        setIsLoading(false);
    });
  }, [sport]);

  const upcomingAndLiveMatches = allMatches.filter(
    (m) => m.sport === sport && (m.status === "Upcoming" || m.status === "Live")
  );

  const finishedMatches = allMatches.filter(
    (m) => m.sport === sport && m.status === "Finished"
  );
  
  const noMatchesExistForSport = upcomingAndLiveMatches.length === 0 && finishedMatches.length === 0;

  if (isLoading) {
    return <FinishedMatchesLoader />;
  }

  return (
    <div className="space-y-8">
      <div className="mt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search for a team in ${sport}...`}
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <MatchList
        matches={upcomingAndLiveMatches}
        sport={sport}
        betOptions={settings.betOptions}
        searchTerm={searchTerm}
      />
      
      <FinishedMatchesList
        matches={finishedMatches}
        betOptions={settings.betOptions}
        searchTerm={searchTerm}
      />
      
      {noMatchesExistForSport && !searchTerm && (
        <div className="text-center text-muted-foreground py-20 rounded-lg border border-dashed">
            <p className="text-lg font-semibold">No matches found for {sport}.</p>
            <p className="text-sm">Check back later for updates!</p>
        </div>
      )}
    </div>
  );
}
