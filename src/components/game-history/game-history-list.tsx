
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
import type { Bet, Match, Prediction } from "@/lib/types";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { getUserBets } from "@/app/actions/bet.actions";
import { Skeleton } from "../ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

const PlayerPredictionDisplay = ({ prediction, teamAName, teamBName }: { prediction: Prediction, teamAName: string, teamBName: string }) => {
    const isTeamA = prediction.predictedAnswer && typeof prediction.predictedAnswer.teamA !== 'undefined';
    const isTeamB = prediction.predictedAnswer && typeof prediction.predictedAnswer.teamB !== 'undefined';
    const teamName = isTeamA ? teamAName : teamBName;
    const answer = isTeamA ? prediction.predictedAnswer.teamA : (isTeamB ? prediction.predictedAnswer.teamB : '');
    const [playerName] = prediction.questionId.split(':');

    return (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 text-xs">
            <div className="text-primary font-semibold text-center">{isTeamA ? answer : ''}</div>
            <div className="text-muted-foreground text-center truncate">{`(${playerName}) ${prediction.questionText}`}</div>
            <div className="text-primary font-semibold text-center">{isTeamB ? answer : ''}</div>
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
      case "Won":
        return "bg-green-500 text-white";
      case "Lost":
        return "bg-red-500 text-white";
      case "Pending":
        return "bg-yellow-500 text-black";
      default:
        return "bg-gray-500 text-white";
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
        return (
             Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                </TableRow>
             ))
        );
    }
    
    if (bets.length === 0) {
        return (
            <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                     You haven't placed any bets yet. Go to the matches page to make your first prediction!
                </TableCell>
            </TableRow>
        );
    }

    return bets.map((bet) => {
        const [teamAName, teamBName] = bet.matchDescription.split(' vs ');
        return (
        <TableRow key={bet.id}>
            <TableCell>
            <div className="font-semibold">{bet.matchDescription}</div>
            <div className="text-xs text-muted-foreground mt-1">
                {new Date(bet.timestamp).toLocaleString()}
            </div>
            </TableCell>
            <TableCell>
                {(bet.betType === 'player' && bet.predictions.length > 0) ? (
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-b-0">
                    <AccordionTrigger className="text-xs py-1 hover:no-underline">
                        View {bet.predictions.length} player prediction(s)
                    </AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-2 pt-2">
                            {bet.predictions.map((p, index) => (
                                <li key={index} className="text-xs border-l-2 pl-2 border-muted space-y-1">
                                <PlayerPredictionDisplay prediction={p} teamAName={teamAName} teamBName={teamBName} />
                                </li>
                            ))}
                        </ul>
                    </AccordionContent>
                    </AccordionItem>
                </Accordion>
                ) : bet.predictions.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-b-0">
                    <AccordionTrigger className="text-xs py-1 hover:no-underline">
                        View {bet.predictions.length} predictions
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2 pt-2 text-xs">
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 text-center font-semibold">
                            <div>{teamAName}</div>
                            <div></div>
                            <div>{teamBName}</div>
                            </div>
                            {bet.predictions.map((p, index) => (
                            <div key={index} className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 p-2 rounded-md bg-muted/50">
                                <div className="text-primary font-semibold text-center">{p.predictedAnswer?.teamA || 'N/A'}</div>
                                <div className="text-muted-foreground text-center truncate">{p.questionText}</div>
                                <div className="text-primary font-semibold text-center">{p.predictedAnswer?.teamB || 'N/A'}</div>
                            </div>
                            ))}
                        </div>
                    </AccordionContent>
                    </AccordionItem>
                </Accordion>
                ) : (
                <span className="text-xs text-muted-foreground">No predictions</span>
                )}
            </TableCell>
            <TableCell className="text-right">INR {bet.amount.toFixed(2)}</TableCell>
            <TableCell className="text-right">
            <Badge className={cn("text-xs", getStatusClass(bet.status))}>
                {bet.status}
            </Badge>
            </TableCell>
        </TableRow>
        )
    })
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Game History</CardTitle>
            <CardDescription>
                A complete record of all your bets.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Match & Date</TableHead>
                    <TableHead>Predictions</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {renderContent()}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
}
