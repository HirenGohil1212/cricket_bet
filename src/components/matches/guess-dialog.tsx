
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Match, Question, Prediction } from "@/lib/types";
import { createBet } from "@/app/actions/bet.actions";
import { getQuestionsForMatch } from "@/app/actions/qna.actions";
import { useAuth } from "@/context/auth-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { z } from "zod";
import { FormControl, FormField, FormItem, FormMessage, FormLabel } from "../ui/form";


interface GuessDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Dynamically create a Zod schema for the user's prediction form
const createPredictionSchema = (questions: Question[]) => {
    const schemaObject = questions.reduce((acc, q) => {
        acc[q.id] = z.object({
            teamA: z.string().min(1, 'Prediction is required'),
            teamB: z.string().min(1, 'Prediction is required'),
        });
        return acc;
    }, {} as Record<string, z.ZodObject<{ teamA: z.ZodString, teamB: z.ZodString }>>);
    
    return z.object({
        predictions: z.object(schemaObject),
        amount: z.coerce.number().min(9, "Minimum bet is INR 9."),
    });
};


export function GuessDialog({ match, open, onOpenChange }: GuessDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const predictionSchema = React.useMemo(() => createPredictionSchema(questions), [questions]);
  type PredictionFormValues = z.infer<typeof predictionSchema>;

  const form = useForm<PredictionFormValues>({
    resolver: zodResolver(predictionSchema),
    defaultValues: {
        amount: 9,
        predictions: {},
    }
  });

  const resetState = () => {
    setIsSubmitting(false);
    setQuestions([]);
    setIsLoading(true);
    form.reset({ amount: 9, predictions: {} });
  };

  useEffect(() => {
    async function fetchQuestions() {
      if (open && match) {
        resetState();
        const fetchedQuestions = await getQuestionsForMatch(match.id);
        const validQuestions = fetchedQuestions.filter(q => q.status === 'active');
        setQuestions(validQuestions);
        setIsLoading(false);
      }
    }
    fetchQuestions();
  }, [match, open, form]);

  async function handleSubmit(data: PredictionFormValues) {
    if (!user || !match) return;
    
    const predictionsPayload: Prediction[] = questions.map(q => ({
        questionId: q.id,
        questionText: q.question,
        predictedAnswer: {
            teamA: data.predictions[q.id].teamA,
            teamB: data.predictions[q.id].teamB,
        }
    }));

    setIsSubmitting(true);
    const result = await createBet({
      userId: user.uid,
      matchId: match.id,
      predictions: predictionsPayload,
      amount: data.amount,
    });

    if (result.error) {
      toast({ variant: "destructive", title: "Bet Failed", description: result.error });
    } else {
      toast({ title: "Bet Placed!", description: `Your bet has been placed. Good luck!` });
      router.refresh();
      onOpenChange(false);
    }
    setIsSubmitting(false);
  }

  const amount = form.watch('amount');
  const potentialWin = amount ? Number(amount) * 2 : 0;
  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Place Your Bet</DialogTitle>
          <DialogDescription>
             Predict the outcome for {match.teamA.name} vs {match.teamB.name}.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <ScrollArea className="h-72 pr-4">
                  <div className="space-y-4">
                    {isLoading ? (
                      Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)
                    ) : questions.length > 0 ? (
                       <FormField
                         control={form.control}
                         name="predictions"
                         render={() => (
                           <FormItem className="space-y-4">
                             {questions.map((q) => (
                               <PredictionField key={q.id} question={q} match={match} />
                             ))}
                           </FormItem>
                         )}
                       />
                    ) : (
                      <div className="text-center text-muted-foreground py-12">
                        <p>No questions available for this match yet.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="space-y-3 pt-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                         <FormItem>
                            <FormLabel className="font-headline text-lg">Select Bet Amount</FormLabel>
                             <FormControl>
                               <div className="grid grid-cols-3 gap-4">
                                  {[9, 19, 29].map((val) => (
                                    <Button
                                      key={val}
                                      type="button"
                                      variant={amount === val ? "default" : "secondary"}
                                      onClick={() => field.onChange(val)}
                                      className="font-bold"
                                    >
                                      INR {val}
                                    </Button>
                                  ))}
                                </div>
                            </FormControl>
                            <FormMessage />
                         </FormItem>
                      )}
                    />
                </div>

                <div className="p-4 bg-accent/10 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Potential Win</p>
                  <p className="text-2xl font-bold font-headline text-primary">INR {potentialWin.toFixed(2)}</p>
                </div>

                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold" disabled={isSubmitting || isLoading || questions.length === 0}>
                    {isSubmitting ? "Placing Bet..." : "Place Bet"}
                  </Button>
                </DialogFooter>
            </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}


function PredictionField({ question, match }: { question: Question, match: Match }) {
    const { control } = useFormContext();
    return (
        <div className="p-4 border rounded-lg space-y-3">
            <p className="text-center text-sm font-medium text-muted-foreground">{question.question}</p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                {/* Team A */}
                <div className="flex flex-col items-center gap-2">
                    <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={40} height={40} className="rounded-full" data-ai-hint="logo" />
                    <Label className="text-xs font-semibold">{match.teamA.name}</Label>
                    <FormField
                        control={control}
                        name={`predictions.${question.id}.teamA`}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="Your prediction" {...field} className="text-center"/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <p className="text-sm font-bold text-muted-foreground">vs</p>
                
                {/* Team B */}
                <div className="flex flex-col items-center gap-2">
                     <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={40} height={40} className="rounded-full" data-ai-hint="logo" />
                    <Label className="text-xs font-semibold">{match.teamB.name}</Label>
                    <FormField
                        control={control}
                        name={`predictions.${question.id}.teamB`}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="Your prediction" {...field} className="text-center"/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>
        </div>
    );
}
