
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sports } from "@/lib/types";
import type { Sport, Match, MatchStatus } from "@/lib/types";
import { MatchQnaCard } from "./match-qna-card";
import { useState, useCallback, useEffect, useMemo } from "react";
import { getMatches } from "@/app/actions/match.actions";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";
import { SportIcon } from "../icons";

interface QandADashboardProps {
    matches: Match[];
}

function QnaDashboardSkeleton() {
    return (
        <div className="mt-6 space-y-6">
            <div className="flex justify-end">
                <Skeleton className="h-10 w-48" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    )
}

const matchStatuses: MatchStatus[] = ["Upcoming", "Live", "Finished", "Cancelled"];

export function QandADashboard({ matches: initialMatches }: QandADashboardProps) {
  const [matches, setMatches] = useState(initialMatches);
  const [isLoading, setIsLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  // SYNC PROPS TO STATE
  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  // UPDATE "NOW" PERIODICALLY
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  const refreshMatches = useCallback(async () => {
    setIsLoading(true);
    const updatedMatches = await getMatches();
    setMatches(updatedMatches);
    setIsLoading(false);
  }, []);

  const getFilteredMatches = (sport: Sport, status: MatchStatus) => {
    return matches.filter(m => {
        if (m.sport !== sport) return false;
        
        let currentStatus = m.status;
        const startTime = new Date(m.startTime);
        
        // Auto-correct Upcoming to Live on the client
        if (currentStatus === 'Upcoming' && startTime <= now) {
            currentStatus = 'Live';
        }
        
        return currentStatus === status;
    });
  };

  return (
    <>
      <Tabs defaultValue="Cricket" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto">
          {sports.map((sport) => (
            <TabsTrigger 
              key={sport} 
              value={sport}
              className="flex items-center gap-2"
            >
              <SportIcon sport={sport} className="w-4 h-4" />
              {sport}
            </TabsTrigger>
          ))}
        </TabsList>
        {sports.map((sport) => (
             <TabsContent key={sport} value={sport} className="mt-6 space-y-6">
                 <Tabs defaultValue="Upcoming" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                        {matchStatuses.map(status => {
                            const count = getFilteredMatches(sport, status).length;
                            return (
                                <TabsTrigger key={status} value={status}>
                                    {status} ({count})
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                     {matchStatuses.map(status => {
                        const filteredMatches = getFilteredMatches(sport, status);
                        return (
                            <TabsContent key={status} value={status} className="mt-4 space-y-4">
                                {isLoading ? <QnaDashboardSkeleton /> : filteredMatches.length > 0 ? (
                                    filteredMatches.map(match => <MatchQnaCard key={match.id} match={match} onUpdate={refreshMatches} />)
                                ) : (
                                    <div className="text-center text-muted-foreground py-12 border rounded-md">
                                        <p>No {status.toLowerCase()} matches found for this sport.</p>
                                    </div>
                                )}
                            </TabsContent>
                        )
                    })}
                 </Tabs>
              </TabsContent>
          )
        )}
      </Tabs>
    </>
  );
}
