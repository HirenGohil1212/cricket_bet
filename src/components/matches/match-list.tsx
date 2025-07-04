
"use client";

import { useState, useEffect } from 'react';
import type { Match, Sport, BetOption } from '@/lib/types';
import { MatchCard } from './match-card';
import { GuessDialog } from './guess-dialog';
import { BettingHistoryDialog } from '../dashboard/betting-history-dialog';

interface MatchListProps {
  matches: Match[];
  sport: Sport;
  betOptions: BetOption[];
}

export function MatchList({ matches, sport, betOptions }: MatchListProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isGuessDialogOpen, setIsGuessDialogOpen] = useState(false);
  const [localMatches, setLocalMatches] = useState(matches);
  const [historyMatch, setHistoryMatch] = useState<Match | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  useEffect(() => {
    setLocalMatches(matches);
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

  const liveMatches = localMatches.filter((m) => m.status === 'Live');
  const upcomingMatches = localMatches.filter((m) => m.status === 'Upcoming');
  const finishedMatches = localMatches.filter((m) => m.status === 'Finished');

  return (
    <div className="space-y-8">
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
      
      {finishedMatches.length > 0 && (
        <section>
          <h2 className="font-headline text-2xl font-bold mb-4">Finished Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {finishedMatches.map((match) => (
              <MatchCard key={match.id} match={match} onBetNow={handleBetNow} onViewMyBets={handleViewMyBets} onCountdownEnd={handleCountdownEnd} />
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
      <BettingHistoryDialog 
        open={isHistoryDialogOpen} 
        onOpenChange={handleHistoryDialogChange}
        match={historyMatch}
      />
    </div>
  );
}
