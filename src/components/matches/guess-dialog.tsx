
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
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Match, Question, Prediction, BetOption, Player } from "@/lib/types";
import { createBet } from "@/app/actions/bet.actions";
import { getQuestionsForMatch } from "@/app/actions/qna.actions";
import { useAuth } from "@/context/auth-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { z } from "zod";
import { FormControl, FormField, FormItem, FormMessage, FormLabel } from "../ui/form";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getBettingSettings } from "@/app/actions/settings.actions";
import { BettingSettings } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";


interface GuessDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Dynamically create a Zod schema for the user's prediction form
const createPredictionSchema = (
    questions: Question[], 
    betAmounts: number[],
    allowOneSidedBets: boolean, 
    betOnSide: 'teamA' | 'teamB' | 'both',
    bettingMode: 'qna' | 'player',
    selectedPlayersA: Player[],
    selectedPlayersB: Player[],
) => {
    const baseSchema = {
        amount: z.coerce.number().refine(val => betAmounts.includes(val), {
            message: "Please select a valid bet amount.",
        }),
    };
    
    let predictionsSchema;

    if (bettingMode === 'player') {
        const playerSchema = z.record(z.string(), z.string().min(1, "Required"));
        const teamsSchema = z.object({
            teamA: z.array(playerSchema).optional(),
            teamB: z.array(playerSchema).optional(),
        });
        
        predictionsSchema = z.object({
            teamA: z.record(z.string(), z.record(z.string(), z.string().min(1, "Required"))).optional(),
            teamB: z.record(z.string(), z.record(z.string(), z.string().min(1, "Required"))).optional(),
        }).refine(data => {
            return (selectedPlayersA.length > 0 && data.teamA && Object.keys(data.teamA).length > 0) ||
                   (selectedPlayersB.length > 0 && data.teamB && Object.keys(data.teamB).length > 0);
        }, { message: "Please make a prediction for at least one selected player." });
        
    } else { // qna mode
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
        
        predictionsSchema = z.object(qnaSchemaObject);
    }
    
    const finalSchema = z.object({
        ...baseSchema,
        predictions: predictionsSchema,
    });

    return finalSchema;
};


export function GuessDialog({ match, open, onOpenChange }: GuessDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [betOnSide, setBetOnSide] = React.useState<'teamA' | 'teamB' | 'both'>('both');
  const [bettingMode, setBettingMode] = useState<'qna' | 'player'>('qna');
  const [bettingSettings, setBettingSettings] = useState<BettingSettings | null>(null);

  // State for new player bet UI
  const [selectedPlayersA, setSelectedPlayersA] = useState<Player[]>([]);
  const [selectedPlayersB, setSelectedPlayersB] = useState<Player[]>([]);

  const betOptions = React.useMemo(() => {
    if (!bettingSettings || !match) return [];
    
    if (match.sport === 'Cricket') {
        const isOneSided = match.allowOneSidedBets && betOnSide !== 'both';
        if (bettingMode === 'player') return bettingSettings.betOptions.Cricket.player;
        if (isOneSided) return bettingSettings.betOptions.Cricket.oneSided;
        return bettingSettings.betOptions.Cricket.general;
    }
    
    return bettingSettings.betOptions[match.sport];
  }, [bettingSettings, match, bettingMode, betOnSide]);

  const validBetAmounts = React.useMemo(() => (betOptions || []).map(opt => opt.amount), [betOptions]);
  
  const form = useForm<any>({ // Using `any` due to highly dynamic schema
    resolver: (data, context, options) => {
      const schema = createPredictionSchema(
          questions, 
          validBetAmounts, 
          match?.allowOneSidedBets || false, 
          betOnSide, 
          bettingMode,
          selectedPlayersA,
          selectedPlayersB
      );
      return zodResolver(schema)(data, context, options);
    },
  });
  
  useEffect(() => {
    if (match?.allowOneSidedBets && open) {
        if(bettingMode === 'qna') {
            questions.forEach(q => {
                const currentPrediction = form.getValues(`predictions.${q.id}`);
                if (betOnSide === 'teamA' && currentPrediction?.teamB) {
                    form.setValue(`predictions.${q.id}.teamB`, '');
                } else if (betOnSide === 'teamB' && currentPrediction?.teamA) {
                    form.setValue(`predictions.${q.id}.teamA`, '');
                }
            });
            form.trigger('predictions');
        }
    }
  }, [betOnSide, questions, form, match?.allowOneSidedBets, open, bettingMode]);


  useEffect(() => {
    async function fetchDialogData() {
      if (match) {
        setIsLoading(true);
        // Reset state on open
        const newBettingMode = 'qna';
        const newBetOnSide = match.allowOneSidedBets ? 'both' : 'both';
        setBettingMode(newBettingMode);
        setBetOnSide(newBetOnSide);
        setSelectedPlayersA([]);
        setSelectedPlayersB([]);
        setQuestions([]);
        
        const [fetchedQuestions, fetchedSettings] = await Promise.all([
            getQuestionsForMatch(match.id),
            getBettingSettings()
        ]);
        
        setBettingSettings(fetchedSettings);
        const validQuestions = fetchedQuestions.filter(q => q.status === 'active');
        setQuestions(validQuestions);

        const defaultQnaPredictions = validQuestions.reduce((acc, q) => {
          acc[q.id] = { teamA: '', teamB: '' };
          return acc;
        }, {} as Record<string, { teamA: string; teamB: string }>);

        // Determine initial bet options to set a default amount
        let initialBetOptions = [];
        if (match.sport === 'Cricket') {
            initialBetOptions = fetchedSettings.betOptions.Cricket.general;
        } else {
            initialBetOptions = fetchedSettings.betOptions[match.sport];
        }

        form.reset({
          amount: initialBetOptions[0]?.amount || 0,
          predictions: defaultQnaPredictions,
        });
        
        setIsLoading(false);
      }
    }

    if (open) {
      fetchDialogData();
    }
  }, [match, open, form]);


  async function handleSubmit(data: any) {
    if (!user || !match) return;

    let finalPredictions: Prediction[] = [];
    
    if (bettingMode === 'player') {
        const teamAPlayers = data.predictions.teamA || {};
        const teamBPlayers = data.predictions.teamB || {};
        
        for (const [playerId, playerQuestions] of Object.entries(teamAPlayers)) {
            const player = match.teamA.players?.find(p => p.name === playerId);
            for (const [questionId, answer] of Object.entries(playerQuestions as Record<string, string>)) {
                finalPredictions.push({
                    questionId: `${player?.name}:${questionId}`,
                    questionText: `(${player?.name}) ${questions.find(q => q.id === questionId)?.question}`,
                    predictedAnswer: { teamA: answer, teamB: '' }
                });
            }
        }
        for (const [playerId, playerQuestions] of Object.entries(teamBPlayers)) {
            const player = match.teamB.players?.find(p => p.name === playerId);
            for (const [questionId, answer] of Object.entries(playerQuestions as Record<string, string>)) {
                 finalPredictions.push({
                    questionId: `${player?.name}:${questionId}`,
                    questionText: `(${player?.name}) ${questions.find(q => q.id === questionId)?.question}`,
                    predictedAnswer: { teamA: '', teamB: answer }
                });
            }
        }
    } else { // QnA mode
        if (data.predictions) {
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
      isOneSidedBet: match.sport === 'Cricket' && betOnSide !== 'both',
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
  const potentialWin = betOptions?.find(opt => opt.amount === amount)?.payout || 0;
  if (!match) return null;

  const PlayerSelector = ({ team }: { team: 'A' | 'B'}) => {
    const players = team === 'A' ? match.teamA.players : match.teamB.players;
    const selectedPlayers = team === 'A' ? selectedPlayersA : selectedPlayersB;
    const setSelectedPlayers = team === 'A' ? setSelectedPlayersA : setSelectedPlayersB;
    const teamName = team === 'A' ? match.teamA.name : match.teamB.name;
    const [popoverOpen, setPopoverOpen] = useState(false);

    if (!players || players.length === 0) return <p className="text-xs text-muted-foreground p-2 text-center">No players listed for {teamName}</p>;

    return (
        <div className="space-y-2">
            <h3 className="font-semibold text-sm">{teamName}</h3>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                        Select Players <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Search player..." />
                        <CommandList>
                             <CommandEmpty>No player found.</CommandEmpty>
                             <CommandGroup>
                                {players.map(player => (
                                    <CommandItem key={player.name} onSelect={() => {
                                        const isSelected = selectedPlayers.some(p => p.name === player.name);
                                        if (isSelected) {
                                            setSelectedPlayers(selectedPlayers.filter(p => p.name !== player.name));
                                        } else {
                                            setSelectedPlayers([...selectedPlayers, player]);
                                        }
                                    }}>
                                         <Checkbox
                                            checked={selectedPlayers.some(p => p.name === player.name)}
                                            className="mr-2"
                                        />
                                        <span>{player.name}</span>
                                    </CommandItem>
                                ))}
                             </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-2">
                {selectedPlayers.map(player => (
                    <Badge key={player.name} variant="secondary" className="flex items-center gap-1">
                        {player.name}
                        <button onClick={() => setSelectedPlayers(selectedPlayers.filter(p => p.name !== player.name))} className="rounded-full hover:bg-muted-foreground/20">
                            <X className="h-3 w-3"/>
                        </button>
                    </Badge>
                ))}
            </div>
        </div>
    )
  }

  const renderPlayerBetUI = () => (
    <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PlayerSelector team="A" />
            <PlayerSelector team="B" />
        </div>
        
        {[...selectedPlayersA, ...selectedPlayersB].map(player => (
            <div key={player.name} className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={player.imageUrl} alt={player.name} />
                        <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h4 className="font-semibold">{player.name}</h4>
                </div>
                <div className="space-y-2">
                    {questions.map(q => (
                        <FormField
                            key={q.id}
                            control={form.control}
                            name={`predictions.${selectedPlayersA.some(p => p.name === player.name) ? 'teamA' : 'teamB'}.${player.name}.${q.id}`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">{q.question}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Prediction"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                    ))}
                </div>
            </div>
        ))}
    </div>
  )

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
                 <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                         <FormItem>
                            <FormLabel className="font-headline text-lg">Select Bet Amount</FormLabel>
                             <FormControl>
                               <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                  {(betOptions || []).map((opt) => (
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
                
                <ScrollArea className="h-72 pr-4">
                  <div className="space-y-4">
                    {isLoading ? (
                      Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                    ) : questions.length > 0 ? (
                       <div className="space-y-4">
                        {match.isSpecialMatch && (
                          <div className="flex items-center justify-center space-x-2 rounded-lg border p-3">
                            <Label htmlFor="betting-mode" className={cn('text-xs sm:text-sm', bettingMode === 'qna' ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                              Predict Q&A
                            </Label>
                            <Switch
                              id="betting-mode"
                              checked={bettingMode === 'player'}
                              onCheckedChange={(checked) => setBettingMode(checked ? 'player' : 'qna')}
                              aria-label="Toggle between Q&A and Player prediction"
                            />
                            <Label htmlFor="betting-mode" className={cn('text-xs sm:text-sm', bettingMode === 'player' ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                              Predict Players
                            </Label>
                          </div>
                        )}

                        {bettingMode === 'qna' && match.allowOneSidedBets && (
                            <div className="p-3 border rounded-lg space-y-2 bg-muted/50">
                                <Label className="text-sm font-semibold text-center block">Bet on</Label>
                                <RadioGroup
                                    value={betOnSide}
                                    onValueChange={(value: 'teamA' | 'teamB' | 'both') => setBetOnSide(value)}
                                    className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
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

                        {bettingMode === 'player' ? renderPlayerBetUI() : (
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-3">
                                <div className="font-semibold text-center">{match.teamA.name}</div>
                                <div></div>
                                <div className="font-semibold text-center">{match.teamB.name}</div>

                                {questions.map((q) => (
                                    <React.Fragment key={q.id}>
                                    {(betOnSide === 'teamA' || betOnSide === 'both' || !match.allowOneSidedBets) && (
                                        <FormField
                                            control={form.control}
                                            name={`predictions.${q.id}.teamA`}
                                            render={({ field }) => (
                                                <FormItem className="w-full">
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="Ans"
                                                            {...field}
                                                            className="text-center"
                                                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                    
                                    {betOnSide === 'teamB' && match.allowOneSidedBets && <div />}

                                    <div className="text-sm font-semibold text-center text-muted-foreground shrink-0">
                                        {q.question}
                                    </div>

                                    {betOnSide === 'teamA' && match.allowOneSidedBets && <div />}
                                    
                                    {(betOnSide === 'teamB' || betOnSide === 'both' || !match.allowOneSidedBets) && (
                                        <FormField
                                                control={form.control}
                                                name={`predictions.${q.id}.teamB`}
                                                render={({ field }) => (
                                                    <FormItem className="w-full">
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                placeholder="Ans"
                                                                className="text-center"
                                                                {...field}
                                                                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                    )}
                                    </React.Fragment>
                                ))}
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
                
                <div className="p-4 bg-accent/10 rounded-lg text-center mt-4">
                  <p className="text-sm text-muted-foreground">Potential Win</p>
                  <p className="text-2xl font-bold font-headline text-primary">INR {potentialWin.toFixed(2)}</p>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">Cancel</Button>
                  </DialogClose>
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

