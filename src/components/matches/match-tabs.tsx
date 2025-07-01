import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockMatches } from "@/lib/data";
import type { Sport } from "@/lib/types";
import { MatchList } from "./match-list";
import { SportIcon } from "@/components/icons";

export function MatchTabs() {
  const sports: Sport[] = ["Cricket", "Football", "Tennis", "Table Tennis", "Badminton"];
  
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
          <MatchList matches={mockMatches.filter(m => m.sport === sport)} sport={sport} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
