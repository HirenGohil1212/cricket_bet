'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { QandAForm } from './q-and-a-form';
import type { Match, Question } from '@/lib/types';
import { Button } from '../ui/button';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { qnaFormSchema, type QnAFormValues } from '@/lib/schemas';
import { updateQuestionsForMatch } from '@/app/actions/qna.actions';
import { useToast } from '@/hooks/use-toast';

interface AddQuestionsDialogProps {
    match: Match;
    existingQuestions: Question[];
    isOpen: boolean;
    onClose: (shouldRefresh: boolean) => void;
}

export function AddQuestionsDialog({ match, existingQuestions, isOpen, onClose }: AddQuestionsDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    // Map existing questions to form values, removing odds.
    const defaultValues = {
        questions: existingQuestions.length > 0
            ? existingQuestions.map(q => ({
                question: q.question,
                options: q.options.map(opt => ({ text: opt.text }))
            }))
            : [{ question: "", options: [{ text: "" }, { text: "" }] }]
    };

    const form = useForm<QnAFormValues>({
        resolver: zodResolver(qnaFormSchema),
        defaultValues,
    });
    
    const handleSubmit = async (data: QnAFormValues) => {
        setIsSubmitting(true);
        const result = await updateQuestionsForMatch(match.id, data.questions);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
        } else {
            toast({ title: 'Success', description: result.success });
            onClose(true); // Close and refresh
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Manage Questions for {match.teamA.name} vs {match.teamB.name}</DialogTitle>
                    <DialogDescription>
                        Add, edit, or remove questions for this specific match. Changes will overwrite existing questions.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                    <FormProvider {...form}>
                        <QandAForm />
                    </FormProvider>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onClose(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={form.handleSubmit(handleSubmit)} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Questions'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
