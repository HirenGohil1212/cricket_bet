import { collection, getDocs, query, where } from "firebase/firestore";
import type { Bet, Sport, Winner } from "@/lib/types";
import { MatchList } from "./match-list";
import { getMatches } from "@/app/actions/match.actions";
import { getBettingSettings } from "@/app/actions/settings.actions";
import { db } from "@/lib/firebase";

interface SportMatchListProps {
  sport: Sport;
}

// Helper function to chunk an array into smaller arrays of a specific size.
// This is necessary to work around Firestore's limitation of 30 items in an 'in' query.
const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
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

  // --- OPTIMIZED WINNER FETCHING ---
  const finishedMatchIds = sportMatches
    .filter(m => m.status === 'Finished')
    .map(m => m.id);
    
  const winnersMap = new Map<string, Winner[]>();

  if (finishedMatchIds.length > 0) {
    const betsRef = collection(db, 'bets');
    const usersRef = collection(db, 'users');
    
    // 1. Fetch all winning bets for all finished matches in batches
    const betChunks = chunkArray(finishedMatchIds, 30); // Firestore 'in' query has a 30-item limit
    const betPromises = betChunks.map(chunk => 
      getDocs(query(betsRef, where('matchId', 'in', chunk), where('status', '==', 'Won')))
    );
    const betSnapshots = await Promise.all(betPromises);
    const allWinningBets = betSnapshots.flatMap(snapshot => snapshot.docs.map(doc => doc.data() as Bet));

    if (allWinningBets.length > 0) {
      // 2. Fetch all unique users who won, also in batches
      const winnerUserIds = [...new Set(allWinningBets.map(bet => bet.userId))];
      const userChunks = chunkArray(winnerUserIds, 30);
      const userPromises = userChunks.map(chunk => 
        getDocs(query(usersRef, where('uid', 'in', chunk)))
      );
      const userSnapshots = await Promise.all(userPromises);
      const userMap = new Map<string, string>();
      userSnapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          userMap.set(doc.id, doc.data().name || 'Unknown User');
        });
      });

      // 3. Map winners back to their respective matches
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
