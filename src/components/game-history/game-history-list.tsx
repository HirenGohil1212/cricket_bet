"use client";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge";
import type { Bet, Prediction } from "@/lib/types";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { getUserBets } from "@/app/actions/bet.actions";
import { Skeleton } from "../ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

const PlayerPredictionDisplay = ({ prediction }: { prediction: Prediction }) => {
    const isTeamA = prediction.predictedAnswer && typeof prediction.predictedAnswer.teamA !== 'undefined';
    const isTeamB = prediction.predictedAnswer && typeof prediction.predictedAnswer.teamB !== 'undefined';
    const answer = isTeamA ? prediction.predictedAnswer.teamA : (isTeamB ? prediction.predictedAnswer.teamB : '');

    return (
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-2 text-[10px]">
            <div className="text-muted-foreground text-left truncate uppercase font-bold tracking-tight">{prediction.questionText}</div>
            <div className="text-primary font-black text-right">{answer}</div>
        </div>
    );
};

export function GameHistoryList() {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function fetchBets() {
        if (user) {
            setIsLoading(true);
            const userBets = await getUserBets(user.uid);
            setBets(userBets);
            setIsLoading(false);
        }
    }
    fetchBets();
  }, [user]);

  const getStatusClass = (status: Bet["status"]) => {
    switch (status) {
      case "Won": return "bg-green-500 text-white";
      case "Lost": return "bg-red-500 text-white";
      case "Pending": return "bg-yellow-500 text-black";
      case "Refunded": return "bg-blue-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
        return (
             Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
             ))
        );
    }
    
    if (bets.length === 0) {
        return (
            <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12 text-sm">
                     No bets placed yet.
                </TableCell>
            </TableRow>
        );
    }

    return bets.map((bet) => {
        const [teamAName, teamBName] = bet.matchDescription.split(' vs ');
        return (
        <TableRow key={bet.id} className="text-[11px] sm:text-sm">
            <TableCell className="max-w-[100px] sm:max-w-none">
                <div className="font-bold uppercase tracking-tighter leading-tight">{bet.matchDescription}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">
                    {new Date(bet.timestamp as any).toLocaleDateString()}
                </div>
            </TableCell>
            <TableCell>
                {bet.predictions.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-b-0">
                    <AccordionTrigger className="text-[10px] py-1 hover:no-underline font-bold uppercase tracking-widest text-primary">
                        {bet.predictions.length} {bet.betType === 'player' ? 'Player' : 'Outcome'}
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2 pt-1 border-t border-white/5">
                            {bet.predictions.map((p, index) => (
                                <PlayerPredictionDisplay key={index} prediction={p} />
                            ))}
                        </div>
                    </AccordionContent>
                    </AccordionItem>
                </Accordion>
                ) : (
                <span className="text-[9px] uppercase font-bold text-muted-foreground">None</span>
                )}
            </TableCell>
            <TableCell className="text-right font-black tabular-nums">
                ₹{bet.amount.toFixed(0)}
            </TableCell>
            <TableCell className="text-right">
                <Badge className={cn("text-[9px] font-black uppercase px-1.5 py-0.5", getStatusClass(bet.status))}>
                    {bet.status}
                </Badge>
            </TableCell>
        </TableRow>
        )
    })
  }

  return (
    <Card className="border-white/5 bg-secondary/20">
        <CardHeader className="pb-4">
            <CardTitle className="font-headline text-2xl uppercase italic">Game History</CardTitle>
            <CardDescription className="text-xs">Your betting history and results.</CardDescription>
        </CardHeader>
        <CardContent className="px-1 sm:px-6">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-white/5">
                        <TableHead className="text-[10px] uppercase font-black tracking-widest">Match</TableHead>
                        <TableHead className="text-[10px] uppercase font-black tracking-widest">Type</TableHead>
                        <TableHead className="text-right text-[10px] uppercase font-black tracking-widest">Bet</TableHead>
                        <TableHead className="text-right text-[10px] uppercase font-black tracking-widest">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderContent()}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
  );
}
