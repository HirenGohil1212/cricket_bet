
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sports } from "@/lib/types";
import type { Sport, Match, Question } from "@/lib/types";
import { SportIcon } from "@/components/icons";
import { MatchQnaCard } from "./match-qna-card";
import { Button } from "../ui/button";
import { useState, useCallback } from "react";
import { QuestionTemplateDialog } from "./question-template-dialog";
import { getMatches } from "@/app/actions/match.actions";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";

interface QandADashboardProps {
    matches: Match[];
    initialTemplates: Record<Sport, Pick<Question, 'question'>[]>;
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

export function QandADashboard({ matches: initialMatches, initialTemplates }: QandADashboardProps) {
  const [matches, setMatches] = useState(initialMatches);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshMatches = useCallback(async () => {
    setIsLoading(true);
    const updatedMatches = await getMatches();
    setMatches(updatedMatches);
    setIsLoading(false);
  }, []);
  
  const handleManageTemplate = (sport: Sport) => {
    setSelectedSport(sport);
    setIsTemplateDialogOpen(true);
  };

  const onDialogClose = (shouldRefresh: boolean) => {
    setIsTemplateDialogOpen(false);
    setSelectedSport(null);
    if (shouldRefresh) {
        refreshMatches();
    }
  }

  return (
    <>
      <Tabs defaultValue="Cricket" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto">
          {sports.map((sport) => (
            <TabsTrigger 
              key={sport} 
              value={sport} 
              className={cn(
                "flex flex-col sm:flex-row items-center gap-2 py-2",
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
              )}
            >
              <span>{sport}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {sports.map((sport) => {
          const upcomingMatches = matches.filter(m => m.sport === sport && (m.status === 'Upcoming' || m.status === 'Live'));
          return (
             <TabsContent key={sport} value={sport} className="mt-6 space-y-6">
                <div className="flex justify-end">
                    <Button onClick={() => handleManageTemplate(sport)}>Manage {sport} Questions</Button>
                </div>
                {isLoading ? <QnaDashboardSkeleton /> : upcomingMatches.length > 0 ? (
                      upcomingMatches.map(match => <MatchQnaCard key={match.id} match={match} onUpdate={refreshMatches} />)
                 ) : (
                      <div className="text-center text-muted-foreground py-12 border rounded-md">
                          <p>No upcoming or live matches found for this sport.</p>
                          <p className="text-sm">You can still manage the question template.</p>
                      </div>
                 )}
              </TabsContent>
          )
        })}
      </Tabs>
      {selectedSport && (
        <QuestionTemplateDialog
          isOpen={isTemplateDialogOpen}
          onClose={onDialogClose}
          sport={selectedSport}
          existingQuestions={initialTemplates[selectedSport] || []}
        />
      )}
    </>
  );
}
