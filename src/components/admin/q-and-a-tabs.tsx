
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sports } from "@/lib/types";
import type { Sport, Match } from "@/lib/types";
import { SportIcon } from "@/components/icons";
import { MatchQnaCard } from "./match-qna-card";

interface QandATabsProps {
    matches: Match[];
}

export function QandATabs({ matches }: QandATabsProps) {
  const upcomingMatches = matches.filter(m => m.status === 'Upcoming' || m.status === 'Live');
  
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
        <TabsContent key={sport} value={sport} className="mt-6 space-y-6">
           {upcomingMatches.filter(m => m.sport === sport).length > 0 ? (
                upcomingMatches
                    .filter(m => m.sport === sport)
                    .map(match => <MatchQnaCard key={match.id} match={match} />)
           ) : (
                <div className="text-center text-muted-foreground py-12 border rounded-md">
                    <p>No upcoming or live {sport} matches found for this sport.</p>
                </div>
           )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
