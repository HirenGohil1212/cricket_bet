
"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sports } from "@/lib/types";

export function MatchTabs({ children }: { children: React.ReactNode }) {
  return (
    <Tabs defaultValue="Cricket" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto">
        {sports.map((sport) => (
          <TabsTrigger key={sport} value={sport} className="py-2">
            <span>{sport}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}
