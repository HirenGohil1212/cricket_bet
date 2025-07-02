'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Match, Question } from '@/lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { settleMatchAndPayouts } from '@/app/actions/qna.actions';
import { useToast } from '@/hooks/use-toast';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, AlertDescription } from '../ui/alert';
import { Info } from 'lucide-react';

interface SettleMatchDialogProps {
    match: Match;
    questions: Question[];
    isOpen: boolean;
    onClose: (shouldRefresh: boolean) => void;
}

// Create a Zod schema dynamically based on the questions for results
const createResultsSchema = (questions: Question[]) => {
    const schemaObject = questions.reduce((acc, q) => {
        acc[q.id] = z.object({
            resultA: z.string().min(1, 'Result is required'),
            resultB: z.string().min(1, 'Result is required'),
        });
        return acc;
    }, {} as Record<string, z.ZodObject<{ resultA: z.ZodString, resultB: z.ZodString }>>);
    return z.object(schemaObject);
};


export function SettleMatchDialog({ match, questions, isOpen, onClose }: SettleMatchDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    // Dynamically create the schema and default values
    const resultsSchema = React.useMemo(() => createResultsSchema(questions), [questions]);
    type ResultsFormValues = z.infer<typeof resultsSchema>;

    const defaultValues = React.useMemo(() => questions.reduce((acc, q) => {
        acc[q.id] = {
            resultA: q.result?.resultA || '',
            resultB: q.result?.resultB || '',
        };
        return acc;
    }, {} as ResultsFormValues), [questions]);

    const form = useForm<ResultsFormValues>({
        resolver: zodResolver(resultsSchema),
        defaultValues,
    });
    
    React.useEffect(() => {
        form.reset(defaultValues);
    }, [defaultValues, form]);
    
    const handleSubmit = async (data: ResultsFormValues) => {
        setIsSubmitting(true);
        const result = await settleMatchAndPayouts(match.id, data);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Settlement Failed', description: result.error });
        } else {
            toast({ title: 'Success', description: result.success });
            onClose(true); // Signal a refresh
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Settle Match: {match.teamA.name} vs {match.teamB.name}</DialogTitle>
                    <DialogDescription>
                       Enter the final results for each question. This will mark the match as finished, settle all bets, and pay out winnings. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                {questions.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                        <p>There are no questions to settle for this match.</p>
                    </div>
                ) : (
                    <FormProvider {...form}>
                       <form onSubmit={form.handleSubmit(handleSubmit)}>
                           <div className="py-4 max-h-[60vh] overflow-y-auto space-y-6">
                               {questions.map((q, index) => (
                                   <ResultField key={q.id} question={q} index={index} />
                               ))}
                           </div>
                           <DialogFooter className="mt-4">
                               <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        Clicking Settle will process all pending bets and is irreversible.
                                    </AlertDescription>
                               </Alert>
                               <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isSubmitting}>Cancel</Button>
                               <Button type="submit" variant="destructive" disabled={isSubmitting}>
                                   {isSubmitting ? 'Settling...' : 'Settle & Payout Winners'}
                               </Button>
                           </DialogFooter>
                       </form>
                    </FormProvider>
                )}
            </DialogContent>
        </Dialog>
    );
}


function ResultField({ question, index }: { question: Question; index: number }) {
    const { control } = useFormContext();

    return (
         <div className="p-4 border rounded-md">
             <Label className="font-semibold text-muted-foreground">Question #{index + 1}: <span className="font-normal italic">{question.question}</span></Label>
             <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-4 pt-2">
                <FormField
                    control={control}
                    name={`${question.id}.resultA`}
                    render={({ field }) => (
                        <FormItem>
                           <Label className="font-medium">Result for "{question.options?.[0]?.text || 'Option A'}"</Label>
                           <FormControl><Input placeholder="Enter final score/result..." {...field} /></FormControl>
                           <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name={`${question.id}.resultB`}
                    render={({ field }) => (
                        <FormItem>
                            <Label className="font-medium">Result for "{question.options?.[1]?.text || 'Option B'}"</Label>
                           <FormControl><Input placeholder="Enter final score/result..." {...field} /></FormControl>
                           <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
        </div>
    )
}
