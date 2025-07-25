
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
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


interface GuessDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  betOptions: BetOption[];
}

// Dynamically create a Zod schema for the user's prediction form
const createPredictionSchema = (
    questions: Question[], 
    betAmounts: number[],
    allowOneSidedBets: boolean, 
    betOnSide: 'teamA' | 'teamB' | 'both',
    bettingMode: 'qna' | 'player'
) => {
    
    const baseSchema = {
        amount: z.coerce.number().refine(val => betAmounts.includes(val), {
            message: "Please select a valid bet amount.",
        }),
    };
    
    let playerPredictionSchema = z.object({
        teamA: z.string().optional(),
        teamB: z.string().optional(),
    });
    
    const refinementOptions = {
        message: "A prediction is required for the selected side.",
        path: ['root'],
    };

    if (allowOneSidedBets) {
         playerPredictionSchema = playerPredictionSchema.refine(data => {
            if (betOnSide === 'both') return !!data.teamA && !!data.teamB;
            if (betOnSide === 'teamA') return !!data.teamA;
            if (betOnSide === 'teamB') return !!data.teamB;
            return false;
        }, refinementOptions);
    } else {
         playerPredictionSchema = z.object({
            teamA: z.string({ required_error: 'Prediction is required' }).min(1, 'Prediction is required'),
            teamB: z.string({ required_error: 'Prediction is required' }).min(1, 'Prediction is required'),
        });
    }
    
    const qnaSchemaObject = questions.reduce((acc, q) => {
        let questionFieldSchema = z.object({
            teamA: z.string().optional(),
            teamB: z.string().optional(),
        });

        if (allowOneSidedBets) {
            questionFieldSchema = questionFieldSchema.refine(data => {
                if (betOnSide === 'both') return (data.teamA?.trim() ?? '') !== '' && (data.teamB?.trim() ?? '') !== '';
                if (betOnSide === 'teamA') return (data.teamA?.trim() ?? '') !== '';
                if (betOnSide === 'teamB') return (data.teamB?.trim() ?? '') !== '';
                return false;
            }, { message: "A prediction is required for the selected side.", path: ['root'] });
        } else {
            questionFieldSchema = z.object({
                teamA: z.string().min(1, 'Prediction is required'),
                teamB: z.string().min(1, 'Prediction is required'),
            });
        }
        acc[q.id] = questionFieldSchema;
        return acc;
    }, {} as Record<string, z.ZodType<any, any, any>>);
    
    const finalSchema = z.object({
        ...baseSchema,
        predictions: z.object(qnaSchemaObject),
        playerPrediction: playerPredictionSchema,
    });

    if (bettingMode === 'player') {
        return finalSchema.omit({ predictions: true });
    }
    return finalSchema.omit({ playerPrediction: true });
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
  
  const form = useForm<z.infer<ReturnType<typeof createPredictionSchema>>>({
    resolver: (data, context, options) => {
      const schema = createPredictionSchema(questions, validBetAmounts, match?.allowOneSidedBets || false, betOnSide, bettingMode);
      return zodResolver(schema)(data, context, options);
    },
  });
  
  useEffect(() => {
    if (match?.allowOneSidedBets && open) {
        if (bettingMode === 'qna') {
            questions.forEach(q => {
                const currentPrediction = form.getValues(`predictions.${q.id}`);
                if (betOnSide === 'teamA' && currentPrediction?.teamB) {
                    form.setValue(`predictions.${q.id}.teamB`, '');
                } else if (betOnSide === 'teamB' && currentPrediction?.teamA) {
                    form.setValue(`predictions.${q.id}.teamA`, '');
                }
            });
            form.trigger('predictions');
        } else { // player mode
            const currentPlayerPrediction = form.getValues('playerPrediction');
            if (betOnSide === 'teamA' && currentPlayerPrediction?.teamB) {
                form.setValue('playerPrediction.teamB', '');
            } else if (betOnSide === 'teamB' && currentPlayerPrediction?.teamA) {
                form.setValue('playerPrediction.teamA', '');
            }
             form.trigger('playerPrediction');
        }
    }
  }, [betOnSide, questions, form, match?.allowOneSidedBets, open, bettingMode]);


  useEffect(() => {
    async function fetchQuestionsAndSetDefaults() {
      if (match) {
        setIsLoading(true);
        // Reset state on open
        const newBettingMode = 'qna';
        const newBetOnSide = match.allowOneSidedBets ? 'both' : 'both';
        setBettingMode(newBettingMode);
        setBetOnSide(newBetOnSide);
        setQuestions([]);
        
        const fetchedQuestions = await getQuestionsForMatch(match.id);
        const validQuestions = fetchedQuestions.filter(q => q.status === 'active');
        setQuestions(validQuestions);

        const defaultQnaPredictions = validQuestions.reduce((acc, q) => {
          acc[q.id] = { teamA: '', teamB: '' };
          return acc;
        }, {} as Record<string, { teamA: string; teamB: string }>);

        form.reset({
          amount: betOptions[0]?.amount || 0,
          predictions: defaultQnaPredictions,
          playerPrediction: { teamA: '', teamB: '' }
        });
        
        setIsLoading(false);
      }
    }

    if (open) {
      fetchQuestionsAndSetDefaults();
    }
  }, [match, open, betOptions, form]);


  async function handleSubmit(data: any) {
    if (!user || !match) return;

    let finalPredictions: Prediction[] = [];
    
    if (bettingMode === 'player' && data.playerPrediction) {
      finalPredictions = [{
        questionId: 'player_bet', 
        questionText: 'Player Prediction',
        predictedAnswer: {
          teamA: data.playerPrediction.teamA || '',
          teamB: data.playerPrediction.teamB || '',
        }
      }];
    } else if (bettingMode === 'qna' && data.predictions) {
        finalPredictions = Object.entries(data.predictions).map(([questionId, predictedAnswer]: [string, any]) => {
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
    }

    if (finalPredictions.length === 0) {
        toast({ variant: "destructive", title: "Bet Failed", description: "No valid predictions to place." });
        return;
    }

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
                    <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center">
                      <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={24} height={24} className="object-cover" data-ai-hint="logo" />
                    </div>
                    <span className="font-semibold">{match.teamA.name}</span>
                </div>
                <span className="text-muted-foreground">vs</span>
                 <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center">
                      <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={24} height={24} className="object-cover" data-ai-hint="logo" />
                    </div>
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
                        
                        {bettingMode === 'qna' ? (
                            questions.map((q) => (
                                <div key={q.id} className="p-4 border rounded-lg space-y-3">
                                    <p className="text-sm font-semibold text-center block text-muted-foreground">{q.question}</p>
                                    <div className={cn("grid gap-4", betOnSide !== 'both' && match.allowOneSidedBets ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
                                      {(betOnSide === 'teamA' || betOnSide === 'both' || !match.allowOneSidedBets) && (
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
                                      )}
                                       {(betOnSide === 'teamB' || betOnSide === 'both' || !match.allowOneSidedBets) && (
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
                                       )}
                                    </div>
                                    <FormMessage>{form.formState.errors.predictions?.[q.id]?.root?.message}</FormMessage>
                                </div>
                             ))
                        ) : (
                             <div className="p-4 border rounded-lg space-y-3">
                                <div className={cn("grid gap-4", betOnSide !== 'both' && match.allowOneSidedBets ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
                                    {(betOnSide === 'teamA' || betOnSide === 'both' || !match.allowOneSidedBets) && (
                                        <FormField
                                            control={form.control}
                                            name={`playerPrediction.teamA`}
                                            render={({ field }) => (
                                                <FormItem className="space-y-3">
                                                    <FormLabel className="text-sm font-semibold text-center block">{match.teamA.name}</FormLabel>
                                                    <FormControl>
                                                        <RadioGroup
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                            className="flex flex-col space-y-1"
                                                        >
                                                            <ScrollArea className="h-40 w-full rounded-md border p-2">
                                                                {(match.teamA.players && match.teamA.players.length > 0) ? (
                                                                    match.teamA.players.map((player) => (
                                                                        <FormItem key={`${player.name}-a`} className="flex items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-muted cursor-pointer">
                                                                            <FormControl>
                                                                                <RadioGroupItem value={player.name} id={`${player.name}-a`}/>
                                                                            </FormControl>
                                                                            <Label htmlFor={`${player.name}-a`} className="font-normal flex items-center gap-2 cursor-pointer w-full">
                                                                                <Avatar className="h-8 w-8">
                                                                                    <AvatarImage src={player.imageUrl} alt={player.name} />
                                                                                    <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                                                                                </Avatar>
                                                                                <span className="truncate">{player.name}</span>
                                                                            </Label>
                                                                        </FormItem>
                                                                    ))
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                                                        <p>No players listed.</p>
                                                                    </div>
                                                                )}
                                                            </ScrollArea>
                                                        </RadioGroup>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                     {(betOnSide === 'teamB' || betOnSide === 'both' || !match.allowOneSidedBets) && (
                                        <FormField
                                            control={form.control}
                                            name={`playerPrediction.teamB`}
                                            render={({ field }) => (
                                                <FormItem className="space-y-3">
                                                    <FormLabel className="text-sm font-semibold text-center block">{match.teamB.name}</FormLabel>
                                                    <FormControl>
                                                         <RadioGroup
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                            className="flex flex-col space-y-1"
                                                        >
                                                            <ScrollArea className="h-40 w-full rounded-md border p-2">
                                                                {(match.teamB.players && match.teamB.players.length > 0) ? (
                                                                    match.teamB.players.map((player) => (
                                                                        <FormItem key={`${player.name}-b`} className="flex items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-muted cursor-pointer">
                                                                            <FormControl>
                                                                                <RadioGroupItem value={player.name} id={`${player.name}-b`} />
                                                                            </FormControl>
                                                                            <Label htmlFor={`${player.name}-b`} className="font-normal flex items-center gap-2 cursor-pointer w-full">
                                                                                <Avatar className="h-8 w-8">
                                                                                    <AvatarImage src={player.imageUrl} alt={player.name} />
                                                                                    <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                                                                                </Avatar>
                                                                                <span className="truncate">{player.name}</span>
                                                                            </Label>
                                                                        </FormItem>
                                                                    ))
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                                                        <p>No players listed.</p>
                                                                    </div>
                                                                )}
                                                            </ScrollArea>
                                                        </RadioGroup>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                                <FormMessage>{form.formState.errors.playerPrediction?.root?.message}</FormMessage>
                            </div>
                        )}

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
                               <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
