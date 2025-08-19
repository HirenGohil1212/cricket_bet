import { collection, getDocs, query, where } from "firebase/firestore";
import type { Bet, Sport, Winner, Match, BetOption } from "@/lib/types";
import { db } from "@/lib/firebase";
import { PaginatedFinishedMatches } from "./paginated-finished-matches";

interface FinishedMatchesListProps {
  matches: Match[];
  betOptions: BetOption[];
}

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function FinishedMatchesList({ matches, betOptions }: FinishedMatchesListProps) {
  if (matches.length === 0) {
    return null;
  }
  
  const finishedMatchIds = matches.map(m => m.id);
  const winnersMap = new Map<string, Winner[]>();

  if (finishedMatchIds.length > 0) {
    const betsRef = collection(db, 'bets');
    const usersRef = collection(db, 'users');
    
    const betChunks = chunkArray(finishedMatchIds, 30);
    const betPromises = betChunks.map(chunk => 
      getDocs(query(betsRef, where('matchId', 'in', chunk), where('status', '==', 'Won')))
    );
    const betSnapshots = await Promise.all(betPromises);
    const allWinningBets = betSnapshots.flatMap(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Bet, 'id'>) })));

    if (allWinningBets.length > 0) {
      const winnerUserIds = [...new Set(allWinningBets.map(bet => bet.userId))];
      const userChunks = chunkArray(winnerUserIds, 30);
      
      const userPromises = userChunks.map(chunk => 
        getDocs(query(usersRef, where('uid', 'in', chunk)))
      );
      
      const userSnapshots = await Promise.all(userPromises);
      const userMap = new Map<string, string>();
      
      userSnapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          userMap.set(doc.data().uid, doc.data().name || 'Unknown User');
        });
      });

      allWinningBets.forEach(bet => {
        const matchWinners = winnersMap.get(bet.matchId) || [];
        matchWinners.push({
          userId: bet.userId,
          name: userMap.get(bet.userId) || `User ID: ${bet.userId}`,
          payoutAmount: bet.potentialWin || 0,
        });
        winnersMap.set(bet.matchId, matchWinners);
      });
    }
  }
  
  const augmentedMatches = matches.map(match => ({
    ...match,
    winners: winnersMap.get(match.id) || [],
  }));

  return (
    <PaginatedFinishedMatches
      matches={augmentedMatches}
      betOptions={betOptions}
    />
  );
}
