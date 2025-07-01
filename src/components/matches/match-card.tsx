"use client";

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Countdown } from '@/components/countdown';
import { SportIcon } from '@/components/icons';
import type { Match } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Flame, CheckCircle, Clock } from 'lucide-react';

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
  const { teamA, teamB, status, score, winner, sport, startTime } = match;

  const getTeamClass = (teamName: string) => {
    if (status !== 'Finished') return 'text-foreground';
    return winner === teamName ? 'font-bold text-primary' : 'text-muted-foreground opacity-70';
  };

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="p-4 bg-muted/30 border-b flex flex-row items-center justify-between">
         <div className="flex items-center gap-2">
            <SportIcon sport={sport} className="w-5 h-5 text-primary" />
            <p className="text-sm font-semibold">{sport}</p>
         </div>
         <StatusIndicator status={status} />
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center text-center">
            <div className={cn("flex-1 flex flex-col items-center gap-2", getTeamClass(teamA.name))}>
                <Image src={teamA.logoUrl} alt={teamA.name} width={48} height={48} className="rounded-full" data-ai-hint="logo" />
                <p className="font-semibold text-sm leading-tight">{teamA.name}</p>
            </div>
            
            <div className="flex flex-col items-center">
              {status === 'Live' && <Badge variant="destructive" className="animate-pulse mb-1">LIVE</Badge>}
              <p className="text-lg font-bold text-muted-foreground font-headline">
                {score ? score : 'vs'}
              </p>
            </div>

            <div className={cn("flex-1 flex flex-col items-center gap-2", getTeamClass(teamB.name))}>
                <Image src={teamB.logoUrl} alt={teamB.name} width={48} height={48} className="rounded-full" data-ai-hint="logo" />
                <p className="font-semibold text-sm leading-tight">{teamB.name}</p>
            </div>
        </div>

        {status === 'Upcoming' && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-center bg-accent/10 text-accent-foreground p-2 rounded-md w-full">
                <p className="text-xs">Betting closes in:</p>
                <Countdown targetDate={startTime} />
            </div>
            <Button
              className="w-full font-bold bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => onBetNow(match)}
            >
              Bet Now
            </Button>
          </div>
        )}
        
        {status === 'Finished' && winner && (
          <p className="text-center text-sm text-primary font-semibold p-2 bg-primary/10 rounded-md">
            {winner} won the match!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
