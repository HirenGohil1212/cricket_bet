
"use client";

import { useState } from 'react';
import type { Match, Sport, BetOption } from '@/lib/types';
import { MatchCard } from './match-card';
import { GuessDialog } from './guess-dialog';

interface MatchListProps {
  matches: Match[];
  sport: Sport;
  betOptions: BetOption[];
}

export function MatchList({ matches, sport, betOptions }: MatchListProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isGuessDialogOpen, setIsGuessDialogOpen] = useState(false);

  const handleBetNow = (match: Match) => {
    setSelectedMatch(match);
    setIsGuessDialogOpen(true);
  };
  
  const handleDialogChange = (open: boolean) => {
    setIsGuessDialogOpen(open);
    if (!open) {
      setSelectedMatch(null);
    }
  }

  const liveMatches = matches.filter((m) => m.status === 'Live');
  const upcomingMatches = matches.filter((m) => m.status === 'Upcoming');
  const finishedMatches = matches.filter((m) => m.status === 'Finished');

  return (
    <div className="space-y-8">
      {liveMatches.length > 0 && (
        <section>
          <h2 className="font-headline text-2xl font-bold mb-4">Live Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {liveMatches.map((match) => (
              <MatchCard key={match.id} match={match} onBetNow={handleBetNow} />
            ))}
          </div>
        </section>
      )}

      {upcomingMatches.length > 0 && (
        <section>
          <h2 className="font-headline text-2xl font-bold mb-4">Upcoming Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match} onBetNow={handleBetNow} />
            ))}
          </div>
        </section>
      )}
      
      {finishedMatches.length > 0 && (
        <section>
          <h2 className="font-headline text-2xl font-bold mb-4">Finished Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {finishedMatches.map((match) => (
              <MatchCard key={match.id} match={match} onBetNow={handleBetNow} />
            ))}
          </div>
        </section>
      )}
      
      <GuessDialog 
        match={selectedMatch} 
        open={isGuessDialogOpen} 
        onOpenChange={handleDialogChange}
        betOptions={betOptions}
      />
    </div>
  );
}
