'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { QandAForm } from './q-and-a-form';
import type { Sport, Question } from '@/lib/types';
import { Button } from '../ui/button';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { qnaFormSchema, type QnAFormValues } from '@/lib/schemas';
import { saveTemplateAndApply } from '@/app/actions/qna.actions';
import { useToast } from '@/hooks/use-toast';

interface QuestionTemplateDialogProps {
    sport: Sport;
    existingQuestions: Pick<Question, 'question'>[];
    isOpen: boolean;
    onClose: () => void;
}

export function QuestionTemplateDialog({ sport, existingQuestions, isOpen, onClose }: QuestionTemplateDialogProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const defaultValues = React.useMemo(() => ({
        questions: existingQuestions.length > 0
            ? existingQuestions
            : [{ question: "" }]
    }), [existingQuestions]);

    const form = useForm<QnAFormValues>({
        resolver: zodResolver(qnaFormSchema),
        defaultValues,
    });
    
    React.useEffect(() => {
        form.reset(defaultValues);
    }, [defaultValues, form]);
    
    const handleSubmit = async (data: QnAFormValues) => {
        setIsSubmitting(true);
        const result = await saveTemplateAndApply(sport, data.questions);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
        } else {
            toast({ title: 'Success', description: result.success });
            router.refresh();
            onClose();
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Manage Question Template for {sport}</DialogTitle>
                    <DialogDescription>
                        These questions will be applied to all upcoming and live {sport} matches.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                    <FormProvider {...form}>
                        <QandAForm />
                    </FormProvider>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={form.handleSubmit(handleSubmit)} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save & Apply to Matches'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
