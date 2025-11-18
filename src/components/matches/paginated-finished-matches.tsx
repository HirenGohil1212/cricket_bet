

"use client";

import { useState, useMemo } from 'react';
import type { Match, Sport, BetOption } from '@/lib/types';
import { MatchCard } from './match-card';
import { BettingHistoryDialog } from '../dashboard/betting-history-dialog';
import { Button } from '@/components/ui/button';
import { GuessDialog } from './guess-dialog';

interface PaginatedFinishedMatchesProps {
  matches: Match[];
  searchTerm: string;
  onToggleFavorite: (matchId: string) => void;
}

const FINISHED_MATCHES_PER_PAGE = 8;

export function PaginatedFinishedMatches({ matches, searchTerm, onToggleFavorite }: PaginatedFinishedMatchesProps) {
  // State for dialogs, needed because MatchCard actions are here
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isGuessDialogOpen, setIsGuessDialogOpen] = useState(false);
  const [historyMatch, setHistoryMatch] = useState<Match | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  // State for pagination
  const [visibleFinishedCount, setVisibleFinishedCount] = useState(FINISHED_MATCHES_PER_PAGE);

  const handleBetNow = (match: Match) => {
    setSelectedMatch(match);
    setIsGuessDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setIsGuessDialogOpen(open);
    if (!open) setSelectedMatch(null);
  };

  const handleViewMyBets = (match: Match) => {
    setHistoryMatch(match);
    setIsHistoryDialogOpen(true);
  };

  const handleHistoryDialogChange = (open: boolean) => {
    setIsHistoryDialogOpen(open);
    if (!open) setHistoryMatch(null);
  };

  // The countdown end handler doesn't apply to finished matches, so we pass a no-op function.
  const handleCountdownEnd = () => {};

  const filteredMatches = useMemo(() => {
    if (!searchTerm) {
      return matches;
    }
    return matches.filter(match =>
      match.teamA.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.teamB.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [matches, searchTerm]);

  const paginatedFinishedMatches = filteredMatches.slice(0, visibleFinishedCount);
  
  if (matches.length === 0) {
    return null;
  }
  
  if (filteredMatches.length === 0 && searchTerm) {
    // If there's a search term but no results in finished matches, don't show anything.
    // The main MatchList component will show the "No results" message if it also has no results.
    return null;
  }

  return (
    <>
      <section>
        <h2 className="font-headline text-2xl font-bold mb-4">Finished Matches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedFinishedMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onBetNow={handleBetNow}
              onViewMyBets={handleViewMyBets}
              onCountdownEnd={handleCountdownEnd}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
        {filteredMatches.length > paginatedFinishedMatches.length && (
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

      {/* These dialogs are needed here to handle actions from MatchCard */}
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
