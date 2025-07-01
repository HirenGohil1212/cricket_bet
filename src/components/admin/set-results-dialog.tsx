'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Match, Question } from '@/lib/types';
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from '../ui/label';
import { setQuestionResults } from '@/app/actions/qna.actions';
import { useToast } from '@/hooks/use-toast';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge } from '../ui/badge';

interface SetResultsDialogProps {
    match: Match;
    questions: Question[];
    isOpen: boolean;
    onClose: (shouldRefresh: boolean) => void;
}

const createResultsSchema = (questions: Question[]) => {
    const schemaObject = questions.reduce((acc, q) => {
        acc[q.id] = z.string().optional();
        return acc;
    }, {} as Record<string, z.ZodOptional<z.ZodString>>);
    return z.object(schemaObject);
};


export function SetResultsDialog({ match, questions, isOpen, onClose }: SetResultsDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const resultsSchema = React.useMemo(() => createResultsSchema(questions), [questions]);
    
    const defaultValues = React.useMemo(() => questions.reduce((acc, q) => {
        acc[q.id] = q.result || '';
        return acc;
    }, {} as Record<string, string>), [questions]);

    const form = useForm<z.infer<typeof resultsSchema>>({
        resolver: zodResolver(resultsSchema),
        defaultValues,
    });

    React.useEffect(() => {
        form.reset(defaultValues);
    }, [defaultValues, form]);
    
    const handleSubmit = async (data: z.infer<typeof resultsSchema>) => {
        setIsSubmitting(true);
        
        const dirtyData: Record<string, string> = {};
        for(const qId in data) {
            const value = data[qId];
            if (value && value !== defaultValues[qId]) {
                dirtyData[qId] = value;
            }
        }

        if (Object.keys(dirtyData).length === 0) {
            toast({ variant: 'default', title: 'No Changes', description: 'No new results were selected.' });
            setIsSubmitting(false);
            onClose(false);
            return;
        }

        const result = await setQuestionResults(match.id, dirtyData);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
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
                    <DialogTitle>Set Results for {match.teamA.name} vs {match.teamB.name}</DialogTitle>
                    <DialogDescription>
                       Select the winning option for each question. Once a result is saved, it cannot be changed.
                    </DialogDescription>
                </DialogHeader>
                <FormProvider {...form}>
                   <form onSubmit={form.handleSubmit(handleSubmit)}>
                       <div className="py-4 max-h-[60vh] overflow-y-auto space-y-6">
                           {questions.map((q, index) => (
                               <ResultField key={q.id} question={q} index={index} />
                           ))}
                       </div>
                       <DialogFooter>
                           <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isSubmitting}>Cancel</Button>
                           <Button type="submit" disabled={isSubmitting}>
                               {isSubmitting ? 'Saving...' : 'Save Results'}
                           </Button>
                       </DialogFooter>
                   </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}

function ResultField({ question, index }: { question: Question; index: number }) {
    const { control } = useFormContext();
    const isSettled = question.status === 'settled';

    return (
        <FormField
            control={control}
            name={question.id}
            render={({ field }) => (
                <FormItem className="p-4 border rounded-md">
                     <div className="flex justify-between items-start">
                        <div>
                           <p className="font-semibold text-muted-foreground">Question #{index + 1}</p>
                           <p className="font-medium">{question.question}</p>
                        </div>
                        {isSettled && <Badge variant="secondary">Settled</Badge>}
                    </div>
                    <FormControl>
                        <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4"
                            disabled={isSettled}
                        >
                            <FormItem>
                                <Label className="flex items-center justify-center p-4 border rounded-md has-[:checked]:border-primary has-[:checked]:bg-muted cursor-pointer data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-70" data-disabled={isSettled}>
                                  <FormControl><RadioGroupItem value={question.options[0].text} className="sr-only" /></FormControl>
                                  <span>{question.options[0].text}</span>
                                </Label>
                            </FormItem>

                            <FormItem>
                                 <Label className="flex items-center justify-center p-4 border rounded-md has-[:checked]:border-primary has-[:checked]:bg-muted cursor-pointer data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-70 text-muted-foreground" data-disabled={isSettled}>
                                    <FormControl><RadioGroupItem value="void" className="sr-only" /></FormControl>
                                    <span>Void / Cancel</span>
                                 </Label>
                            </FormItem>

                            <FormItem>
                                <Label className="flex items-center justify-center p-4 border rounded-md has-[:checked]:border-primary has-[:checked]:bg-muted cursor-pointer data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-70" data-disabled={isSettled}>
                                  <FormControl><RadioGroupItem value={question.options[1].text} className="sr-only" /></FormControl>
                                  <span>{question.options[1].text}</span>
                                </Label>
                            </FormItem>
                        </RadioGroup>
                    </FormControl>
                </FormItem>
            )}
        />
    )
}
