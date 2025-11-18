

'use client';

import type { Match, Sport } from "@/lib/types";
import { MatchList } from "./match-list";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { PaginatedFinishedMatches } from "./paginated-finished-matches";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SportMatchListProps {
  sport?: Sport;
  upcomingAndLiveMatches: Match[];
  finishedMatches: Match[];
  isFavoritesPage?: boolean;
}

const getFavoriteMatchIds = () => {
    if (typeof window === 'undefined') return [];
    const favorites = localStorage.getItem('favoriteMatches');
    return favorites ? JSON.parse(favorites) : [];
};

export function SportMatchList({ sport, upcomingAndLiveMatches: initialUpcoming, finishedMatches: initialFinished, isFavoritesPage = false }: SportMatchListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [upcomingAndLiveMatches, setUpcomingAndLiveMatches] = useState(initialUpcoming);
  const [finishedMatches, setFinishedMatches] = useState(initialFinished);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(getFavoriteMatchIds());
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all');

  const updateMatchData = useCallback(() => {
    const favIds = getFavoriteMatchIds();
    setFavoriteIds(favIds);

    const markFavorites = (matches: Match[]) => matches.map(m => ({ ...m, isFavorite: favIds.includes(m.id) }));
    
    let upcoming = markFavorites(initialUpcoming);
    let finished = markFavorites(initialFinished);

    if (isFavoritesPage) {
        upcoming = upcoming.filter(m => favIds.includes(m.id));
        finished = finished.filter(m => favIds.includes(m.id));
    }

    setUpcomingAndLiveMatches(upcoming);
    setFinishedMatches(finished);
  }, [initialUpcoming, initialFinished, isFavoritesPage]);

  useEffect(() => {
    updateMatchData();
    window.addEventListener('storage', updateMatchData);
    return () => window.removeEventListener('storage', updateMatchData);
  }, [updateMatchData]);


  const handleToggleFavorite = (matchId: string) => {
    const currentFavorites: string[] = getFavoriteMatchIds();
    let newFavorites: string[];

    if (currentFavorites.includes(matchId)) {
        newFavorites = currentFavorites.filter(id => id !== matchId);
    } else {
        newFavorites = [...currentFavorites, matchId];
    }
    
    localStorage.setItem('favoriteMatches', JSON.stringify(newFavorites));
    window.dispatchEvent(new Event('storage'));
  };

  const { liveMatches, upcomingMatches } = useMemo(() => {
    const live = upcomingAndLiveMatches.filter(m => m.status === 'Live');
    const upcoming = upcomingAndLiveMatches.filter(m => m.status === 'Upcoming');
    return { liveMatches: live, upcomingMatches: upcoming };
  }, [upcomingAndLiveMatches]);

  const noMatchesExistForSport = upcomingAndLiveMatches.length === 0 && finishedMatches.length === 0;

  if (isFavoritesPage && favoriteIds.length === 0) {
      return (
          <div className="text-center text-muted-foreground py-20 rounded-lg border border-dashed">
              <p className="text-lg font-semibold">You haven't favorited any matches yet.</p>
              <p className="text-sm">Click the heart icon on a match to add it to your favorites.</p>
          </div>
      )
  }

  const statusFilters = ['all', 'live', 'upcoming', 'finished'];

  return (
    <div className="space-y-8">
      <div className="mt-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={sport ? `Search for a team in ${sport}...` : 'Search for any team...'}
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Tabs value={activeStatusTab} onValueChange={(value) => setActiveStatusTab(value as any)} className="w-full">
            <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="live">Live</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="finished">Finished</TabsTrigger>
            </TabsList>
        </Tabs>
      </div>
      
      {(activeStatusTab === 'all' || activeStatusTab === 'live') && liveMatches.length > 0 && (
          <div>
            <h2 className="font-headline text-2xl font-bold mb-4">Live Matches</h2>
            <MatchList matches={liveMatches} searchTerm={searchTerm} onToggleFavorite={handleToggleFavorite} status="Live" />
          </div>
      )}

      {(activeStatusTab === 'all' || activeStatusTab === 'upcoming') && upcomingMatches.length > 0 && (
          <div>
            <h2 className="font-headline text-2xl font-bold mb-4">Upcoming Matches</h2>
            <MatchList matches={upcomingMatches} searchTerm={searchTerm} onToggleFavorite={handleToggleFavorite} status="Upcoming" />
          </div>
      )}
      
      {(activeStatusTab === 'all' || activeStatusTab === 'finished') && finishedMatches.length > 0 && (
         <div>
            <h2 className="font-headline text-2xl font-bold mb-4">Finished Matches</h2>
            <PaginatedFinishedMatches matches={finishedMatches} searchTerm={searchTerm} onToggleFavorite={handleToggleFavorite} />
        </div>
      )}
      
      {noMatchesExistForSport && !isFavoritesPage && !searchTerm && (
        <div className="text-center text-muted-foreground py-20 rounded-lg border border-dashed">
            <p className="text-lg font-semibold">No matches found for {sport || 'any sport'}.</p>
            <p className="text-sm">Check back later for updates!</p>
        </div>
      )}
    </div>
  );
}
