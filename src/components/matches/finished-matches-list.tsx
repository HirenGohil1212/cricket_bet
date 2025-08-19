

import type { Match, BetOption } from "@/lib/types";
import { PaginatedFinishedMatches } from "./paginated-finished-matches";

interface FinishedMatchesListProps {
  matches: Match[];
  betOptions: BetOption[];
  searchTerm: string;
}

export function FinishedMatchesList({ matches, betOptions, searchTerm }: FinishedMatchesListProps) {
   if (matches.length === 0) {
    return null;
  }

  return (
    <PaginatedFinishedMatches
      matches={matches}
      betOptions={betOptions}
      searchTerm={searchTerm}
    />
  );
}
