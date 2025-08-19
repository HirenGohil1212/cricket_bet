
import type { Match, Winner, BetOption } from "@/lib/types";
import { getWinnersForMatch } from "@/app/actions/qna.actions";
import { PaginatedFinishedMatches } from "./paginated-finished-matches";
import { Suspense } from "react";
import { FinishedMatchesLoader } from "./finished-matches-loader";

interface FinishedMatchesListProps {
  matches: Match[];
  betOptions: BetOption[];
  searchTerm: string;
}

async function FinishedMatchesData({ matches, betOptions, searchTerm }: FinishedMatchesListProps) {
  if (matches.length === 0) {
    return null;
  }
  
  // Fetch winners for all finished matches in parallel
  const winnersPromises = matches.map(match => getWinnersForMatch(match.id));
  const winnersResults = await Promise.all(winnersPromises);
  
  const winnersMap = new Map<string, Winner[]>();
  winnersResults.forEach((winners, index) => {
    if (winners.length > 0) {
      winnersMap.set(matches[index].id, winners);
    }
  });
  
  const augmentedMatches = matches.map(match => ({
    ...match,
    winners: winnersMap.get(match.id) || [],
  }));

  return (
    <PaginatedFinishedMatches
      matches={augmentedMatches}
      betOptions={betOptions}
      searchTerm={searchTerm}
    />
  );
}


export function FinishedMatchesList({ matches, betOptions, searchTerm }: FinishedMatchesListProps) {
   if (matches.length === 0) {
    return null;
  }

  return (
    <Suspense fallback={<FinishedMatchesLoader />}>
      <FinishedMatchesData matches={matches} betOptions={betOptions} searchTerm={searchTerm} />
    </Suspense>
  )
}

    