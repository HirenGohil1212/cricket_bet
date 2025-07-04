import type { Sport, Winner } from "@/lib/types";
import { MatchList } from "./match-list";
import { getMatches } from "@/app/actions/match.actions";
import { getWinnersForMatch } from "@/app/actions/qna.actions";
import { getBettingSettings } from "@/app/actions/settings.actions";

interface SportMatchListProps {
  sport: Sport;
}

export async function SportMatchList({ sport }: SportMatchListProps) {
  // Fetch all data needed for this specific sport tab
  const [allMatches, settings] = await Promise.all([
    getMatches(),
    getBettingSettings(),
  ]);
  const { betOptions } = settings;

  // Filter matches for the current sport
  const sportMatches = allMatches.filter(m => m.sport === sport);

  // Fetch winners only for the finished matches of this sport
  const finishedMatches = sportMatches.filter(m => m.status === 'Finished');
  const winnerPromises = finishedMatches.map(m => getWinnersForMatch(m.id));
  const winnersByMatchId = await Promise.all(winnerPromises);

  // Create a map for quick lookups
  const winnersMap = new Map<string, Winner[]>();
  finishedMatches.forEach((match, index) => {
    winnersMap.set(match.id, winnersByMatchId[index]);
  });
  
  // Add the 'winners' property to each finished match object
  const augmentedMatches = sportMatches.map(match => {
    if (match.status === 'Finished') {
      return {
        ...match,
        winners: winnersMap.get(match.id) || [],
      };
    }
    return match;
  });

  return (
    <MatchList
      matches={augmentedMatches}
      sport={sport}
      betOptions={betOptions}
    />
  );
}
