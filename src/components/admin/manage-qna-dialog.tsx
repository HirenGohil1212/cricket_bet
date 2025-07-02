'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Match, Question } from '@/lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { setQuestionOptions, settleMatchAndPayouts } from '@/app/actions/qna.actions';
import { useToast } from '@/hooks/use-toast';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, AlertDescription } from '../ui/alert';
import { Info, CheckCircle } from 'lucide-react';
import { Separator } from '../ui/separator';

interface ManageQnaDialogProps {
    match: Match;
    questions: Question[];
    isOpen: boolean;
    onClose: (shouldRefresh: boolean) => void;
}

export function ManageQnaDialog({ match, questions, isOpen, onClose }: ManageQnaDialogProps) {
    const areOptionsSet = questions.every(q => q.options && q.options.length === 2 && q.options.every(opt => opt.text));

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Manage Q&amp;A for {match.teamA.name} vs {match.teamB.name}</DialogTitle>
                    <DialogDescription>
                       Set options for users to bet on, and settle results after the match is finished.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto space-y-8 p-1">
                    <OptionsForm match={match} questions={questions} onClose={onClose} />
                    
                    {areOptionsSet && (
                        <>
                            <Separator />
                            <ResultsForm match={match} questions={questions} onClose={onClose} />
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ========= OPTIONS FORM =========
const createOptionsSchema = (questions: Question[]) => {
    const schemaObject = questions.reduce((acc, q) => {
        acc[q.id] = z.object({
            optionA: z.string().min(1, 'Option is required'),
            optionB: z.string().min(1, 'Option is required'),
        });
        return acc;
    }, {} as Record<string, z.ZodObject<{ optionA: z.ZodString, optionB: z.ZodString }>>);
    return z.object(schemaObject);
};

function OptionsForm({ match, questions, onClose }: Omit<ManageQnaDialogProps, 'isOpen'>) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const optionsSchema = React.useMemo(() => createOptionsSchema(questions), [questions]);
    type OptionsFormValues = z.infer<typeof optionsSchema>;

    const defaultValues = React.useMemo(() => questions.reduce((acc, q) => {
        acc[q.id] = {
            optionA: q.options?.[0]?.text || '',
            optionB: q.options?.[1]?.text || '',
        };
        return acc;
    }, {} as OptionsFormValues), [questions]);

    const form = useForm<OptionsFormValues>({
        resolver: zodResolver(optionsSchema),
        defaultValues,
    });
    
    React.useEffect(() => {
        form.reset(defaultValues);
    }, [defaultValues, form]);
    
    const handleSubmit = async (data: OptionsFormValues) => {
        setIsSubmitting(true);
        const result = await setQuestionOptions(match.id, data);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
        } else {
            toast({ title: 'Success', description: result.success });
            onClose(true);
        }
        setIsSubmitting(false);
    };
    
    return (
        <FormProvider {...form}>
           <form onSubmit={form.handleSubmit(handleSubmit)}>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Set Bet Options</h3>
                    <p className="text-sm text-muted-foreground">Define the two choices users can bet on for each question.</p>
                </div>
               <div className="space-y-6 mt-4">
                   {questions.map((q, index) => (
                       <OptionsField key={q.id} question={q} index={index} />
                   ))}
               </div>
               <DialogFooter className="mt-6">
                   <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isSubmitting}>Cancel</Button>
                   <Button type="submit" disabled={isSubmitting || questions.length === 0}>
                       {isSubmitting ? 'Saving...' : 'Save Options'}
                   </Button>
               </DialogFooter>
           </form>
        </FormProvider>
    );
}

function OptionsField({ question }: { question: Question }) {
    const { control } = useFormContext();
    return (
         <div className="p-4 border rounded-md">
             <p className="text-center font-medium bg-muted p-3 rounded-md text-sm mb-4">{question.question}</p>
             <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-4">
                <FormField
                    control={control}
                    name={`${question.id}.optionA`}
                    render={({ field }) => (
                        <FormItem>
                           <Label className="font-medium text-center block">Option A</Label>
                           <FormControl><Input placeholder="Enter first option..." {...field} /></FormControl>
                           <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name={`${question.id}.optionB`}
                    render={({ field }) => (
                        <FormItem>
                           <Label className="font-medium text-center block">Option B</Label>
                           <FormControl><Input placeholder="Enter second option..." {...field} /></FormControl>
                           <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
        </div>
    );
}


// ========= RESULTS FORM =========
const createResultsSchema = (questions: Question[]) => {
    const schemaObject = questions.reduce((acc, q) => {
        if(q.status !== 'settled') {
          acc[q.id] = z.string({ required_error: "Please select a result." });
        }
        return acc;
    }, {} as Record<string, z.ZodString>);
    return z.object(schemaObject);
};

function ResultsForm({ match, questions, onClose }: Omit<ManageQnaDialogProps, 'isOpen'>) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const resultsSchema = React.useMemo(() => createResultsSchema(questions), [questions]);
    type ResultsFormValues = z.infer<typeof resultsSchema>;

    const defaultValues = React.useMemo(() => questions.reduce((acc, q) => {
        // The result is stored as the winning option's text
        if(q.result) {
            acc[q.id] = q.result;
        }
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
            onClose(true);
        }
        setIsSubmitting(false);
    };

    return (
        <FormProvider {...form}>
           <form onSubmit={form.handleSubmit(handleSubmit)}>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Declare Results</h3>
                    <p className="text-sm text-muted-foreground">Select the winning option for each question to settle bets.</p>
                </div>
               <div className="space-y-6 mt-4">
                   {questions.map((q) => (
                       <ResultField key={q.id} question={q} />
                   ))}
               </div>
               <DialogFooter className="mt-6 flex-col sm:flex-row items-center sm:justify-between w-full">
                   <Alert className="sm:max-w-xs">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                            This action will process all pending bets and is irreversible.
                        </AlertDescription>
                   </Alert>
                   <div className="flex justify-end gap-2 w-full sm:w-auto">
                     <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isSubmitting}>Cancel</Button>
                     <Button type="submit" variant="destructive" disabled={isSubmitting || match.status === 'Finished'}>
                         {isSubmitting ? 'Settling...' : (match.status === 'Finished' ? 'Match Settled' : 'Settle &amp; Payout')}
                     </Button>
                   </div>
               </DialogFooter>
           </form>
        </FormProvider>
    );
}

function ResultField({ question }: { question: Question }) {
    const { control } = useFormContext();
    const isSettled = question.status === 'settled';

    return (
         <div className="p-4 border rounded-md">
            <p className="text-center font-medium bg-muted p-3 rounded-md text-sm mb-4">{question.question}</p>
            {isSettled && (
                 <div className="flex items-center justify-center gap-2 text-green-600 font-semibold p-2 bg-green-500/10 rounded-md">
                    <CheckCircle className="h-4 w-4" />
                    <span>Winner: {question.result}</span>
                 </div>
            )}
            {!isSettled && (
                 <FormField
                    control={control}
                    name={question.id}
                    render={({ field }) => (
                        <FormItem>
                           <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                disabled={isSettled}
                            >
                                {question.options.map((option, index) => (
                                    <FormItem key={index} className="flex-1">
                                        <FormControl>
                                             <Label className="flex items-center justify-center gap-2 p-4 border rounded-md cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                                                <RadioGroupItem value={option.text} id={`${question.id}-${index}`} className="sr-only" />
                                                {option.text}
                                            </Label>
                                        </FormControl>
                                    </FormItem>
                                ))}
                            </RadioGroup>
                           </FormControl>
                           <FormMessage className="text-center pt-2" />
                        </FormItem>
                    )}
                />
            )}
        </div>
    );
}
