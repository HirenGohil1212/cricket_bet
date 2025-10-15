
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
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";


interface GuessDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PlayerSelector = ({ team, onPlayerSelect, selectedPlayer }: { team: 'teamA' | 'teamB', onPlayerSelect: (player: Player & {team: 'teamA' | 'teamB'}) => void, selectedPlayer: (Player & {team: 'teamA' | 'teamB'}) | null }) => {
    const { match } = useGuessDialogContext();
    const players = team === 'teamA' ? match.teamA.players : match.teamB.players;
    const teamName = team === 'teamA' ? match.teamA.name : match.teamB.name;
    const [popoverOpen, setPopoverOpen] = React.useState(false);
    
    if (!players || players.length === 0) return <p className="text-xs text-muted-foreground p-2 text-center">No players listed for {teamName}</p>;
    
    return (
        <div className="space-y-2">
            <h3 className="font-semibold text-sm">{teamName}</h3>
             <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                        {selectedPlayer?.team === team ? selectedPlayer.name : `Select Player`}
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <ScrollArea className="h-48">
                        <div className="p-1 space-y-1">
                            {players.map(player => (
                                <Button
                                    key={player.name}
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start font-normal h-auto py-2",
                                        selectedPlayer?.name === player.name && "bg-accent text-accent-foreground"
                                    )}
                                    onClick={() => {
                                        onPlayerSelect({ ...player, team });
                                        setPopoverOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={player.imageUrl} alt={player.name} />
                                            <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span>{player.name}</span>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>
        </div>
    )
}

const GuessDialogContext = React.createContext<{
    match: Match;
    playerPredictions: Record<string, Record<string, string>>;
    handlePlayerInputChange: (playerName: string, qId: string, value: string) => void;
    questions: Question[];
}>({
    match: {} as Match,
    playerPredictions: {},
    handlePlayerInputChange: () => {},
    questions: [],
});

const useGuessDialogContext = () => React.useContext(GuessDialogContext);

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
  const [playerPredictions, setPlayerPredictions] = useState<Record<string, Record<string, string>>>({});
  
  // State for Player Bet UI
  const [selectedPlayer, setSelectedPlayer] = React.useState<(Player & {team: 'teamA' | 'teamB'}) | null>(null);

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
        setBetOnSide('both');
        setSelectedPlayer(null);
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

 const handlePlayerInputChange = (playerName: string, qId: string, value: string) => {
    setPlayerPredictions(prev => ({
      ...prev,
      [playerName]: {
        ...prev[playerName],
        [qId]: value
      }
    }));
  };

  const handlePlayerSelect = (player: (Player & {team: 'teamA' | 'teamB'}) | null) => {
    if (selectedPlayer?.name === player?.name) {
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer(player);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !match) return;

    let finalPredictions: Prediction[] = [];
    
    if (bettingMode === 'player') {
        if (selectedPlayer) {
            const predsForPlayer = playerPredictions[selectedPlayer.name] || {};
            for (const q of questions) {
                const answer = predsForPlayer[q.id];
                if (answer && answer.trim()) {
                    finalPredictions.push({
                        questionId: `${selectedPlayer.name}:${q.id}`,
                        questionText: `(${selectedPlayer.name}) ${q.question}`,
                        predictedAnswer: {
                          [selectedPlayer.team]: answer
                        },
                    });
                }
            }
        }
        if (finalPredictions.length === 0 && selectedPlayer) {
            toast({ variant: "destructive", title: "Validation Failed", description: "Please enter a prediction for the selected player." });
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


  const renderPlayerBetUI = () => (
    <div className="space-y-4">
        {match.allowOneSidedBets && (
            <div className="p-3 border rounded-lg space-y-2 bg-muted/50">
                <Label className="text-sm font-semibold text-center block">Bet on</Label>
                <RadioGroup
                    value={betOnSide}
                    onValueChange={(value: 'teamA' | 'teamB' | 'both') => {
                        setBetOnSide(value);
                        setSelectedPlayer(null); // Reset player selection when team changes
                    }}
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
        <div className="grid grid-cols-1 gap-4">
            {betOnSide === 'teamA' && <PlayerSelector team="teamA" onPlayerSelect={handlePlayerSelect} selectedPlayer={selectedPlayer} />}
            {betOnSide === 'teamB' && <PlayerSelector team="teamB" onPlayerSelect={handlePlayerSelect} selectedPlayer={selectedPlayer} />}
        </div>
        
        {selectedPlayer && (
            <div className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedPlayer.imageUrl} alt={selectedPlayer.name} />
                        <AvatarFallback>{selectedPlayer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h4 className="font-semibold">{selectedPlayer.name}</h4>
                </div>
                <div className="space-y-2">
                    {questions.map(q => (
                       <div key={q.id}>
                           <Label htmlFor={`${selectedPlayer.name}-${q.id}`} className="text-base font-semibold">{q.question}</Label>
                           <Input
                                id={`${selectedPlayer.name}-${q.id}`}
                                type="text"
                                placeholder="Prediction"
                                className="border-accent focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                value={playerPredictions[selectedPlayer.name]?.[q.id] || ''}
                                onChange={(e) => handlePlayerInputChange(selectedPlayer.name, q.id, e.target.value)}
                            />
                       </div>
                    ))}
                </div>
            </div>
        )}
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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <Label className="font-headline text-lg">Select Bet Amount</Label>
              <div className="grid grid-cols-3 gap-2">
                {(betOptions || []).map((opt) => (
                  <Button
                    key={opt.amount}
                    type="button"
                    variant={amount === opt.amount ? "default" : "secondary"}
                    onClick={() => setAmount(opt.amount)}
                    className="font-bold h-12"
                  >
                    INR {opt.amount}
                  </Button>
                ))}
              </div>
            </div>
                
            <ScrollArea className="h-52 pr-4">
              <GuessDialogContext.Provider value={{match, playerPredictions, handlePlayerInputChange, questions }}>
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
                            onCheckedChange={(checked) => {
                              const newMode = checked ? 'player' : 'qna';
                              setBettingMode(newMode);
                              if (newMode === 'player' && match.allowOneSidedBets) {
                                  setBetOnSide('teamA');
                              } else {
                                  setBetOnSide('both');
                              }
                            }}
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
                                          className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-x-6 justify-items-center"
                                      >
                                          <div className="flex items-center space-x-2">
                                              <RadioGroupItem value="teamA" id="r-teamA" />
                                              <Label htmlFor="r-teamA" className="text-xs truncate">{match.teamA.name}</Label>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                              <RadioGroupItem value="teamB" id="r-teamB" />
                                              <Label htmlFor="r-teamB" className="text-xs truncate">{match.teamB.name}</Label>
                                          </div>
                                          <div className="flex items-center space-x-2 col-span-2 sm:col-span-1 justify-center">
                                              <RadioGroupItem value="both" id="r-both" />
                                              <Label htmlFor="r-both" className="text-xs">Both</Label>
                                          </div>
                                      </RadioGroup>
                                  </div>
                              )}
                              <div className="space-y-3">
                                  {questions.map((q) => (
                                      <div key={q.id} className="space-y-2">
                                          <div className="flex items-center gap-2">
                                              {(betOnSide === 'teamA' || betOnSide === 'both' || !match.allowOneSidedBets) ? (
                                                  <Input
                                                      type="text"
                                                      placeholder={`${match.teamA.name}`}
                                                      value={qnaPredictions[q.id]?.teamA ?? ''}
                                                      className="text-center h-9 text-sm flex-1 border-accent focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                                      onChange={(e) => handleQnaInputChange(q.id, 'teamA', e.target.value)}
                                                  />
                                              ) : <div className="flex-1" />}
                                              
                                              <div className="text-sm font-semibold text-center text-muted-foreground px-1 truncate shrink">
                                                {q.question}
                                              </div>
                                              
                                              {(betOnSide === 'teamB' || betOnSide === 'both' || !match.allowOneSidedBets) ? (
                                                  <Input
                                                      type="text"
                                                      placeholder={`${match.teamB.name}`}
                                                      className="text-center h-9 text-sm flex-1 border-accent focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                                      value={qnaPredictions[q.id]?.teamB ?? ''}
                                                      onChange={(e) => handleQnaInputChange(q.id, 'teamB', e.target.value)}
                                                  />
                                              ) : <div className="flex-1" />}
                                          </div>
                                      </div>
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
              </GuessDialogContext.Provider>
            </ScrollArea>
                
            <div className="p-3 bg-accent/10 rounded-lg text-center mt-4">
              <p className="text-sm text-muted-foreground">Potential Win</p>
              <p className="text-2xl font-bold font-headline text-primary">INR {potentialWin.toFixed(2)}</p>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </DialogClose>
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold" disabled={isSubmitting || isLoading || questions.length === 0}>
                {isSubmitting ? "Playing Game..." : "Play Game"}
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    