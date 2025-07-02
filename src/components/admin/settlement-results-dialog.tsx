
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Winner } from '@/lib/types';
import { CheckCircle, Trophy } from 'lucide-react';

interface SettlementResultsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    results: {
        winners: Winner[];
        totalBetsProcessed?: number;
    } | null;
}

export function SettlementResultsDialog({ isOpen, onClose, results }: SettlementResultsDialogProps) {
    if (!results) return null;

    const { winners, totalBetsProcessed } = results;
    const totalPayout = winners.reduce((sum, winner) => sum + winner.payoutAmount, 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Trophy className="text-primary"/> 
                        {totalBetsProcessed !== undefined ? 'Settlement Complete' : 'Match Winners'}
                    </DialogTitle>
                     <DialogDescription>
                        {totalBetsProcessed !== undefined 
                            ? `Processed ${totalBetsProcessed} bets. Found ${winners.length} winner(s) with a total payout of INR ${totalPayout.toFixed(2)}.`
                            : `This match had ${winners.length} winner(s), with a total payout of INR ${totalPayout.toFixed(2)}.`
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    <h3 className="font-semibold mb-2">Winners List</h3>
                    <ScrollArea className="h-64 border rounded-md">
                        {winners.length > 0 ? (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Winner Name</TableHead>
                                        <TableHead className="text-right">Payout Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {winners.map((winner, index) => (
                                        <TableRow key={`${winner.userId}-${index}`}>
                                            <TableCell className="font-medium">{winner.name}</TableCell>
                                            <TableCell className="text-right font-semibold">INR {winner.payoutAmount.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                                <CheckCircle className="h-8 w-8 mb-2"/>
                                <p>No winners for this match.</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>
                <DialogFooter className="mt-6">
                     <Button onClick={onClose}>Close</Button>
               </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
