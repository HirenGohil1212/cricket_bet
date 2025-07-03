
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sports } from "@/lib/types";
import type { Sport, Winner } from "@/lib/types";
import { MatchList } from "./match-list";
import { SportIcon } from "@/components/icons";
import { getMatches } from "@/app/actions/match.actions";
import { getWinnersForMatch } from "@/app/actions/qna.actions";
import { getBettingSettings } from "@/app/actions/settings.actions";

export async function MatchTabs() {
  const [allMatches, settings] = await Promise.all([
    getMatches(),
    getBettingSettings(),
  ]);
  const { betOptions } = settings;

  // Fetch winners for all finished matches concurrently
  const finishedMatches = allMatches.filter(m => m.status === 'Finished');
  const winnerPromises = finishedMatches.map(m => getWinnersForMatch(m.id));
  const winnersByMatchId = await Promise.all(winnerPromises);

  // Create a map for quick lookups
  const winnersMap = new Map<string, Winner[]>();
  finishedMatches.forEach((match, index) => {
    winnersMap.set(match.id, winnersByMatchId[index]);
  });
  
  // Add the 'winners' property to each finished match object
  const augmentedMatches = allMatches.map(match => {
    if (match.status === 'Finished') {
      return {
        ...match,
        winners: winnersMap.get(match.id) || [],
      };
    }
    return match;
  });

  return (
    <Tabs defaultValue="Cricket" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto">
        {sports.map((sport) => (
          <TabsTrigger key={sport} value={sport} className="flex flex-col sm:flex-row items-center gap-2 py-2">
            <SportIcon sport={sport} className="w-5 h-5" />
            <span>{sport}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {sports.map((sport) => (
        <TabsContent key={sport} value={sport} className="mt-6">
          <MatchList
            matches={augmentedMatches.filter(m => m.sport === sport)}
            sport={sport}
            betOptions={betOptions}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
