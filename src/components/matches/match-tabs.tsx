
"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sports } from "@/lib/types";
import { SportIcon } from "@/components/icons";

export function MatchTabs({ children }: { children: React.ReactNode }) {
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
      {children}
    </Tabs>
  );
}
