'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Match, Question } from '@/lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { setQuestionOptions } from '@/app/actions/qna.actions';
import { useToast } from '@/hooks/use-toast';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface SetOptionsDialogProps {
    match: Match;
    questions: Question[];
    isOpen: boolean;
    onClose: (shouldRefresh: boolean) => void;
}

// Create a Zod schema dynamically based on the questions
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


export function SetOptionsDialog({ match, questions, isOpen, onClose }: SetOptionsDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    // Dynamically create the schema and default values
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
    
    // Reset form if the questions or their options change
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
            onClose(true); // Signal a refresh
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Set Question Options for {match.teamA.name} vs {match.teamB.name}</DialogTitle>
                    <DialogDescription>
                       Define the specific answers for each question for this match.
                    </DialogDescription>
                </DialogHeader>
                <FormProvider {...form}>
                   <form onSubmit={form.handleSubmit(handleSubmit)}>
                       <div className="py-4 max-h-[60vh] overflow-y-auto space-y-6">
                           {questions.map((q, index) => (
                               <OptionsField key={q.id} question={q} index={index} />
                           ))}
                       </div>
                       <DialogFooter>
                           <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isSubmitting}>Cancel</Button>
                           <Button type="submit" disabled={isSubmitting}>
                               {isSubmitting ? 'Saving...' : 'Save Options'}
                           </Button>
                       </DialogFooter>
                   </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}


function OptionsField({ question, index }: { question: Question; index: number }) {
    const { control } = useFormContext();

    return (
         <div className="p-4 border rounded-md">
             <Label className="font-semibold text-muted-foreground">Question #{index + 1}</Label>
             <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-4 pt-2">
                <FormField
                    control={control}
                    name={`${question.id}.optionA`}
                    render={({ field }) => (
                        <FormItem>
                           <Label className="font-medium text-center block">Option A</Label>
                           <FormControl><Input placeholder="Enter answer..." {...field} /></FormControl>
                           <FormMessage />
                        </FormItem>
                    )}
                />
                
                <div className="flex justify-center items-center h-full pt-1">
                    <p className="text-center font-medium bg-muted p-3 rounded-md text-sm">{question.question}</p>
                </div>
                
                 <FormField
                    control={control}
                    name={`${question.id}.optionB`}
                    render={({ field }) => (
                        <FormItem>
                           <Label className="font-medium text-center block">Option B</Label>
                           <FormControl><Input placeholder="Enter answer..." {...field} /></FormControl>
                           <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
        </div>
    )
}
