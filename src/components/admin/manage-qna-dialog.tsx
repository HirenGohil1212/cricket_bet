'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Match, Question } from '@/lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { settleMatchAndPayouts } from '@/app/actions/qna.actions';
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
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    // State to hold the results for each question
    const [results, setResults] = React.useState<Record<string, { teamA: string, teamB: string }>>({});
    // State for validation errors
    const [errors, setErrors] = React.useState<Record<string, string | null>>({});

    // Initialize or update results state when questions change
    React.useEffect(() => {
        if (questions) {
            const initialResults = questions.reduce((acc, q) => {
                acc[q.id] = {
                    teamA: q.result?.teamA || '',
                    teamB: q.result?.teamB || '',
                };
                return acc;
            }, {} as Record<string, { teamA: string, teamB: string }>);
            setResults(initialResults);
        }
    }, [questions]);
    
    const handleResultChange = (questionId: string, team: 'teamA' | 'teamB', value: string) => {
        setResults(prev => ({
            ...prev,
            [questionId]: {
                ...prev[questionId],
                [team]: value,
            }
        }));
        // Clear error for this field when user starts typing
        if (errors[questionId]) {
            setErrors(prev => ({ ...prev, [questionId]: null }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string | null> = {};
        let isValid = true;
        
        for (const q of questions) {
            // Only validate unsettled questions
            if (q.status !== 'settled') {
                const result = results[q.id];
                if (!result || !result.teamA.trim() || !result.teamB.trim()) {
                    newErrors[q.id] = 'Both results are required.';
                    isValid = false;
                }
            }
        }
        
        setErrors(newErrors);
        return isValid;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            toast({ variant: 'destructive', title: 'Validation Failed', description: 'Please fill in all required results.' });
            return;
        }

        setIsSubmitting(true);
        
        // Filter out results for already settled questions
        const unsettledResults = Object.keys(results).reduce((acc, qId) => {
             const question = questions.find(q => q.id === qId);
             if (question && question.status !== 'settled') {
                 acc[qId] = results[qId];
             }
             return acc;
        }, {} as Record<string, { teamA: string, teamB: string }>);

        if (Object.keys(unsettledResults).length === 0) {
            toast({ variant: 'default', title: 'No Changes', description: 'All questions for this match have already been settled.' });
            onClose(false);
            setIsSubmitting(false);
            return;
        }

        const actionResult = await settleMatchAndPayouts(match.id, unsettledResults);
        
        if (actionResult.error) {
            toast({ variant: 'destructive', title: 'Settlement Failed', description: actionResult.error });
        } else {
            toast({ title: 'Success', description: actionResult.success });
            onClose(true); // Signal to refresh data
        }
        setIsSubmitting(false);
    };

    const hasUnsettledQuestions = questions.some(q => q.status !== 'settled');

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Manage Q&amp;A for {match.teamA.name} vs {match.teamB.name}</DialogTitle>
                    <DialogDescription>
                       Enter the final correct answers for each question to settle bets and pay out winners.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="max-h-[60vh] overflow-y-auto p-1 mt-4 space-y-6">
                        {questions.length > 0 ? (
                             questions.map(q => {
                                const isSettled = q.status === 'settled';
                                const error = errors[q.id];

                                return (
                                    <div key={q.id} className="p-4 border rounded-md">
                                        <p className="text-center font-medium bg-muted p-3 rounded-md text-sm mb-4">{q.question}</p>
                                        
                                        {isSettled && q.result ? (
                                             <div className="flex items-center justify-around gap-2 text-green-600 font-semibold p-2 bg-green-500/10 rounded-md">
                                                <div className='text-center'>
                                                  <p className='text-xs'>{match.teamA.name}</p>
                                                  <p>{q.result.teamA}</p>
                                                </div>
                                                 <div className='text-center'>
                                                  <p className='text-xs'>{match.teamB.name}</p>
                                                  <p>{q.result.teamB}</p>
                                                </div>
                                             </div>
                                        ) : (
                                             <div className="grid grid-cols-2 items-start gap-4">
                                                <div className="space-y-1">
                                                   <Label className="font-medium text-center block" htmlFor={`${q.id}-teamA`}>{match.teamA.name}</Label>
                                                   <Input 
                                                       id={`${q.id}-teamA`}
                                                       placeholder="Enter result..."
                                                       value={results[q.id]?.teamA || ''}
                                                       onChange={(e) => handleResultChange(q.id, 'teamA', e.target.value)}
                                                       disabled={isSubmitting}
                                                       className="text-center"
                                                   />
                                                </div>
                                                 <div className="space-y-1">
                                                   <Label className="font-medium text-center block" htmlFor={`${q.id}-teamB`}>{match.teamB.name}</Label>
                                                    <Input 
                                                       id={`${q.id}-teamB`}
                                                       placeholder="Enter result..."
                                                       value={results[q.id]?.teamB || ''}
                                                       onChange={(e) => handleResultChange(q.id, 'teamB', e.target.value)}
                                                       disabled={isSubmitting}
                                                       className="text-center"
                                                   />
                                                </div>
                                             </div>
                                        )}
                                        {error && <p className="text-destructive text-xs mt-2 text-center">{error}</p>}
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
                                This action will process all pending bets and is irreversible.
                            </AlertDescription>
                       </Alert>
                       <div className="flex justify-end gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                         <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isSubmitting}>Cancel</Button>
                         <Button type="submit" variant="destructive" disabled={isSubmitting || match.status === 'Finished' || !hasUnsettledQuestions}>
                             {isSubmitting ? 'Settling...' : (match.status === 'Finished' ? 'Match Settled' : 'Settle & Payout')}
                         </Button>
                       </div>
                   </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
