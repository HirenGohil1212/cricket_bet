"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import type { Bet } from "@/lib/types";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { getUserBets } from "@/app/actions/bet.actions";
import { Skeleton } from "../ui/skeleton";

interface BettingHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BettingHistoryDialog({ open, onOpenChange }: BettingHistoryDialogProps) {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    async function fetchBets() {
        if (open && user) {
            setIsLoading(true);
            const userBets = await getUserBets(user.uid);
            setBets(userBets);
            setIsLoading(false);
        }
    }
    fetchBets();
  }, [open, user]);


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
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        );
    }
    
    if (bets.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-12">
                <p>You haven't placed any bets yet.</p>
                <p className="text-sm">Go to the matches page to make your first prediction!</p>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match &amp; Date</TableHead>
                <TableHead>Predictions</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bets.map((bet) => (
                <TableRow key={bet.id}>
                  <TableCell>
                    <div className="font-semibold">{bet.matchDescription}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {new Date(bet.timestamp).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                     {bet.predictions.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="item-1">
                            <AccordionTrigger className="text-xs py-1 hover:no-underline">
                              View {bet.predictions.length} predictions
                            </AccordionTrigger>
                            <AccordionContent>
                                <ul className="space-y-2 pt-2">
                                  {bet.predictions.map((p, index) => (
                                    <li key={index} className="text-xs border-l-2 pl-2 border-muted">
                                      <div className="text-muted-foreground">{p.questionText}</div>
                                      <div className="font-medium">
                                          Your answers: 
                                          <span className="text-primary"> {p.predictedAnswer.teamA}</span> / 
                                          <span className="text-primary"> {p.predictedAnswer.teamB}</span>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
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
              ))}
            </TableBody>
          </Table>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">My Betting History</DialogTitle>
          <DialogDescription>
            Review your past bets and their outcomes.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
