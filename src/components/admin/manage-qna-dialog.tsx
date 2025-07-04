'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Match, Question, Winner } from '@/lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { saveQuestionResults, settleMatchAndPayouts } from '@/app/actions/qna.actions';
import { Alert, AlertDescription } from '../ui/alert';
import { Info } from 'lucide-react';
import { Label } from '../ui/label';
import { SettlementResultsDialog } from './settlement-results-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';


interface ManageQnaDialogProps {
    match: Match;
    questions: Question[];
    isOpen: boolean;
    onClose: (shouldRefresh: boolean) => void;
}

export function ManageQnaDialog({ match, questions, isOpen, onClose }: ManageQnaDialogProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isSaving, setIsSaving] = React.useState(false);
    const [isSettling, setIsSettling] = React.useState(false);
    
    // State for text-based results
    const [results, setResults] = React.useState<Record<string, { teamA: string; teamB: string }>>({});
    // State for player-based results (for special matches)
    const [playerResults, setPlayerResults] = React.useState<Record<string, { teamA: string; teamB: string }>>({});
    
    // New state for the settlement results
    const [settlementResults, setSettlementResults] = React.useState<{ winners: Winner[]; totalBetsProcessed: number; } | null>(null);
    const [isResultsDialogOpen, setIsResultsDialogOpen] = React.useState(false);

    // Initialize or update results state when questions change
    React.useEffect(() => {
        if (questions) {
            const initialResults = questions.reduce((acc, q) => {
                acc[q.id] = q.result || { teamA: '', teamB: '' };
                return acc;
            }, {} as Record<string, { teamA: string; teamB: string }>);
            setResults(initialResults);
            
            const initialPlayerResults = questions.reduce((acc, q) => {
                acc[q.id] = q.playerResult || { teamA: '', teamB: '' };
                return acc;
            }, {} as Record<string, { teamA: string; teamB: string }>);
            setPlayerResults(initialPlayerResults);
        }
    }, [questions]);
    
    const handleResultChange = (questionId: string, team: 'teamA' | 'teamB', value: string) => {
        setResults(prev => ({
            ...prev,
            [questionId]: {
                ...(prev[questionId] || { teamA: '', teamB: '' }),
                [team]: value,
            },
        }));
    };
    
    const handlePlayerResultChange = (questionId: string, team: 'teamA' | 'teamB', value: string) => {
        setPlayerResults(prev => ({
            ...prev,
            [questionId]: {
                ...(prev[questionId] || { teamA: '', teamB: '' }),
                [team]: value,
            },
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const actionResult = await saveQuestionResults(match.id, results, playerResults);

        if (actionResult.error) {
            toast({ variant: 'destructive', title: 'Save Failed', description: actionResult.error });
        } else {
            toast({ title: 'Success', description: actionResult.success });
            onClose(true); // Close and refresh questions
        }
        setIsSaving(false);
    };

    const handleSettle = async () => {
        setIsSettling(true);
        const actionResult = await settleMatchAndPayouts(match.id);
        setIsSettling(false);

        if (actionResult.error) {
            toast({ variant: 'destructive', title: 'Settlement Failed', description: actionResult.error });
        } else {
            toast({ title: 'Success', description: actionResult.success });
            onClose(true); // Close QNA dialog and trigger parent refresh
            if (actionResult.winners) {
                setSettlementResults({ 
                    winners: actionResult.winners,
                    totalBetsProcessed: actionResult.totalBetsProcessed || 0
                });
                setIsResultsDialogOpen(true);
            }
        }
    };

    const hasActiveQuestions = questions.some(q => q.status === 'active');
    
    const QnaSection = (
        <Card>
            <CardHeader>
                <CardTitle>Q&A Results</CardTitle>
                <CardDescription>Enter the text-based results for each question.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {questions.length > 0 ? (
                    questions.map(q => {
                        const isSettled = q.status === 'settled';
                        return (
                            <div key={q.id} className="p-4 border rounded-md space-y-4">
                                <p className="font-semibold text-muted-foreground text-center block">{q.question}</p>
                                
                                {isSettled && q.result ? (
                                    <div className="flex items-center justify-around gap-2 text-green-600 font-semibold p-2 bg-green-500/10 rounded-md">
                                        <span>{match.teamA.name}: {q.result.teamA}</span>
                                        <span>{match.teamB.name}: {q.result.teamB}</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor={`${q.id}-teamA`} className="text-xs">{match.teamA.name}</Label>
                                            <Input
                                                id={`${q.id}-teamA`}
                                                placeholder="Result for Team A"
                                                value={results[q.id]?.teamA || ''}
                                                onChange={(e) => handleResultChange(q.id, 'teamA', e.target.value)}
                                                disabled={isSaving || isSettling}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor={`${q.id}-teamB`} className="text-xs">{match.teamB.name}</Label>
                                            <Input
                                                id={`${q.id}-teamB`}
                                                placeholder="Result for Team B"
                                                value={results[q.id]?.teamB || ''}
                                                onChange={(e) => handleResultChange(q.id, 'teamB', e.target.value)}
                                                disabled={isSaving || isSettling}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    <p className='text-center text-muted-foreground p-8'>No questions found for this match.</p>
                )}
            </CardContent>
        </Card>
    );
    
    const PlayerSection = (
        <Card>
            <CardHeader>
                <CardTitle>Winning Player Selection</CardTitle>
                <CardDescription>Select the winning player for each question.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {questions.length > 0 ? (
                    questions.map(q => {
                        const isSettled = q.status === 'settled';
                        return (
                             <div key={q.id} className="p-4 border rounded-md space-y-4">
                                <p className="font-semibold text-muted-foreground text-center block">{q.question}</p>
                                 {isSettled && q.playerResult ? (
                                    <div className="flex items-center justify-around gap-2 text-green-600 font-semibold p-2 bg-green-500/10 rounded-md">
                                        <span>{match.teamA.name}: {q.playerResult.teamA}</span>
                                        <span>{match.teamB.name}: {q.playerResult.teamB}</span>
                                    </div>
                                 ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="rounded-md border p-2 space-y-2">
                                            <Label className="px-1 font-semibold">{match.teamA.name}</Label>
                                            <ScrollArea className="h-40">
                                                <RadioGroup
                                                    value={playerResults[q.id]?.teamA || ''}
                                                    onValueChange={(value) => handlePlayerResultChange(q.id, 'teamA', value)}
                                                    disabled={isSaving || isSettling}
                                                    className="space-y-1 p-1"
                                                >
                                                    {(match.teamA.players && match.teamA.players.length > 0) ? (
                                                        match.teamA.players.map(player => (
                                                            <Label key={player.name} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer font-normal">
                                                                <RadioGroupItem value={player.name} id={`${q.id}-a-${player.name}`} />
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={player.imageUrl} alt={player.name} />
                                                                    <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                                                                </Avatar>
                                                                <span>{player.name}</span>
                                                            </Label>
                                                        ))
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                                            <p>No players listed.</p>
                                                        </div>
                                                    )}
                                                </RadioGroup>
                                            </ScrollArea>
                                        </div>
                                        <div className="rounded-md border p-2 space-y-2">
                                            <Label className="px-1 font-semibold">{match.teamB.name}</Label>
                                            <ScrollArea className="h-40">
                                                <RadioGroup
                                                    value={playerResults[q.id]?.teamB || ''}
                                                    onValueChange={(value) => handlePlayerResultChange(q.id, 'teamB', value)}
                                                    disabled={isSaving || isSettling}
                                                    className="space-y-1 p-1"
                                                >
                                                    {(match.teamB.players && match.teamB.players.length > 0) ? (
                                                        match.teamB.players.map(player => (
                                                            <Label key={player.name} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer font-normal">
                                                                <RadioGroupItem value={player.name} id={`${q.id}-b-${player.name}`} />
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={player.imageUrl} alt={player.name} />
                                                                    <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                                                                </Avatar>
                                                                <span>{player.name}</span>
                                                            </Label>
                                                        ))
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                                            <p>No players listed.</p>
                                                        </div>
                                                    )}
                                                </RadioGroup>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                 )}
                            </div>
                        )
                    })
                ) : (
                     <p className='text-center text-muted-foreground p-8'>No questions found for this match.</p>
                )}
            </CardContent>
        </Card>
    );

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Manage Q&A for {match.teamA.name} vs {match.teamB.name}</DialogTitle>
                        <DialogDescription>
                           Enter and save the results for each question, then finalize to process payouts.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] overflow-y-auto p-1 mt-4">
                        <div className="space-y-6">
                           {QnaSection}
                           {match.isSpecialMatch && PlayerSection}
                        </div>
                    </ScrollArea>
                    <DialogFooter className="mt-6 flex-col sm:flex-row items-center sm:justify-between w-full">
                       <Alert className="sm:max-w-xs text-left">
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                                Save results first, then Settle to pay winners. Payouts are irreversible.
                            </AlertDescription>
                       </Alert>
                       <div className="flex justify-end gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                         <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isSaving || isSettling}>Cancel</Button>
                         <Button type="button" variant="outline" onClick={handleSave} disabled={isSaving || isSettling || match.status === 'Finished'}>
                             {isSaving ? 'Saving...' : 'Save Results'}
                         </Button>
                         <Button type="button" variant="destructive" onClick={handleSettle} disabled={isSaving || isSettling || match.status === 'Finished' || !hasActiveQuestions}>
                             {isSettling ? 'Settling...' : (match.status === 'Finished' ? 'Match Settled' : 'Settle &amp; Payout')}
                         </Button>
                       </div>
                   </DialogFooter>
                </DialogContent>
            </Dialog>
            <SettlementResultsDialog
                isOpen={isResultsDialogOpen}
                onClose={() => setIsResultsDialogOpen(false)}
                results={settlementResults}
            />
        </>
    );
}
