

import type { Match, BetOption } from "@/lib/types";
import { PaginatedFinishedMatches } from "./paginated-finished-matches";

interface FinishedMatchesListProps {
  matches: Match[];
  searchTerm: string;
}

export function FinishedMatchesList({ matches, searchTerm }: FinishedMatchesListProps) {
   if (matches.length === 0) {
    return null;
  }

  return (
    <PaginatedFinishedMatches
      matches={matches}
      searchTerm={searchTerm}
    />
  );
}
