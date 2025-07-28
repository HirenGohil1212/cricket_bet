
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

const StatusIndicator = ({ status, isLive }: { status: Match['status'], isLive: boolean }) => {
  return (
    <div className={cn(
        "flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full",
        isLive ? "bg-red-500/10 text-red-500" : "bg-foreground/10 text-foreground"
    )}>
      {isLive ? <Flame className="h-3 w-3 animate-pulse" /> : <Clock className="h-3 w-3" />}
      <span>{status}</span>
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
    <Card className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out flex flex-col group hover:shadow-2xl hover:border-primary/50",
        currentUserWon && "border-accent ring-2 ring-accent",
        status === 'Finished' ? "bg-muted/40" : "bg-card"
      )}>
        <CardHeader className="p-0 relative h-24 flex items-center justify-center overflow-hidden bg-zinc-800" style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('https://placehold.co/600x400.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }}
        data-ai-hint="stadium lights"
        >
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                <SportIcon sport={sport} className="w-4 h-4" />
                <span>{sport}</span>
            </div>

            <div className="flex justify-around items-center w-full px-4">
                <p className="font-headline font-bold text-lg text-white text-center truncate">{teamA.name}</p>
                <div className="mx-4 text-3xl font-bold text-white/50">vs</div>
                <p className="font-headline font-bold text-lg text-white text-center truncate">{teamB.name}</p>
            </div>
            
            {isSpecialMatch && <div className="absolute top-3 right-3"><Badge variant="destructive" className="bg-accent text-accent-foreground animate-pulse">SPECIAL</Badge></div>}

        </CardHeader>
        
        <CardContent className="p-4 space-y-4 flex-grow">
           <div className="flex justify-between items-center text-center">
              {/* Team A Display */}
              <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-2 border-card shadow-lg bg-background">
                    <Image src={teamA.logoUrl} alt={teamA.name} width={64} height={64} className="object-cover" data-ai-hint="logo" />
                  </div>
                  {status === 'Finished' && (
                    <div className="flex items-center gap-1.5 mt-1">
                        {winner === teamA.name && <Trophy className="h-4 w-4 text-amber-400" />}
                        <p className={cn("font-bold text-sm", winner === teamA.name ? "text-primary" : "text-muted-foreground")}>{winner === teamA.name ? 'Winner' : 'Lost'}</p>
                    </div>
                  )}
              </div>
              
              <div className="flex flex-col items-center px-2">
                {status === 'Live' && <Badge variant="destructive" className="animate-pulse mb-1">LIVE</Badge>}
                <p className="text-3xl font-bold text-foreground font-headline">
                  {score ? score : <span className="text-muted-foreground">-</span>}
                </p>
                <p className="text-xs text-muted-foreground">{status === 'Finished' ? 'Final Score' : 'Score'}</p>
              </div>

              {/* Team B Display */}
              <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-2 border-card shadow-lg bg-background">
                    <Image src={teamB.logoUrl} alt={teamB.name} width={64} height={64} className="object-cover" data-ai-hint="logo" />
                  </div>
                   {status === 'Finished' && (
                    <div className="flex items-center gap-1.5 mt-1">
                        {winner === teamB.name && <Trophy className="h-4 w-4 text-amber-400" />}
                        <p className={cn("font-bold text-sm", winner === teamB.name ? "text-primary" : "text-muted-foreground")}>{winner === teamB.name ? 'Winner' : 'Lost'}</p>
                    </div>
                  )}
              </div>
          </div>
        </CardContent>

        {status === 'Upcoming' && (
          <CardFooter className="p-3 pt-0 flex-col items-stretch gap-2">
            <div className="text-center bg-accent/10 text-accent-foreground p-2 rounded-md w-full">
                <p className="text-xs font-semibold">Betting closes in:</p>
                <Countdown targetDate={new Date(startTime)} onEnd={() => onCountdownEnd(match.id)} />
            </div>
            <Button
              className="w-full font-bold bg-accent text-accent-foreground hover:bg-accent/90 transform-gpu group-hover:scale-105 transition-transform duration-300"
              onClick={() => onBetNow(match)}
              size="lg"
            >
              Place Your Bet
            </Button>
          </CardFooter>
        )}

        {status === 'Live' && (
          <CardFooter className="p-3 pt-0 flex-col items-stretch gap-2">
            <Button
              className="w-full font-bold"
              onClick={() => onViewMyBets(match)}
            >
              View My Bets
            </Button>
          </CardFooter>
        )}

        {status === 'Finished' && (
          <CardFooter className="p-2 border-t bg-muted/50">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="winners" className="border-b-0">
                <AccordionTrigger className="py-2 px-3 text-sm font-medium hover:no-underline [&[data-state=open]]:bg-transparent">
                  <div className="flex items-center gap-2 mx-auto">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span>
                      {winners && winners.length > 0 ? `${winners.length} Winner(s)` : "No Winners"}
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
                            win.userId === user?.uid ? "bg-accent/20" : "bg-background"
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
  );
}
