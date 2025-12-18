
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Match, Sport } from '@/lib/types';
import { MatchCard } from './match-card';
import { GuessDialog } from './guess-dialog';
import { BettingHistoryDialog } from '../dashboard/betting-history-dialog';

interface MatchListProps {
  matches: Match[];
  searchTerm: string;
  onToggleFavorite: (matchId: string) => void;
  onCountdownEnd: (matchId: string) => void;
  status: 'Live' | 'Upcoming'
}

export function MatchList({ matches, searchTerm, onToggleFavorite, onCountdownEnd, status }: MatchListProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isGuessDialogOpen, setIsGuessDialogOpen] = useState(false);
  const [localMatches, setLocalMatches] = useState(matches);
  const [historyMatch, setHistoryMatch] = useState<Match | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  useEffect(() => {
    setLocalMatches(matches);
  }, [matches]);

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
    
  if (filteredMatches.length === 0) {
     if (searchTerm) {
      return (
        <div className="text-center text-muted-foreground py-20 rounded-lg border border-dashed">
            <p className="text-lg font-semibold">No {status.toLowerCase()} matches found for "{searchTerm}"</p>
        </div>
      )
    }
    return null;
  }

  return (
    <>
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} onBetNow={handleBetNow} onViewMyBets={handleViewMyBets} onCountdownEnd={onCountdownEnd} onToggleFavorite={onToggleFavorite} />
          ))}
        </div>
      </section>
      
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
