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
import { mockBets } from "@/lib/data";
import type { Bet } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BettingHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BettingHistoryDialog({ open, onOpenChange }: BettingHistoryDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">My Betting History</DialogTitle>
          <DialogDescription>
            Review your past bets and their outcomes.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match</TableHead>
                <TableHead>Bet</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockBets.map((bet) => (
                <TableRow key={bet.id}>
                  <TableCell className="font-medium">
                    <div>{bet.matchDescription}</div>
                    <div className="text-xs text-muted-foreground">
                      {bet.timestamp.toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>{bet.prediction}</TableCell>
                  <TableCell className="text-right">₹{bet.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Badge className={cn("text-xs", getStatusClass(bet.status))}>
                      {bet.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
