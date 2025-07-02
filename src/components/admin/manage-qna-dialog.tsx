
'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Match, Question } from '@/lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { saveQuestionResults, settleMatchAndPayouts } from '@/app/actions/qna.actions';
import { Alert, AlertDescription } from '../ui/alert';
import { Info } from 'lucide-react';
import { Label } from '../ui/label';

interface ManageQnaDialogProps {
    match: Match;
    questions: Question[];
    isOpen: boolean;
    onClose: (shouldRefresh: boolean) => void;
}

export function ManageQnaDialog({ match, questions, isOpen, onClose }: ManageQnaDialogProps) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    const [isSettling, setIsSettling] = React.useState(false);
    // State to hold the results for each question as an object
    const [results, setResults] = React.useState<Record<string, { teamA: string; teamB: string }>>({});

    // Initialize or update results state when questions change
    React.useEffect(() => {
        if (questions) {
            const initialResults = questions.reduce((acc, q) => {
                acc[q.id] = q.result || { teamA: '', teamB: '' };
                return acc;
            }, {} as Record<string, { teamA: string; teamB: string }>);
            setResults(initialResults);
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

    const handleSave = async () => {
        setIsSaving(true);
        const actionResult = await saveQuestionResults(match.id, results);

        if (actionResult.error) {
            toast({ variant: 'destructive', title: 'Save Failed', description: actionResult.error });
        } else {
            toast({ title: 'Success', description: actionResult.success });
            onClose(true); // Refresh to get updated saved results
        }
        setIsSaving(false);
    };

    const handleSettle = async () => {
        setIsSettling(true);
        const actionResult = await settleMatchAndPayouts(match.id);

        if (actionResult.error) {
            toast({ variant: 'destructive', title: 'Settlement Failed', description: actionResult.error });
        } else {
            toast({ title: 'Success', description: actionResult.success });
            onClose(true); // Refresh data
        }
        setIsSettling(false);
    };

    const hasActiveQuestions = questions.some(q => q.status === 'active');

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Manage Q&amp;A for {match.teamA.name} vs {match.teamB.name}</DialogTitle>
                    <DialogDescription>
                       Enter and save the results for each question, then finalize to process payouts.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto p-1 mt-4 space-y-6">
                    {questions.length > 0 ? (
                         questions.map(q => {
                            const isSettled = q.status === 'settled';

                            return (
                                <div key={q.id} className="p-4 border rounded-md space-y-3">
                                    <Label className="font-semibold text-muted-foreground text-center block">{q.question}</Label>
                                    
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
                </div>
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
                         {isSettling ? 'Settling...' : (match.status === 'Finished' ? 'Match Settled' : 'Settle & Payout')}
                     </Button>
                   </div>
               </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
