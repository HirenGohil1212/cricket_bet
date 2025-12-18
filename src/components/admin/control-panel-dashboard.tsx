
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Match } from "@/lib/types";
import { MatchControlCard } from "./match-control-card";
import { useState, useCallback, useEffect, useMemo } from "react";
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
  
  const [matches, setMatches] = useState([...initialLive, ...initialUpcoming]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshMatches = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }
    try {
        const updatedMatches = await getMatches();
        setMatches(updatedMatches);
    } catch (error) {
        console.error("Failed to refresh matches:", error);
    } finally {
        if (showLoader) {
          setIsLoading(false);
        }
    }
  }, []);

  useEffect(() => {
    // Set up an interval to refresh the matches every 30 seconds
    const intervalId = setInterval(() => {
        refreshMatches(false); // Refresh without showing the main loader
    }, 30000); // 30 seconds

    // Clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [refreshMatches]);

  const { liveMatches, upcomingMatches } = useMemo(() => {
    const live = matches.filter(m => m.status === 'Live');
    const upcoming = matches.filter(m => m.status === 'Upcoming');
    return { liveMatches: live, upcomingMatches: upcoming };
  }, [matches]);

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
