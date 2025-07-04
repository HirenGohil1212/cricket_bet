
"use client";

import { useState, useEffect } from 'react';
import type { Match, Sport, BetOption } from '@/lib/types';
import { MatchCard } from './match-card';
import { GuessDialog } from './guess-dialog';
import { BettingHistoryDialog } from '../dashboard/betting-history-dialog';
import { Button } from '@/components/ui/button';

interface MatchListProps {
  matches: Match[];
  sport: Sport;
  betOptions: BetOption[];
}

const FINISHED_MATCHES_PER_PAGE = 8;

export function MatchList({ matches, sport, betOptions }: MatchListProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isGuessDialogOpen, setIsGuessDialogOpen] = useState(false);
  const [localMatches, setLocalMatches] = useState(matches);
  const [historyMatch, setHistoryMatch] = useState<Match | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [visibleFinishedCount, setVisibleFinishedCount] = useState(FINISHED_MATCHES_PER_PAGE);

  useEffect(() => {
    // When the parent component passes new matches (i.e., when the sport tab changes),
    // reset the local matches state and the pagination for finished matches.
    setLocalMatches(matches);
    setVisibleFinishedCount(FINISHED_MATCHES_PER_PAGE);
  }, [matches]);

  const handleCountdownEnd = (matchId: string) => {
    setLocalMatches(currentMatches =>
      currentMatches.map(m =>
        m.id === matchId ? { ...m, status: 'Live' } : m
      )
    );
  };

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

  const handleViewMyBets = (match: Match) => {
    setHistoryMatch(match);
    setIsHistoryDialogOpen(true);
  };

  const handleHistoryDialogChange = (open: boolean) => {
    setIsHistoryDialogOpen(open);
    if (!open) {
      setHistoryMatch(null);
    }
  }

  const upcomingMatches = localMatches
    .filter((m) => m.status === 'Upcoming')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
  const liveMatches = localMatches.filter((m) => m.status === 'Live');
  
  const finishedMatches = localMatches.filter((m) => m.status === 'Finished');

  // Only show a "page" of finished matches at a time
  const paginatedFinishedMatches = finishedMatches.slice(0, visibleFinishedCount);

  return (
    <div className="space-y-8">
      {upcomingMatches.length > 0 && (
        <section>
          <h2 className="font-headline text-2xl font-bold mb-4">Upcoming Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match} onBetNow={handleBetNow} onViewMyBets={handleViewMyBets} onCountdownEnd={handleCountdownEnd} />
            ))}
          </div>
        </section>
      )}

      {liveMatches.length > 0 && (
        <section>
          <h2 className="font-headline text-2xl font-bold mb-4">Live Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {liveMatches.map((match) => (
              <MatchCard key={match.id} match={match} onBetNow={handleBetNow} onViewMyBets={handleViewMyBets} onCountdownEnd={handleCountdownEnd} />
            ))}
          </div>
        </section>
      )}
      
      {paginatedFinishedMatches.length > 0 && (
        <section>
          <h2 className="font-headline text-2xl font-bold mb-4">Finished Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedFinishedMatches.map((match) => (
              <MatchCard key={match.id} match={match} onBetNow={handleBetNow} onViewMyBets={handleViewMyBets} onCountdownEnd={handleCountdownEnd} />
            ))}
          </div>
          {finishedMatches.length > paginatedFinishedMatches.length && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleFinishedCount(current => current + FINISHED_MATCHES_PER_PAGE)}
              >
                Load More Finished Matches
              </Button>
            </div>
          )}
        </section>
      )}
      
      {localMatches.length === 0 && (
         <div className="text-center text-muted-foreground py-20 rounded-lg border border-dashed">
            <p className="text-lg font-semibold">No matches found for {sport}.</p>
            <p className="text-sm">Check back later for updates!</p>
        </div>
      )}

      <GuessDialog 
        match={selectedMatch} 
        open={isGuessDialogOpen} 
        onOpenChange={handleDialogChange}
        betOptions={betOptions}
      />
      <BettingHistoryDialog 
        open={isHistoryDialogOpen} 
        onOpenChange={handleHistoryDialogChange}
        match={historyMatch}
      />
    </div>
  );
}
