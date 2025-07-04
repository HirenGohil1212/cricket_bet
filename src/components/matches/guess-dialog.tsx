
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
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";


interface GuessDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  betOptions: BetOption[];
}

// Dynamically create a Zod schema for the user's prediction form
const createPredictionSchema = (
    questions: Question[], 
    allowOneSidedBets: boolean, 
    betAmounts: number[],
    betOnSide: 'teamA' | 'teamB' | 'both'
) => {
    let questionSchema;

    if (allowOneSidedBets) {
        let teamASchema = z.string().optional();
        let teamBSchema = z.string().optional();

        if (betOnSide === 'teamA') {
            teamASchema = z.string().min(1, { message: "Prediction is required." });
        } else if (betOnSide === 'teamB') {
            teamBSchema = z.string().min(1, { message: "Prediction is required." });
        } else { // 'both'
             teamASchema = z.string().min(1, { message: "Prediction is required." });
             teamBSchema = z.string().min(1, { message: "Prediction is required." });
        }
        
        questionSchema = z.object({ teamA: teamASchema, teamB: teamBSchema }).refine(
            (data) => betOnSide === 'both' ? data.teamA && data.teamB : (betOnSide === 'teamA' ? data.teamA : data.teamB),
            { message: "A prediction is required for the selected side.", path: ['root'] }
        );
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
  const [betOnSide, setBetOnSide] = React.useState<'teamA' | 'teamB' | 'both'>('both');
  const [bettingMode, setBettingMode] = useState<'qna' | 'player'>('qna');

  const validBetAmounts = React.useMemo(() => betOptions.map(opt => opt.amount), [betOptions]);
  const predictionSchema = React.useMemo(() => createPredictionSchema(questions, match?.allowOneSidedBets || false, validBetAmounts, betOnSide), [questions, match, validBetAmounts, betOnSide]);
  type PredictionFormValues = z.infer<typeof predictionSchema>;

  const form = useForm<PredictionFormValues>({
    resolver: zodResolver(predictionSchema),
    defaultValues: {
        amount: betOptions[0]?.amount || 0,
        predictions: {},
    }
  });
  
  // Effect to clear form values when user changes bet side preference
  useEffect(() => {
    if (match?.allowOneSidedBets && open) {
        questions.forEach(q => {
            const currentPrediction = form.getValues(`predictions.${q.id}`);
            if (betOnSide === 'teamA' && currentPrediction?.teamB) {
                form.setValue(`predictions.${q.id}.teamB`, '');
            } else if (betOnSide === 'teamB' && currentPrediction?.teamA) {
                form.setValue(`predictions.${q.id}.teamA`, '');
            }
        });
        // Trigger validation after clearing
        form.trigger('predictions');
    }
  }, [betOnSide, questions, form, match?.allowOneSidedBets, open]);


  useEffect(() => {
    async function fetchQuestionsAndSetDefaults() {
      if (match) {
        setIsLoading(true);
        setBettingMode('qna'); // Reset betting mode
        setBetOnSide('both'); // Reset side selection
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
    
    // Filter out empty predictions for one-sided bets
    const finalPredictions = Object.entries(data.predictions).map(([questionId, predictedAnswer]) => {
      const question = questions.find(q => q.id === questionId);
      return {
        questionId,
        questionText: question?.question || '',
        predictedAnswer: {
          teamA: predictedAnswer.teamA || '',
          teamB: predictedAnswer.teamB || '',
        }
      };
    });

    setIsSubmitting(true);
    const result = await createBet({
      userId: user.uid,
      matchId: match.id,
      predictions: finalPredictions,
      amount: data.amount,
      betType: bettingMode,
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
                        {match.isSpecialMatch && (
                          <div className="flex items-center justify-center space-x-2 rounded-lg border p-3">
                            <Label htmlFor="betting-mode" className={cn('text-sm', bettingMode === 'qna' ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                              Predict Q&A
                            </Label>
                            <Switch
                              id="betting-mode"
                              checked={bettingMode === 'player'}
                              onCheckedChange={(checked) => setBettingMode(checked ? 'player' : 'qna')}
                              aria-label="Toggle between Q&A and Player prediction"
                            />
                            <Label htmlFor="betting-mode" className={cn('text-sm', bettingMode === 'player' ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                              Predict Players
                            </Label>
                          </div>
                        )}

                        {match.allowOneSidedBets && (
                            <div className="p-3 border rounded-lg space-y-2 bg-muted/50">
                                <Label className="text-sm font-semibold text-center block">Bet on</Label>
                                <RadioGroup
                                    value={betOnSide}
                                    onValueChange={(value: 'teamA' | 'teamB' | 'both') => setBetOnSide(value)}
                                    className="grid grid-cols-3 gap-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="teamA" id="r-teamA" />
                                        <Label htmlFor="r-teamA" className="text-xs truncate">{match.teamA.name}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="teamB" id="r-teamB" />
                                        <Label htmlFor="r-teamB" className="text-xs truncate">{match.teamB.name}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="both" id="r-both" />
                                        <Label htmlFor="r-both" className="text-xs">Both</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        )}

                         {questions.map((q) => (
                            <div key={q.id} className="p-4 border rounded-lg space-y-3">
                                {bettingMode === 'qna' && (
                                    <p className="text-sm font-semibold text-center block text-muted-foreground">{q.question}</p>
                                )}
                                <div className={cn("grid gap-4", betOnSide !== 'both' && match.allowOneSidedBets ? 'grid-cols-1' : 'grid-cols-2')}>
                                  
                                  {(betOnSide === 'teamA' || betOnSide === 'both' || !match.allowOneSidedBets) && (
                                     bettingMode === 'player' && match.isSpecialMatch ? (
                                       <FormField
                                        control={form.control}
                                        name={`predictions.${q.id}.teamA`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <p className="text-sm font-semibold text-center">{match.teamA.name}</p>
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
                                     ) : (
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
                                     )
                                  )}

                                   {(betOnSide === 'teamB' || betOnSide === 'both' || !match.allowOneSidedBets) && (
                                      bettingMode === 'player' && match.isSpecialMatch ? (
                                        <FormField
                                          control={form.control}
                                          name={`predictions.${q.id}.teamB`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <p className="text-sm font-semibold text-center">{match.teamB.name}</p>
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
                                      ) : (
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
                                      )
                                   )}
                                </div>
                                <FormMessage>{form.formState.errors.predictions?.[q.id]?.root?.message}</FormMessage>
                            </div>
                         ))}
                       </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-12">
                        <p>Betting for this match will be available soon.</p>
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
