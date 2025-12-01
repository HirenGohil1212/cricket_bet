
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Match } from "@/lib/types";
import { MatchControlCard } from "./match-control-card";
import { useState, useCallback } from "react";
import { getMatches } from "@/app/actions/match.actions";
import { Skeleton } from "../ui/skeleton";

interface ControlPanelDashboardProps {
    liveMatches: Match[];
    upcomingMatches: Match[];
}

function ControlPanelSkeleton() {
    return (
        <div className="mt-6 space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
    );
}

export function ControlPanelDashboard({ 
    liveMatches: initialLive, 
    upcomingMatches: initialUpcoming 
}: ControlPanelDashboardProps) {
  
  const [liveMatches, setLiveMatches] = useState(initialLive);
  const [upcomingMatches, setUpcomingMatches] = useState(initialUpcoming);
  const [isLoading, setIsLoading] = useState(false);

  const refreshMatches = useCallback(async () => {
    setIsLoading(true);
    const updatedMatches = await getMatches();
    setLiveMatches(updatedMatches.filter(m => m.status === 'Live'));
    setUpcomingMatches(updatedMatches.filter(m => m.status === 'Upcoming'));
    setIsLoading(false);
  }, []);

  return (
    <Tabs defaultValue="live" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="live">Live Matches ({liveMatches.length})</TabsTrigger>
        <TabsTrigger value="upcoming">Upcoming Matches ({upcomingMatches.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="live" className="mt-4 space-y-4">
        {isLoading ? <ControlPanelSkeleton /> : liveMatches.length > 0 ? (
          liveMatches.map(match => <MatchControlCard key={match.id} match={match} onUpdate={refreshMatches} />)
        ) : (
          <div className="text-center text-muted-foreground py-12 border rounded-md">
            <p>No live matches found.</p>
          </div>
        )}
      </TabsContent>
      <TabsContent value="upcoming" className="mt-4 space-y-4">
        {isLoading ? <ControlPanelSkeleton /> : upcomingMatches.length > 0 ? (
          upcomingMatches.map(match => <MatchControlCard key={match.id} match={match} onUpdate={refreshMatches} />)
        ) : (
          <div className="text-center text-muted-foreground py-12 border rounded-md">
            <p>No upcoming matches found.</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
