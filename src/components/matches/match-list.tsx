

"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Match, Sport } from '@/lib/types';
import { MatchCard } from './match-card';
import { GuessDialog } from './guess-dialog';
import { BettingHistoryDialog } from '../dashboard/betting-history-dialog';

interface MatchListProps {
  matches: Match[];
  sport?: Sport;
  searchTerm: string;
}

export function MatchList({ matches, searchTerm }: MatchListProps) {
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

  const filteredMatches = useMemo(() => {
    if (!searchTerm) {
      return localMatches;
    }
    return localMatches.filter(match =>
      match.teamA.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.teamB.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [localMatches, searchTerm]);


  const upcomingMatches = filteredMatches
    .filter((m) => m.status === 'Upcoming')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
  const liveMatches = filteredMatches.filter((m) => m.status === 'Live');
  
  // This is used to show the "no results for search" message
  const noFilteredMatchesExist = filteredMatches.length === 0 && searchTerm;
  
  // This is used to hide the sections if there are no matches at all (pre-search)
  const noMatchesInitially = localMatches.length === 0;

  if (noMatchesInitially) {
    return null;
  }

  return (
    <>
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
        <section className={upcomingMatches.length > 0 ? "mt-8" : ""}>
          <h2 className="font-headline text-2xl font-bold mb-4">Live Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {liveMatches.map((match) => (
              <MatchCard key={match.id} match={match} onBetNow={handleBetNow} onViewMyBets={handleViewMyBets} onCountdownEnd={handleCountdownEnd} />
            ))}
          </div>
        </section>
      )}

      {noFilteredMatchesExist && (
         <div className="text-center text-muted-foreground py-20 rounded-lg border border-dashed">
            <p className="text-lg font-semibold">No matches found for "{searchTerm}"</p>
            <p className="text-sm">Try searching for another team.</p>
        </div>
      )}
      
      <GuessDialog 
        match={selectedMatch} 
        open={isGuessDialogOpen} 
        onOpenChange={handleDialogChange}
      />
      <BettingHistoryDialog 
        open={isHistoryDialogOpen} 
        onOpenChange={handleHistoryDialogChange}
        match={historyMatch}
      />
    </>
  );
}
