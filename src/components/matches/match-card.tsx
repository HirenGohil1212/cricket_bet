

"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Countdown } from '@/components/countdown';
import type { Match, Team } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Flame, CheckCircle, Clock, Trophy, Star, Users, Heart, Info, Calendar, Swords } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '../ui/separator';


interface MatchCardProps {
  match: Match;
  onBetNow: (match: Match) => void;
  onViewMyBets: (match: Match) => void;
  onCountdownEnd: (matchId: string) => void;
  onToggleFavorite: (matchId: string) => void;
}

const StatusIndicator = ({ status }: { status: Match['status'] }) => {
  const isLive = status === 'Live';
  return (
    <div className={cn(
        "flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full",
        isLive ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"
    )}>
      {isLive ? <Flame className="h-3 w-3 animate-pulse" /> : <Clock className="h-3 w-3" />}
      <span>{status}</span>
    </div>
  );
};


const PlayerList = ({ team }: { team: Team }) => {
    if (!team.players || team.players.length === 0) {
        return <p className="text-xs text-muted-foreground text-center col-span-full py-4">No players listed.</p>;
    }
    return (
        <div className="space-y-3">
            {team.players.map((player, index) => (
                <div key={index} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border">
                        <AvatarImage src={player.imageUrl} alt={player.name} />
                        <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{player.name}</span>
                </div>
            ))}
        </div>
    );
};

const MatchInfoDialogContent = ({ match }: { match: Match }) => (
    <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
            <DialogTitle className="font-headline text-3xl text-center text-primary">Match Information</DialogTitle>
            <DialogDescription className="text-center">
                Get all the details about the upcoming clash.
            </DialogDescription>
        </DialogHeader>
        <div className="my-6">
            <div className="relative flex justify-center items-center">
                <Separator />
                <div className="absolute bg-background px-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4"/>
                        <span>{new Date(match.startTime).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-8 items-start">
            {/* Team A */}
            <div className="space-y-4 text-center">
                 <div className="flex flex-col items-center gap-3">
                    <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={64} height={64} className="h-16 w-16 object-contain rounded-full border-2 p-1 bg-white/10" data-ai-hint="logo" />
                    <h3 className="text-xl font-bold font-headline">{match.teamA.name}</h3>
                </div>
                <Separator />
                <ScrollArea className="h-48 pr-4">
                    <PlayerList team={match.teamA} />
                </ScrollArea>
            </div>
            
            {/* Team B */}
            <div className="space-y-4 text-center">
                 <div className="flex flex-col items-center gap-3">
                    <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={64} height={64} className="h-16 w-16 object-contain rounded-full border-2 p-1 bg-white/10" data-ai-hint="logo" />
                    <h3 className="text-xl font-bold font-headline">{match.teamB.name}</h3>
                </div>
                <Separator />
                 <ScrollArea className="h-48 pr-4">
                    <PlayerList team={match.teamB} />
                </ScrollArea>
            </div>
        </div>
    </DialogContent>
);


export function MatchCard({ match, onBetNow, onViewMyBets, onCountdownEnd, onToggleFavorite }: MatchCardProps) {
  const { teamA, teamB, status, score, winner, sport, startTime, winners, isSpecialMatch, isFavorite } = match;
  const { user } = useAuth();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const currentUserWon = status === 'Finished' && user && winners?.some(w => w.userId === user.uid);

  return (
    <Card className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out flex flex-col group hover:shadow-2xl hover:border-primary/50",
        currentUserWon && "border-primary ring-2 ring-primary",
        status === 'Finished' ? "bg-secondary/70" : "bg-secondary"
      )}>
        <CardHeader className="p-0 relative flex flex-col justify-between min-h-[7rem] overflow-hidden bg-gradient-to-tr from-gray-900 via-gray-800 to-gray-900 border-b-2 border-primary/50">
            <div className="absolute top-0 left-0 w-full h-full bg-no-repeat bg-center"/>
            <div className="relative flex justify-between items-start p-3 w-full">
                <Badge variant="secondary" className="bg-primary text-primary-foreground font-semibold">
                    {sport}
                </Badge>
                <div className="flex items-center gap-2">
                    {status === 'Upcoming' && <StatusIndicator status={status} />}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(match.id);
                        }}
                    >
                        <Heart className={cn("h-5 w-5 transition-all", isFavorite && "fill-red-500 text-red-500")} />
                    </Button>
                </div>
            </div>

            <div className="relative flex items-center justify-around w-full px-4 pb-4 gap-2">
                <p className="flex-1 font-headline font-black text-xl text-white text-center tracking-wide" style={{ overflowWrap: 'anywhere' }}>{teamA.name}</p>
                <div className="text-4xl font-black text-white/50 font-headline [text-shadow:_1px_1px_4px_rgb(0_0_0_/_50%)]">vs</div>
                <p className="flex-1 font-headline font-black text-xl text-white text-center tracking-wide" style={{ overflowWrap: 'anywhere' }}>{teamB.name}</p>
            </div>
        </CardHeader>
        
        <CardContent className="p-4 space-y-4 flex-grow">
           <div className="flex justify-between items-center text-center">
              {/* Team A Display */}
              <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-4 border-card shadow-lg bg-background group-hover:scale-110 transition-transform duration-300">
                    <Image src={teamA.logoUrl} alt={teamA.name} width={64} height={64} className="object-cover" data-ai-hint="logo" />
                  </div>
                  {status === 'Finished' && winner === teamA.name && (
                    <div className="flex items-center gap-1.5 mt-1">
                        <Trophy className="h-4 w-4 text-primary" />
                        <p className="font-bold text-sm text-primary">Winner</p>
                    </div>
                  )}
              </div>
              
              <div className="flex flex-col items-center px-2">
                {status === 'Live' && <Badge variant="destructive" className="animate-pulse mb-1">LIVE</Badge>}
                {status !== 'Live' && (
                    <p className="text-3xl font-bold text-foreground font-headline">
                      {score ? score : <span className="text-muted-foreground">vs</span>}
                    </p>
                )}
              </div>

              {/* Team B Display */}
              <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-4 border-card shadow-lg bg-background group-hover:scale-110 transition-transform duration-300">
                    <Image src={teamB.logoUrl} alt={teamB.name} width={64} height={64} className="object-cover" data-ai-hint="logo" />
                  </div>
                   {status === 'Finished' && winner === teamB.name && (
                    <div className="flex items-center gap-1.5 mt-1">
                        <Trophy className="h-4 w-4 text-primary" />
                        <p className="font-bold text-sm text-primary">Winner</p>
                    </div>
                  )}
              </div>
          </div>
        </CardContent>

        {(status === 'Upcoming' || status === 'Live') && (
          <CardFooter className="p-3 pt-0 flex-col items-stretch gap-2">
            {status === 'Upcoming' && (
              <div className="text-center bg-accent/10 text-accent p-2 rounded-md w-full">
                  <p className="text-xs font-semibold">Game will starts in:</p>
                  <Countdown targetDate={new Date(startTime)} onEnd={() => onCountdownEnd(match.id)} />
              </div>
            )}
            <Button
              className="w-full font-bold bg-primary hover:bg-primary/80 transform-gpu group-hover:scale-105 transition-transform duration-300 shadow-lg"
              onClick={() => onBetNow(match)}
              size="lg"
            >
              Play Your Game
            </Button>
            <div className="flex gap-2">
                <Button
                    className="w-full font-bold"
                    onClick={() => onViewMyBets(match)}
                    variant="outline"
                    size="sm"
                >
                    View My Bets
                </Button>
                 <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            aria-label="View Match Info"
                        >
                            <Info className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <MatchInfoDialogContent match={match} />
                </Dialog>
            </div>
          </CardFooter>
        )}

        {status === 'Finished' && (
          <CardFooter className="p-2 border-t bg-black/10">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="winners" className="border-b-0">
                <AccordionTrigger className="py-2 px-3 text-sm font-medium hover:no-underline [&[data-state=open]]:bg-transparent">
                  <div className="flex items-center gap-2 mx-auto">
                    <Trophy className="h-4 w-4 text-primary" />
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
                            win.userId === user?.uid ? "bg-primary/20" : "bg-background"
                          )}>
                            <span className="font-medium truncate">{win.name}</span>
                            <div className="flex items-center gap-2">
                              {win.userId === user?.uid && <Star className="h-4 w-4 text-primary fill-primary" />}
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
