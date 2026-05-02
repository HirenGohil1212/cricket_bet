"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Countdown } from '@/components/countdown';
import type { Match, Team } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Flame, Clock, Trophy, Star, Heart, Info, Calendar, MapPin, ClipboardList } from 'lucide-react';
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
        "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full",
        isLive ? "bg-red-500 text-white" : "bg-secondary text-secondary-foreground"
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
                    <Avatar className="h-9 w-9 border border-primary/20">
                        <AvatarImage src={player.imageUrl} alt={player.name} className="object-cover" />
                        <AvatarFallback className="bg-secondary text-primary">{player.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{player.name}</span>
                </div>
            ))}
        </div>
    );
};

const MatchInfoDialogContent = ({ match }: { match: Match }) => (
    <DialogContent className="sm:max-w-3xl bg-[#0a140f] border-none text-foreground">
        <DialogHeader>
            <DialogTitle className="font-headline text-3xl text-center text-primary uppercase italic">Match Info</DialogTitle>
             <DialogDescription asChild>
                <div className="text-center pt-2">
                    <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {match.league && <span className="text-white">{match.league}</span>}
                        {match.league && match.location && <span className="opacity-30">•</span>}
                        {match.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{match.location}</span>}
                    </div>
                </div>
            </DialogDescription>
        </DialogHeader>
        <div className="my-6">
            <div className="relative flex justify-center items-center">
                <Separator className="bg-white/10" />
                <div className="absolute bg-[#0a140f] px-4">
                    <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-tighter">
                        <Calendar className="h-3.5 w-3.5"/>
                        <span>{new Date(match.startTime).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-8 items-start">
            <div className="space-y-4 text-center">
                 <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30 p-1 bg-white/5">
                        <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={64} height={64} className="object-cover w-full h-full" />
                    </div>
                    <h3 className="text-lg font-black font-headline text-white uppercase tracking-tight leading-tight">{match.teamA.name}</h3>
                </div>
                <Separator className="bg-white/5" />
                <ScrollArea className="h-48 pr-2">
                    <PlayerList team={match.teamA} />
                </ScrollArea>
            </div>
            
            <div className="space-y-4 text-center">
                 <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30 p-1 bg-white/5">
                        <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={64} height={64} className="object-cover w-full h-full" />
                    </div>
                    <h3 className="text-lg font-black font-headline text-white uppercase tracking-tight leading-tight">{match.teamB.name}</h3>
                </div>
                <Separator className="bg-white/5" />
                 <ScrollArea className="h-48 pr-2">
                    <PlayerList team={match.teamB} />
                </ScrollArea>
            </div>
        </div>
    </DialogContent>
);


export function MatchCard({ match, onBetNow, onViewMyBets, onCountdownEnd, onToggleFavorite }: MatchCardProps) {
  const { teamA, teamB, status, score, winner, sport, startTime, winners, questions, isFavorite, league } = match;
  const { user } = useAuth();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const currentUserWon = status === 'Finished' && user && winners?.some(w => w.userId === user.uid);

  return (
    <Card className={cn(
        "overflow-hidden transition-all duration-300 flex flex-col group border-white/5 bg-secondary/40 backdrop-blur-sm",
        currentUserWon && "border-primary shadow-[0_0_20px_rgba(250,204,82,0.2)]",
      )}>
        <CardHeader className="p-0 relative bg-gradient-to-tr from-black/80 via-white/5 to-black/80 border-b border-white/5">
            <div className="flex justify-between items-start p-3 w-full absolute top-0 z-10">
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                    {sport}
                </Badge>
                <div className="flex items-center gap-1.5">
                    {status === 'Upcoming' && <StatusIndicator status={status} />}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/5 rounded-full"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(match.id);
                        }}
                    >
                        <Heart className={cn("h-4 w-4 transition-all", isFavorite && "fill-red-500 text-red-500")} />
                    </Button>
                </div>
            </div>

            <div className="pt-10 pb-6 px-4 flex flex-col items-center gap-3">
                <div className="flex items-center justify-between w-full gap-2">
                    <p className="flex-1 font-headline font-black text-sm text-white text-center uppercase tracking-tight leading-tight line-clamp-2">{teamA.name}</p>
                    <div className="text-2xl font-black text-primary/40 font-headline italic">VS</div>
                    <p className="flex-1 font-headline font-black text-sm text-white text-center uppercase tracking-tight leading-tight line-clamp-2">{teamB.name}</p>
                </div>
                 {league && <p className="text-[10px] font-black text-primary/60 text-center uppercase tracking-[0.2em]">{league}</p>}
            </div>
        </CardHeader>
        
        <CardContent className="p-4 flex-grow">
           <div className="flex justify-between items-center">
              <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white/5 shadow-2xl bg-white/5 p-1">
                    <Image src={teamA.logoUrl} alt={teamA.name} width={64} height={64} className="object-cover w-full h-full" />
                  </div>
                  {status === 'Finished' && winner === teamA.name && (
                    <div className="flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full border border-primary/30">
                        <Trophy className="h-3 w-3 text-primary" />
                        <span className="font-black text-[8px] text-primary uppercase">Winner</span>
                    </div>
                  )}
              </div>
              
              <div className="flex flex-col items-center px-4">
                {status === 'Live' && <Badge variant="destructive" className="animate-pulse text-[9px] font-black px-3 py-0.5 rounded-full">LIVE</Badge>}
                <p className="text-2xl sm:text-3xl font-black text-white font-headline tracking-tighter italic">
                  {score ? score : "•"}
                </p>
              </div>

              <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white/5 shadow-2xl bg-white/5 p-1">
                    <Image src={teamB.logoUrl} alt={teamB.name} width={64} height={64} className="object-cover w-full h-full" />
                  </div>
                   {status === 'Finished' && winner === teamB.name && (
                    <div className="flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full border border-primary/30">
                        <Trophy className="h-3 w-3 text-primary" />
                        <span className="font-black text-[8px] text-primary uppercase">Winner</span>
                    </div>
                  )}
              </div>
          </div>
        </CardContent>

        {(status === 'Upcoming' || status === 'Live') && (
          <CardFooter className="p-4 pt-0 flex-col gap-3">
            {status === 'Upcoming' && (
              <div className="text-center bg-primary/5 border border-primary/10 p-2 rounded-xl w-full">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Starts In</p>
                  <div className="text-primary font-bold text-sm">
                    <Countdown targetDate={new Date(startTime)} onEnd={() => onCountdownEnd(match.id)} />
                  </div>
              </div>
            )}
            <Button
              className="w-full font-black bg-primary hover:bg-primary/80 text-primary-foreground text-xs uppercase tracking-tight h-11 rounded-xl shadow-lg shadow-primary/10 active:scale-95 transition-transform"
              onClick={() => onBetNow(match)}
            >
              Play Your Game
            </Button>
            <div className="flex gap-2 w-full">
                <Button
                    className="flex-1 font-bold text-[10px] uppercase border-white/10 hover:bg-white/5 h-9 rounded-lg"
                    onClick={() => onViewMyBets(match)}
                    variant="outline"
                >
                    My Bets
                </Button>
                 <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0 h-9 w-9 border-white/10 hover:bg-white/5 rounded-lg"
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
          <CardFooter className="p-4 pt-0 flex-col gap-3">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="results" className="border-none">
                <AccordionTrigger className="py-2 px-3 text-[10px] font-black uppercase tracking-widest text-primary hover:no-underline bg-primary/5 rounded-lg border border-primary/10">
                  <div className="flex items-center gap-2 mx-auto">
                    <ClipboardList className="h-3.5 w-3.5" />
                    <span>View Match Results</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3 pb-0 space-y-2">
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {winners && winners.length > 0 && (
                             <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                                <p className="text-[8px] font-black text-primary/50 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Trophy className="h-2.5 w-2.5"/> Winners</p>
                                <div className="space-y-1.5">
                                    {winners.map((win, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-[10px]">
                                            <span className={cn("font-bold", win.userId === user?.uid ? "text-primary" : "text-white/70")}>{win.name}</span>
                                            <span className="font-black tabular-nums">₹{win.payoutAmount.toFixed(0)}</span>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        )}
                        {questions && questions.map((q) => (
                          <div key={q.id} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight mb-1">{q.question}</p>
                            {q.result && (
                                <div className="flex justify-around text-[10px] font-black text-primary">
                                    <span>{teamA.name}: {q.result?.teamA || 'N/A'}</span>
                                    <span>{teamB.name}: {q.result?.teamB || 'N/A'}</span>
                                </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <div className="flex gap-2 w-full">
                <Button
                    className="flex-1 font-bold text-[10px] uppercase border-white/10 hover:bg-white/5 h-9 rounded-lg"
                    onClick={() => onViewMyBets(match)}
                    variant="outline"
                >
                    My Bets
                </Button>
                 <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0 h-9 w-9 border-white/10 hover:bg-white/5 rounded-lg"
                        >
                            <Info className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <MatchInfoDialogContent match={match} />
                </Dialog>
            </div>
          </CardFooter>
        )}
    </Card>
  );
}
