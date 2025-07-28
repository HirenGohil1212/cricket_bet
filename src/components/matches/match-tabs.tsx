
"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sports } from "@/lib/types";

export function MatchTabs({ children }: { children: React.ReactNode }) {
  return (
    <Tabs defaultValue="Cricket" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto gap-2 bg-transparent p-0">
        {sports.map((sport) => (
          <TabsTrigger 
            key={sport} 
            value={sport} 
            className="py-2 px-4 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-muted/50 data-[state=inactive]:hover:bg-muted"
          >
            <span>{sport}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}
