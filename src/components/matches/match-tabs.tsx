
"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sports } from "@/lib/types";
import { List } from "lucide-react";
import { SportIcon } from "../icons";

export function MatchTabs({ children }: { children: React.ReactNode }) {
  return (
    <Tabs defaultValue="All" className="w-full">
      <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto gap-2 bg-transparent p-0">
         <TabsTrigger 
            key="All" 
            value="All" 
            className="py-2 px-4 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-secondary/80 data-[state=inactive]:hover:bg-secondary flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            <span>All</span>
          </TabsTrigger>
        {sports.map((sport) => (
          <TabsTrigger 
            key={sport} 
            value={sport} 
            className="py-2 px-4 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-secondary/80 data-[state=inactive]:hover:bg-secondary flex items-center gap-2"
          >
            <SportIcon sport={sport} className="w-5 h-5" />
            <span>{sport}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}
