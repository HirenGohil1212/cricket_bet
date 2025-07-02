'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Match, Question } from '@/lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { settleMatchAndPayouts } from '@/app/actions/qna.actions';
import { Alert, AlertDescription } from '../ui/alert';
import { Info } from 'lucide-react';

interface ManageQnaDialogProps {
    match: Match;
    questions: Question[];
    isOpen: boolean;
    onClose: (shouldRefresh: boolean) => void;
}

// This is the main dialog component. It holds the state and renders the form.
export function ManageQnaDialog({ match, questions, isOpen, onClose }: ManageQnaDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleFormSubmit = async (results: Record<string, { teamA: string, teamB: string }>) => {
        setIsSubmitting(true);
        if (Object.keys(results).length === 0) {
            toast({ variant: 'default', title: 'No Changes', description: 'All questions have already been settled.' });
            onClose(false);
            setIsSubmitting(false);
            return;
        }

        const result = await settleMatchAndPayouts(match.id, results);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Settlement Failed', description: result.error });
        } else {
            toast({ title: 'Success', description: result.success });
            onClose(true);
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Manage Q&amp;A for {match.teamA.name} vs {match.teamB.name}</DialogTitle>
                    <DialogDescription>
                       Enter the final correct answers for each question to settle bets and pay out winners.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto p-1">
                    {/* The form is only rendered when questions are available, preventing initialization errors. */}
                    {questions.length > 0 ? (
                        <SettlementForm
                            match={match}
                            questions={questions}
                            isSubmitting={isSubmitting}
                            onSettle={handleFormSubmit}
                            onCancel={() => onClose(false)}
                        />
                    ) : (
                        <p className='text-center text-muted-foreground p-8'>No questions found for this match.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Dynamically create a Zod schema based on the questions for the match
const createResultsSchema = (questions: Question[]) => {
    const schemaObject = questions.reduce((acc, q) => {
        if(q.status !== 'settled') {
          acc[q.id] = z.object({
              teamA: z.string().min(1, 'Answer is required'),
              teamB: z.string().min(1, 'Answer is required'),
          });
        }
        return acc;
    }, {} as Record<string, z.ZodObject<{ teamA: z.ZodString, teamB: z.ZodString }>>);

    return z.object({
        results: z.object(schemaObject),
    });
};

interface SettlementFormProps {
    match: Match;
    questions: Question[];
    isSubmitting: boolean;
    onSettle: (results: Record<string, { teamA: string, teamB: string }>) => void;
    onCancel: () => void;
}

// This new component contains the entire form. It's only rendered when `questions` are ready.
function SettlementForm({ match, questions, isSubmitting, onSettle, onCancel }: SettlementFormProps) {
    const resultsSchema = React.useMemo(() => createResultsSchema(questions), [questions]);
    type ResultsFormValues = z.infer<typeof resultsSchema>;

    const defaultValues = React.useMemo(() => {
        const results: Record<string, { teamA: string; teamB: string; }> = {};
        questions.forEach(q => {
            if (q.status !== 'settled') {
                results[q.id] = {
                    teamA: q.result?.teamA || '',
                    teamB: q.result?.teamB || '',
                };
            }
        });
        return { results };
    }, [questions]);
    
    const form = useForm<ResultsFormValues>({
        resolver: zodResolver(resultsSchema),
        defaultValues,
    });
    
    const handleSubmit = (data: ResultsFormValues) => {
        onSettle(data.results);
    };

    const hasUnsettledQuestions = questions.some(q => q.status !== 'settled');

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <div className="space-y-6 mt-4">
                   {questions.map((q) => (
                       <ResultField key={q.id} question={q} match={match} />
                   ))}
               </div>
               <DialogFooter className="mt-6 flex-col sm:flex-row items-center sm:justify-between w-full">
                   <Alert className="sm:max-w-xs text-left">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                            This action will process all pending bets and is irreversible.
                        </AlertDescription>
                   </Alert>
                   <div className="flex justify-end gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                     <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                     <Button type="submit" variant="destructive" disabled={isSubmitting || match.status === 'Finished' || !hasUnsettledQuestions}>
                         {isSubmitting ? 'Settling...' : (match.status === 'Finished' ? 'Match Settled' : 'Settle & Payout')}
                     </Button>
                   </div>
               </DialogFooter>
           </form>
        </FormProvider>
    );
}

// This component reads from the FormProvider context.
function ResultField({ question, match }: { question: Question, match: Match }) {
    const { control } = useFormContext();
    const isSettled = question.status === 'settled';

    return (
         <div className="p-4 border rounded-md">
            <p className="text-center font-medium bg-muted p-3 rounded-md text-sm mb-4">{question.question}</p>
            {isSettled && question.result && (
                 <div className="flex items-center justify-around gap-2 text-green-600 font-semibold p-2 bg-green-500/10 rounded-md">
                    <div className='text-center'>
                      <p className='text-xs'>{match.teamA.name}</p>
                      <p>{question.result.teamA}</p>
                    </div>
                     <div className='text-center'>
                      <p className='text-xs'>{match.teamB.name}</p>
                      <p>{question.result.teamB}</p>
                    </div>
                 </div>
            )}
            {!isSettled && (
                 <div className="grid grid-cols-2 items-start gap-4">
                    <FormField
                        control={control}
                        name={`results.${question.id}.teamA`}
                        render={({ field }) => (
                            <FormItem>
                               <FormLabel className="font-medium text-center block">{match.teamA.name}</FormLabel>
                               <FormControl><Input placeholder="Enter result..." {...field} /></FormControl>
                               <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={control}
                        name={`results.${question.id}.teamB`}
                        render={({ field }) => (
                            <FormItem>
                               <FormLabel className="font-medium text-center block">{match.teamB.name}</FormLabel>
                               <FormControl><Input placeholder="Enter result..." {...field} /></FormControl>
                               <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>
            )}
        </div>
    );
}
