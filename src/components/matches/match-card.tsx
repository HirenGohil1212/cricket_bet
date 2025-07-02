
"use client";

import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Countdown } from '@/components/countdown';
import { SportIcon } from '@/components/icons';
import type { Match } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Flame, CheckCircle, Clock, Trophy, Star } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MatchCardProps {
  match: Match;
  onBetNow: (match: Match) => void;
}

const StatusIndicator = ({ status }: { status: Match['status'] }) => {
  const statusConfig = {
    Live: { icon: Flame, color: 'bg-red-500', text: 'Live' },
    Upcoming: { icon: Clock, color: 'bg-yellow-500', text: 'Upcoming' },
    Finished: { icon: CheckCircle, color: 'bg-green-500', text: 'Finished' },
  };

  const { icon: Icon, color, text } = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-2 w-2 rounded-full', color)} />
      <span className="text-xs font-semibold text-muted-foreground">{text}</span>
    </div>
  );
};


export function MatchCard({ match, onBetNow }: MatchCardProps) {
  const { teamA, teamB, status, score, winner, sport, startTime, winners } = match;
  const { user } = useAuth();

  const getTeamClass = (teamName: string) => {
    if (status !== 'Finished') return 'text-foreground';
    return winner === teamName ? 'font-bold text-primary' : 'text-muted-foreground opacity-70';
  };

  const currentUserWon = status === 'Finished' && user && winners?.some(w => w.userId === user.uid);

  return (
    <Card className={cn(
      "overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col",
      currentUserWon && "border-accent ring-2 ring-accent"
    )}>
      <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
         <div className="flex items-center gap-2">
            <SportIcon sport={sport} className="w-5 h-5 text-primary" />
            <p className="text-sm font-semibold">{sport}</p>
         </div>
         <StatusIndicator status={status} />
      </CardHeader>
      
      <CardContent className="p-4 space-y-4 flex-grow">
        <div className="flex justify-between items-center text-center">
            <div className={cn("flex-1 flex flex-col items-center gap-2", getTeamClass(teamA.name))}>
                <Image src={teamA.logoUrl} alt={teamA.name} width={56} height={56} className="rounded-full object-contain" data-ai-hint="logo" />
                <p className="font-semibold text-sm leading-tight">{teamA.name}</p>
            </div>
            
            <div className="flex flex-col items-center">
              {status === 'Live' && <Badge variant="destructive" className="animate-pulse mb-1">LIVE</Badge>}
              <p className="text-lg font-bold text-muted-foreground font-headline">
                {score ? score : 'vs'}
              </p>
            </div>

            <div className={cn("flex-1 flex flex-col items-center gap-2", getTeamClass(teamB.name))}>
                <Image src={teamB.logoUrl} alt={teamB.name} width={56} height={56} className="rounded-full object-contain" data-ai-hint="logo" />
                <p className="font-semibold text-sm leading-tight">{teamB.name}</p>
            </div>
        </div>

        {status === 'Finished' && winner && (
          <p className="text-center text-sm text-primary font-semibold p-2 bg-primary/10 rounded-md">
            {winner} won the match!
          </p>
        )}
      </CardContent>

      {status === 'Upcoming' && (
        <CardFooter className="p-4 pt-0 flex-col items-stretch gap-2">
           <div className="text-center bg-accent/10 text-accent-foreground p-2 rounded-md w-full">
              <p className="text-xs">Betting closes in:</p>
              <Countdown targetDate={new Date(startTime)} />
          </div>
          <Button
            className="w-full font-bold bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => onBetNow(match)}
          >
            Bet Now
          </Button>
        </CardFooter>
      )}

      {status === 'Finished' && (
        <CardFooter className="p-2 pt-0 border-t">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="winners" className="border-b-0">
              <AccordionTrigger className="py-2 text-sm hover:no-underline [&[data-state=open]]:bg-transparent">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span>
                    {winners && winners.length > 0 ? `${winners.length} Winner(s)` : "View Results"}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-0 pb-2">
                {winners && winners.length > 0 ? (
                  <ScrollArea className="h-32">
                    <div className="space-y-2 pr-4">
                      {winners.map((win, index) => (
                        <div key={index} className={cn(
                          "flex justify-between items-center text-xs p-2 rounded-md",
                          win.userId === user?.uid ? "bg-accent/20" : "bg-muted"
                        )}>
                          <span className="font-medium truncate">{win.name}</span>
                          <div className="flex items-center gap-2">
                            {win.userId === user?.uid && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                            <span className="font-semibold text-primary shrink-0">
                              INR {win.payoutAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">No winners for this match.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardFooter>
      )}
    </Card>
  );
}
