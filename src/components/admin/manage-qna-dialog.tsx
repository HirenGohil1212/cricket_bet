'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Match, Question } from '@/lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { setQuestionOptions, settleMatchAndPayouts } from '@/app/actions/qna.actions';
import { useToast } from '@/hooks/use-toast';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, AlertDescription } from '../ui/alert';
import { Info } from 'lucide-react';

interface ManageQnaDialogProps {
    match: Match;
    questions: Question[];
    isOpen: boolean;
    onClose: (shouldRefresh: boolean) => void;
}

export function ManageQnaDialog({ match, questions, isOpen, onClose }: ManageQnaDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Manage Q&A for {match.teamA.name} vs {match.teamB.name}</DialogTitle>
                    <DialogDescription>
                       Set options for users to bet on before the match, and settle results after the match is finished.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="options" className="w-full pt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="options">Set Options</TabsTrigger>
                        <TabsTrigger value="results">Settle Results</TabsTrigger>
                    </TabsList>
                    <TabsContent value="options" className="mt-6">
                        <OptionsForm match={match} questions={questions} onClose={onClose} />
                    </TabsContent>
                    <TabsContent value="results" className="mt-6">
                         {questions.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <p>There are no questions to settle for this match.</p>
                            </div>
                        ) : (
                            <ResultsForm match={match} questions={questions} onClose={onClose} />
                        )}
                    </TabsContent>
                </Tabs>
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
               <div className="max-h-[50vh] overflow-y-auto space-y-6 pr-4">
                   {questions.map((q, index) => (
                       <OptionsField key={q.id} question={q} index={index} />
                   ))}
               </div>
               <DialogFooter className="mt-6">
                   <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isSubmitting}>Cancel</Button>
                   <Button type="submit" disabled={isSubmitting}>
                       {isSubmitting ? 'Saving...' : 'Save Options'}
                   </Button>
               </DialogFooter>
           </form>
        </FormProvider>
    );
}

function OptionsField({ question, index }: { question: Question; index: number }) {
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
                           <FormControl><Input placeholder="Enter option..." {...field} /></FormControl>
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
                           <FormControl><Input placeholder="Enter option..." {...field} /></FormControl>
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
        acc[q.id] = z.object({
            resultA: z.string().min(1, 'Result is required'),
            resultB: z.string().min(1, 'Result is required'),
        });
        return acc;
    }, {} as Record<string, z.ZodObject<{ resultA: z.ZodString, resultB: z.ZodString }>>);
    return z.object(schemaObject);
};

function ResultsForm({ match, questions, onClose }: Omit<ManageQnaDialogProps, 'isOpen'>) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
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
            onClose(true);
        }
        setIsSubmitting(false);
    };

    return (
        <FormProvider {...form}>
           <form onSubmit={form.handleSubmit(handleSubmit)}>
               <div className="max-h-[50vh] overflow-y-auto space-y-6 pr-4">
                   {questions.map((q, index) => (
                       <ResultField key={q.id} question={q} index={index} />
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
                     <Button type="submit" variant="destructive" disabled={isSubmitting}>
                         {isSubmitting ? 'Settling...' : 'Settle & Payout'}
                     </Button>
                   </div>
               </DialogFooter>
           </form>
        </FormProvider>
    );
}

function ResultField({ question, index }: { question: Question; index: number }) {
    const { control } = useFormContext();
    return (
         <div className="p-4 border rounded-md">
            <p className="text-center font-medium bg-muted p-3 rounded-md text-sm mb-4">{question.question}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-4 pt-2">
                <FormField
                    control={control}
                    name={`${question.id}.resultA`}
                    render={({ field }) => (
                        <FormItem>
                           <Label className="font-medium text-center block">Result for "{question.options?.[0]?.text || 'Option A'}"</Label>
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
                           <Label className="font-medium text-center block">Result for "{question.options?.[1]?.text || 'Option B'}"</Label>
                           <FormControl><Input placeholder="Enter final score/result..." {...field} /></FormControl>
                           <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
        </div>
    );
}
