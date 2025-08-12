
'use client';

import type { Match, Sport, BetOption } from "@/lib/types";
import { MatchList } from "./match-list";
import { useState } from "react";
import { PaginatedFinishedMatches } from "./paginated-finished-matches";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SportMatchListProps {
  sport: Sport;
  upcomingAndLiveMatches: Match[];
  finishedMatches: Match[];
  betOptions: BetOption[];
}

export function SportMatchList({ sport, upcomingAndLiveMatches, finishedMatches, betOptions }: SportMatchListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const noMatchesExistForSport = upcomingAndLiveMatches.length === 0 && finishedMatches.length === 0;

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
        betOptions={betOptions}
        searchTerm={searchTerm}
      />
      
      <PaginatedFinishedMatches
        matches={finishedMatches}
        betOptions={betOptions}
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
