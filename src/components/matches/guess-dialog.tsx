
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
import type { Match, Question, Prediction, BetOption } from "@/lib/types";
import { createBet } from "@/app/actions/bet.actions";
import { getQuestionsForMatch } from "@/app/actions/qna.actions";
import { useAuth } from "@/context/auth-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import { FormControl, FormField, FormItem, FormMessage, FormLabel } from "../ui/form";
import { PlayerSelect } from "./player-select";


interface GuessDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  betOptions: BetOption[];
}

// Dynamically create a Zod schema for the user's prediction form
const createPredictionSchema = (questions: Question[], allowOneSidedBets: boolean, betAmounts: number[]) => {
    let questionSchema;

    if (allowOneSidedBets) {
        questionSchema = z.object({
            teamA: z.string(),
            teamB: z.string(),
        }).refine(data => data.teamA.trim() !== '' || data.teamB.trim() !== '', {
            message: "At least one prediction is required.",
            path: ["teamA"], // Assign error to one field for display
        });
    } else {
        questionSchema = z.object({
            teamA: z.string().min(1, 'Prediction is required'),
            teamB: z.string().min(1, 'Prediction is required'),
        });
    }

    const schemaObject = questions.reduce((acc, q) => {
        acc[q.id] = questionSchema;
        return acc;
    }, {} as Record<string, typeof questionSchema>);
    
    return z.object({
        predictions: z.object(schemaObject),
        amount: z.coerce.number().refine(val => betAmounts.includes(val), {
            message: "Please select a valid bet amount.",
        }),
    });
};


export function GuessDialog({ match, open, onOpenChange, betOptions }: GuessDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const validBetAmounts = React.useMemo(() => betOptions.map(opt => opt.amount), [betOptions]);
  const predictionSchema = React.useMemo(() => createPredictionSchema(questions, match?.allowOneSidedBets || false, validBetAmounts), [questions, match, validBetAmounts]);
  type PredictionFormValues = z.infer<typeof predictionSchema>;

  const form = useForm<PredictionFormValues>({
    resolver: zodResolver(predictionSchema),
    defaultValues: {
        amount: betOptions[0]?.amount || 0,
        predictions: {},
    }
  });

  useEffect(() => {
    async function fetchQuestionsAndSetDefaults() {
      if (match) {
        setIsLoading(true);
        setQuestions([]); // Clear old questions to avoid rendering with old state
        const fetchedQuestions = await getQuestionsForMatch(match.id);
        const validQuestions = fetchedQuestions.filter(q => q.status === 'active');
        
        // Create default values for the predictions with empty strings
        const defaultPredictions = validQuestions.reduce((acc, q) => {
          acc[q.id] = { teamA: '', teamB: '' };
          return acc;
        }, {} as Record<string, { teamA: string; teamB: string }>);

        // Reset the form with the new default values to make inputs controlled
        form.reset({
          amount: betOptions[0]?.amount || 0,
          predictions: defaultPredictions,
        });
        
        setQuestions(validQuestions);
        setIsLoading(false);
      }
    }

    if (open) {
      fetchQuestionsAndSetDefaults();
    } else {
      // Clear form state when dialog is closed
      setIsSubmitting(false);
      form.reset({ amount: betOptions[0]?.amount || 0, predictions: {} });
    }
  }, [match, open, form, betOptions]);


  async function handleSubmit(data: PredictionFormValues) {
    if (!user || !match) return;
    
    const predictionsPayload: Prediction[] = questions.map(q => ({
        questionId: q.id,
        questionText: q.question,
        predictedAnswer: data.predictions[q.id]
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
  const potentialWin = betOptions.find(opt => opt.amount === amount)?.payout || 0;
  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Place Your Bet</DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                    <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={24} height={24} className="rounded-full" data-ai-hint="logo" />
                    <span className="font-semibold">{match.teamA.name}</span>
                </div>
                <span className="text-muted-foreground">vs</span>
                 <div className="flex items-center gap-2">
                    <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={24} height={24} className="rounded-full" data-ai-hint="logo" />
                    <span className="font-semibold">{match.teamB.name}</span>
                </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <ScrollArea className="h-72 pr-4">
                  <div className="space-y-4">
                    {isLoading ? (
                      Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                    ) : questions.length > 0 ? (
                       <div className="space-y-4">
                         {questions.map((q) => (
                            <div key={q.id} className="p-4 border rounded-lg space-y-3">
                                <FormLabel className="text-sm font-semibold text-center block text-muted-foreground">{q.question}</FormLabel>
                                <div className="grid grid-cols-2 gap-4">
                                  {match.isSpecialMatch ? (
                                    <>
                                      <FormField
                                        control={form.control}
                                        name={`predictions.${q.id}.teamA`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="text-xs">{`Player from ${match.teamA.name}`}</FormLabel>
                                            <PlayerSelect
                                                players={match.teamA.players || []}
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                placeholder="Select a player"
                                            />
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={form.control}
                                        name={`predictions.${q.id}.teamB`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="text-xs">{`Player from ${match.teamB.name}`}</FormLabel>
                                            <PlayerSelect
                                                players={match.teamB.players || []}
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                placeholder="Select a player"
                                            />
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <FormField
                                        control={form.control}
                                        name={`predictions.${q.id}.teamA`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="text-xs">{match.teamA.name}</FormLabel>
                                            <FormControl>
                                              <Input placeholder="Team A prediction..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={form.control}
                                        name={`predictions.${q.id}.teamB`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="text-xs">{match.teamB.name}</FormLabel>
                                            <FormControl>
                                              <Input placeholder="Team B prediction..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </>
                                  )}
                                </div>
                            </div>
                         ))}
                       </div>
                    ) : match.isSpecialMatch ? (
                      <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
                          <FormLabel className="text-sm font-semibold text-center block text-muted-foreground">Example Player Bet</FormLabel>
                          <div className="grid grid-cols-2 gap-4 opacity-50">
                            <div>
                              <FormLabel className="text-xs">{`Player from ${match.teamA.name}`}</FormLabel>
                              <PlayerSelect
                                  players={match.teamA.players || []}
                                  value={undefined}
                                  onValueChange={() => {}}
                                  placeholder="Select a player"
                                  disabled={true}
                              />
                            </div>
                            <div>
                              <FormLabel className="text-xs">{`Player from ${match.teamB.name}`}</FormLabel>
                              <PlayerSelect
                                  players={match.teamB.players || []}
                                  value={undefined}
                                  onValueChange={() => {}}
                                  placeholder="Select a player"
                                  disabled={true}
                              />
                            </div>
                          </div>
                          <p className="text-center text-xs text-muted-foreground pt-2">
                              The admin has not added player-based questions for this match yet. Betting will be available soon.
                          </p>
                      </div>
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
                                  {betOptions.map((opt) => (
                                    <Button
                                      key={opt.amount}
                                      type="button"
                                      variant={amount === opt.amount ? "default" : "secondary"}
                                      onClick={() => field.onChange(opt.amount)}
                                      className="font-bold"
                                    >
                                      INR {opt.amount}
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
