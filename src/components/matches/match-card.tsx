
"use client";

import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Countdown } from '@/components/countdown';
import { SportIcon } from '@/components/icons';
import type { Match, Team } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Flame, CheckCircle, Clock, Trophy, Star, Users } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


interface MatchCardProps {
  match: Match;
  onBetNow: (match: Match) => void;
  onViewMyBets: (match: Match) => void;
  onCountdownEnd: (matchId: string) => void;
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

const PlayerList = ({ team }: { team: Team }) => {
    if (!team.players || team.players.length === 0) {
        return (
            <div>
                <h4 className="font-semibold text-sm mb-2 text-center">{team.name}</h4>
                <p className="text-xs text-muted-foreground text-center">No players listed.</p>
            </div>
        );
    }
    return (
        <div>
            <h4 className="font-semibold text-sm mb-2 text-center">{team.name}</h4>
            <ScrollArea className="h-32">
                <div className="space-y-2 pr-4">
                    {team.players.map((player, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={player.imageUrl} alt={player.name} />
                                <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium truncate">{player.name}</span>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};


export function MatchCard({ match, onBetNow, onViewMyBets, onCountdownEnd }: MatchCardProps) {
  const { teamA, teamB, status, score, winner, sport, startTime, winners, isSpecialMatch } = match;
  const { user } = useAuth();

  const currentUserWon = status === 'Finished' && user && winners?.some(w => w.userId === user.uid);

  return (
    <>
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
              {/* Team A Display */}
              <div className="flex-1 flex flex-col items-center gap-2">
                  <Image src={teamA.logoUrl} alt={teamA.name} width={56} height={56} className="rounded-full object-cover" data-ai-hint="logo" />
                  <div className="flex items-center gap-1.5">
                      {status === 'Finished' && winner === teamA.name && <Trophy className="h-4 w-4 text-primary" />}
                      <p className={cn("font-semibold text-sm leading-tight", status === 'Finished' && winner === teamA.name && "font-bold text-primary")}>{teamA.name}</p>
                  </div>
              </div>
              
              <div className="flex flex-col items-center">
                {status === 'Live' && <Badge variant="destructive" className="animate-pulse mb-1">LIVE</Badge>}
                <p className="text-xl sm:text-2xl font-bold text-muted-foreground font-headline">
                  {score ? score : 'vs'}
                </p>
              </div>

              {/* Team B Display */}
              <div className="flex-1 flex flex-col items-center gap-2">
                  <Image src={teamB.logoUrl} alt={teamB.name} width={56} height={56} className="rounded-full object-cover" data-ai-hint="logo" />
                  <div className="flex items-center gap-1.5">
                      {status === 'Finished' && winner === teamB.name && <Trophy className="h-4 w-4 text-primary" />}
                      <p className={cn("font-semibold text-sm leading-tight", status === 'Finished' && winner === teamB.name && "font-bold text-primary")}>{teamB.name}</p>
                  </div>
              </div>
          </div>

          {isSpecialMatch && (teamA.players?.length || teamB.players?.length) ? (
              <Accordion type="single" collapsible className="w-full !mt-6">
                  <AccordionItem value="players" className="border rounded-md">
                      <AccordionTrigger className="text-xs font-medium hover:no-underline justify-center py-2 px-3">
                          <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>View Players</span>
                          </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <PlayerList team={teamA} />
                              <PlayerList team={teamB} />
                          </div>
                      </AccordionContent>
                  </AccordionItem>
              </Accordion>
          ) : null}
        </CardContent>

        {status === 'Upcoming' && (
          <CardFooter className="p-4 pt-0 flex-col items-stretch gap-2">
            <div className="text-center bg-accent/10 text-accent-foreground p-2 rounded-md w-full">
                <p className="text-xs">Betting closes in:</p>
                <Countdown targetDate={new Date(startTime)} onEnd={() => onCountdownEnd(match.id)} />
            </div>
            <Button
              className="w-full font-bold bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => onBetNow(match)}
            >
              Bet Now
            </Button>
          </CardFooter>
        )}

        {status === 'Live' && (
          <CardFooter className="p-4 pt-0 flex-col items-stretch gap-2">
            <Button
              className="w-full font-bold"
              onClick={() => onViewMyBets(match)}
            >
              View My Bets
            </Button>
            {isSpecialMatch && (
              <Accordion type="single" collapsible className="w-full !mt-2">
                <AccordionItem value="players" className="border rounded-md">
                  <AccordionTrigger className="text-xs font-medium hover:no-underline justify-center py-2 px-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>View Teams</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <PlayerList team={teamA} />
                      <PlayerList team={teamB} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </CardFooter>
        )}

        {status === 'Finished' && (
          <CardFooter className="p-2 border-t bg-muted/50">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="winners" className="border-b-0">
                <AccordionTrigger className="py-2 px-3 text-sm font-medium hover:no-underline [&[data-state=open]]:bg-transparent">
                  <div className="flex items-center gap-2 mx-auto">
                    <span>
                      {winners && winners.length > 0 ? `${winners.length} Winner(s) Found` : "No Winners"}
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
                    <p className="text-center text-sm text-muted-foreground py-4">There were no winners for this match.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardFooter>
        )}
      </Card>
    </>
  );
}
