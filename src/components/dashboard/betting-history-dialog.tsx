
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
                <TableHead>Match & Question</TableHead>
                <TableHead>Your Prediction</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bets.map((bet) => (
                <TableRow key={bet.id}>
                  <TableCell>
                    <div className="font-semibold">{bet.matchDescription}</div>
                    <div className="text-xs text-muted-foreground">{bet.questionText}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {new Date(bet.timestamp).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{bet.prediction}</TableCell>
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
      <DialogContent className="sm:max-w-2xl">
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
