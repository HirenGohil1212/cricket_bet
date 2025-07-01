import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sports } from "@/lib/types";
import type { Sport } from "@/lib/types";
import { MatchList } from "./match-list";
import { SportIcon } from "@/components/icons";
import { getMatches } from "@/app/actions/match.actions";

export async function MatchTabs() {
  const allMatches = await getMatches();
  
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
          <MatchList matches={allMatches.filter(m => m.sport === sport)} sport={sport} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
