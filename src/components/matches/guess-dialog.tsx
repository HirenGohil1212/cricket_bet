

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
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";


interface GuessDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuessDialog({ match, open, onOpenChange }: GuessDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [betOnSide, setBetOnSide] = React.useState<'teamA' | 'teamB' | 'both'>('both');
  const [bettingMode, setBettingMode] = useState<'qna' | 'player'>('qna');
  const [amount, setAmount] = useState<number>(0);
  
  // Predictions state
  const [qnaPredictions, setQnaPredictions] = useState<Record<string, { teamA: string, teamB: string }>>({});

  // State for new player bet UI
  const [selectedPlayersA, setSelectedPlayersA] = useState<Player[]>([]);
  const [selectedPlayersB, setSelectedPlayersB] = useState<Player[]>([]);
  const [playerPredictions, setPlayerPredictions] = useState<Record<string, Record<string, Record<string, string>>>>({}); // { teamA: { playerName: { qId: 'ans' } } }

  const betOptions = React.useMemo(() => {
    if (!match?.bettingSettings) return [];
    
    const settings = match.bettingSettings;
    if (match.sport === 'Cricket') {
        const isOneSided = match.allowOneSidedBets && betOnSide !== 'both';
        if (bettingMode === 'player') return settings.betOptions.Cricket.player;
        if (isOneSided) return settings.betOptions.Cricket.oneSided;
        return settings.betOptions.Cricket.general;
    }
    
    return settings.betOptions[match.sport];
  }, [match, bettingMode, betOnSide]);

  useEffect(() => {
    // When bet options change, set the default amount to the first option
    if (betOptions.length > 0) {
      setAmount(betOptions[0].amount);
    } else {
      setAmount(0);
    }
  }, [betOptions]);

  // Effect to clear predictions when switching sides in QnA mode
  useEffect(() => {
    if (match?.allowOneSidedBets && open && bettingMode === 'qna') {
      const clearedPredictions = { ...qnaPredictions };
      for (const qId in clearedPredictions) {
        if (betOnSide === 'teamA') clearedPredictions[qId].teamB = '';
        if (betOnSide === 'teamB') clearedPredictions[qId].teamA = '';
      }
      setQnaPredictions(clearedPredictions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [betOnSide, open]);


  useEffect(() => {
    async function fetchDialogData() {
      if (match) {
        setIsLoading(true);
        // Reset state on open
        setBettingMode('qna');
        setBetOnSide(match.allowOneSidedBets ? 'both' : 'both');
        setSelectedPlayersA([]);
        setSelectedPlayersB([]);
        setQuestions([]);
        setQnaPredictions({});
        setPlayerPredictions({});
        
        const fetchedQuestions = await getQuestionsForMatch(match.id);
        const validQuestions = fetchedQuestions.filter(q => q.status === 'active');
        setQuestions(validQuestions);

        // Set initial state for QnA predictions
        const initialQnaPredictions = validQuestions.reduce((acc, q) => {
          acc[q.id] = { teamA: '', teamB: '' };
          return acc;
        }, {} as Record<string, { teamA: string, teamB: string }>);
        setQnaPredictions(initialQnaPredictions);

        // Determine initial bet options to set a default amount
        let initialBetOptions = [];
        if (match.bettingSettings) {
             if (match.sport === 'Cricket') {
                initialBetOptions = match.bettingSettings.betOptions.Cricket.general;
            } else {
                initialBetOptions = match.bettingSettings.betOptions[match.sport];
            }
        }
        setAmount(initialBetOptions[0]?.amount || 0);
        
        setIsLoading(false);
      }
    }

    if (open) {
      fetchDialogData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, open]);

  const handleQnaInputChange = (qId: string, team: 'teamA' | 'teamB', value: string) => {
    setQnaPredictions(prev => ({
        ...prev,
        [qId]: {
            ...prev[qId],
            [team]: value,
        }
    }));
  };

  const handlePlayerInputChange = (team: 'teamA' | 'teamB', playerName: string, qId: string, value: string) => {
      setPlayerPredictions(prev => ({
          ...prev,
          [team]: {
              ...prev[team],
              [playerName]: {
                  ...prev[team]?.[playerName],
                  [qId]: value
              }
          }
      }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !match) return;

    let finalPredictions: Prediction[] = [];
    
    if (bettingMode === 'player') {
      const teamsToProcess: ('teamA' | 'teamB')[] = ['teamA', 'teamB'];
      for (const team of teamsToProcess) {
        const teamPlayers = team === 'teamA' ? selectedPlayersA : selectedPlayersB;
        const playerPredsForTeam = playerPredictions[team] || {};

        for (const player of teamPlayers) {
          const predsForPlayer = playerPredsForTeam[player.name] || {};
          for (const q of questions) {
            const answer = predsForPlayer[q.id];
            // Validate: only include if answer is not empty or just whitespace
            if (answer && answer.trim()) {
              finalPredictions.push({
                questionId: `${player.name}:${q.id}`,
                questionText: `(${player.name}) ${q.question}`,
                predictedAnswer: team === 'teamA' ? { teamA: answer, teamB: '' } : { teamA: '', teamB: answer }
              });
            }
          }
        }
      }
      if (finalPredictions.length === 0 && (selectedPlayersA.length > 0 || selectedPlayersB.length > 0)) {
        toast({ variant: "destructive", title: "Validation Failed", description: "Please enter a prediction for at least one selected player." });
        return;
      }
      
    } else { // QnA mode
      for (const q of questions) {
        const pred = qnaPredictions[q.id];
        let isValid = false;

        const teamAAnswer = pred?.teamA?.trim() ?? '';
        const teamBAnswer = pred?.teamB?.trim() ?? '';

        if (match.allowOneSidedBets) {
            if (betOnSide === 'teamA' && teamAAnswer) isValid = true;
            else if (betOnSide === 'teamB' && teamBAnswer) isValid = true;
            else if (betOnSide === 'both' && teamAAnswer && teamBAnswer) isValid = true;
        } else {
            if (teamAAnswer && teamBAnswer) isValid = true;
        }

        if(!isValid){
             toast({ variant: "destructive", title: "Validation Failed", description: `Please provide a valid answer for the question: "${q.question}"` });
             return;
        }

        finalPredictions.push({
          questionId: q.id,
          questionText: q.question,
          predictedAnswer: {
            teamA: teamAAnswer,
            teamB: teamBAnswer,
          }
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
      amount,
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

  const potentialWin = betOptions?.find(opt => opt.amount === amount)?.payout || 0;
  if (!match) return null;

  const PlayerSelector = ({ team }: { team: 'A' | 'B'}) => {
    const players = team === 'A' ? match.teamA.players : match.teamB.players;
    const teamName = team === 'A' ? match.teamA.name : match.teamB.name;
    const [popoverOpen, setPopoverOpen] = useState(false);
    
    const { selectedPlayers, setSelectedPlayers } = team === 'A' ? 
        { selectedPlayers: selectedPlayersA, setSelectedPlayers: setSelectedPlayersA } : 
        { selectedPlayers: selectedPlayersB, setSelectedPlayers: setSelectedPlayersB };

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
                    <ScrollArea className="h-48">
                        <div className="p-2 space-y-1">
                            {players.map(player => (
                                <Label key={player.name} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer font-normal">
                                    <Checkbox
                                        checked={selectedPlayers.some(p => p.name === player.name)}
                                        onCheckedChange={(checked) => {
                                            const isSelected = selectedPlayers.some(p => p.name === player.name);
                                            if (checked && !isSelected) {
                                                setSelectedPlayers([...selectedPlayers, player]);
                                            } else if (!checked && isSelected) {
                                                setSelectedPlayers(selectedPlayers.filter(p => p.name !== player.name));
                                            }
                                        }}
                                    />
                                    <span>{player.name}</span>
                                </Label>
                            ))}
                        </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-2">
                {selectedPlayers.map(player => (
                    <Badge key={player.name} variant="secondary" className="flex items-center gap-1">
                        {player.name}
                        <button type="button" onClick={() => setSelectedPlayers(selectedPlayers.filter(p => p.name !== player.name))} className="rounded-full hover:bg-muted-foreground/20">
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
        {match.allowOneSidedBets && (
            <div className="p-3 border rounded-lg space-y-2 bg-muted/50">
                <Label className="text-sm font-semibold text-center block">Bet on</Label>
                <RadioGroup
                    value={betOnSide === 'both' ? 'teamA' : betOnSide}
                    onValueChange={(value: 'teamA' | 'teamB' | 'both') => setBetOnSide(value)}
                    className="grid grid-cols-2 gap-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="teamA" id="pr-teamA" />
                        <Label htmlFor="pr-teamA" className="text-xs truncate">{match.teamA.name}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="teamB" id="pr-teamB" />
                        <Label htmlFor="pr-teamB" className="text-xs truncate">{match.teamB.name}</Label>
                    </div>
                </RadioGroup>
            </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(betOnSide === 'teamA' || betOnSide === 'both') && <PlayerSelector team="A" />}
            {(betOnSide === 'teamB' || betOnSide === 'both') && <PlayerSelector team="B" />}
        </div>
        
        {[...selectedPlayersA, ...selectedPlayersB].map((player, idx) => (
            <div key={`${player.name}-${idx}`} className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={player.imageUrl} alt={player.name} />
                        <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h4 className="font-semibold">{player.name}</h4>
                </div>
                <div className="space-y-2">
                    {questions.map(q => (
                       <div key={q.id}>
                           <Label htmlFor={`${player.name}-${q.id}`} className="text-base font-semibold">{q.question}</Label>
                           <Input
                                id={`${player.name}-${q.id}`}
                                type="text"
                                placeholder="Prediction"
                                value={playerPredictions[selectedPlayersA.some(p => p.name === player.name) ? 'teamA' : 'teamB']?.[player.name]?.[q.id] || ''}
                                onChange={(e) => handlePlayerInputChange(selectedPlayersA.some(p => p.name === player.name) ? 'teamA' : 'teamB', player.name, q.id, e.target.value)}
                            />
                       </div>
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
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label className="font-headline text-lg">Select Bet Amount</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {(betOptions || []).map((opt) => (
                  <Button
                    key={opt.amount}
                    type="button"
                    variant={amount === opt.amount ? "default" : "secondary"}
                    onClick={() => setAmount(opt.amount)}
                    className="font-bold"
                  >
                    INR {opt.amount}
                  </Button>
                ))}
              </div>
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

                    {bettingMode === 'player' ? renderPlayerBetUI() : (
                       <>
                            {match.allowOneSidedBets && (
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
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-3">
                                <div className="font-semibold text-center">{match.teamA.name}</div>
                                <div></div>
                                <div className="font-semibold text-center">{match.teamB.name}</div>

                                {questions.map((q) => (
                                    <React.Fragment key={q.id}>
                                    {(betOnSide === 'teamA' || betOnSide === 'both' || !match.allowOneSidedBets) && (
                                        <Input
                                            type="text"
                                            placeholder="Ans"
                                            value={qnaPredictions[q.id]?.teamA ?? ''}
                                            className="text-center"
                                            onChange={(e) => handleQnaInputChange(q.id, 'teamA', e.target.value)}
                                        />
                                    )}
                                    
                                    {betOnSide === 'teamB' && match.allowOneSidedBets && <div />}

                                    <div className="text-sm font-semibold text-center text-muted-foreground shrink-0">
                                        {q.question}
                                    </div>

                                    {betOnSide === 'teamA' && match.allowOneSidedBets && <div />}
                                    
                                    {(betOnSide === 'teamB' || betOnSide === 'both' || !match.allowOneSidedBets) && (
                                        <Input
                                            type="text"
                                            placeholder="Ans"
                                            className="text-center"
                                            value={qnaPredictions[q.id]?.teamB ?? ''}
                                            onChange={(e) => handleQnaInputChange(q.id, 'teamB', e.target.value)}
                                        />
                                    )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </>
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
      </DialogContent>
    </Dialog>
  );
}
