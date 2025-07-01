"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sports } from "@/lib/types";
import type { Sport, Match, Question } from "@/lib/types";
import { SportIcon } from "@/components/icons";
import { MatchQnaCard } from "./match-qna-card";
import { Button } from "../ui/button";
import { useState } from "react";
import { QuestionTemplateDialog } from "./question-template-dialog";

interface QandADashboardProps {
    matches: Match[];
    initialTemplates: Record<Sport, Question[]>;
}

export function QandADashboard({ matches, initialTemplates }: QandADashboardProps) {
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);

  const upcomingMatches = matches.filter(m => m.status === 'Upcoming' || m.status === 'Live');
  
  const handleManageTemplate = (sport: Sport) => {
    setSelectedSport(sport);
    setIsTemplateDialogOpen(true);
  };

  const onDialogClose = () => {
    setIsTemplateDialogOpen(false);
    setSelectedSport(null);
  }

  return (
    <>
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
          <TabsContent key={sport} value={sport} className="mt-6 space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => handleManageTemplate(sport)}>Manage {sport} Questions</Button>
            </div>
             {upcomingMatches.filter(m => m.sport === sport).length > 0 ? (
                  upcomingMatches
                      .filter(m => m.sport === sport)
                      .map(match => <MatchQnaCard key={match.id} match={match} />)
             ) : (
                  <div className="text-center text-muted-foreground py-12 border rounded-md">
                      <p>No upcoming or live matches found for this sport.</p>
                      <p className="text-sm">You can still manage the question template.</p>
                  </div>
             )}
          </TabsContent>
        ))}
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
