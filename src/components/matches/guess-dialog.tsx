
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
import type { Match, Question, Prediction, Player } from "@/lib/types";
import { createBet } from "@/app/actions/bet.actions";
import { getQuestionsForMatch } from "@/app/actions/qna.actions";
import { useAuth } from "@/context/auth-context";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const [amount, setAmount] = useState<number>(0);
  
  // Predictions state
  const [qnaPredictions, setQnaPredictions] = useState<Record<string, { teamA: string, teamB: string }>>({});
  const [playerPredictions, setPlayerPredictions] = useState<Record<string, Record<string, string>>>({});
  
  // State for Player selection within the unified list
  const [selectedPlayer, setSelectedPlayer] = React.useState<(Player & {team: 'teamA' | 'teamB'}) | null>(null);

  const betOptions = React.useMemo(() => {
    if (!match?.bettingSettings) return [];
    const settings = match.bettingSettings;
    
    if (match.sport === 'Cricket') {
        // If we are predicting for a player, use player options. Otherwise, check one-sided.
        if (selectedPlayer) return settings.betOptions.Cricket.player;
        if (match.allowOneSidedBets && betOnSide !== 'both') return settings.betOptions.Cricket.oneSided;
        return settings.betOptions.Cricket.general;
    }
    return settings.betOptions[match.sport];
  }, [match, betOnSide, selectedPlayer]);

  useEffect(() => {
    if (betOptions.length > 0) {
      setAmount(betOptions[0].amount);
    }
  }, [betOptions]);

  useEffect(() => {
    async function fetchDialogData() {
      if (match && open) {
        setIsLoading(true);
        setBetOnSide('both');
        setSelectedPlayer(null);
        
        const fetchedQuestions = await getQuestionsForMatch(match.id);
        const validQuestions = fetchedQuestions.filter(q => q.status === 'active');
        setQuestions(validQuestions);

        const initialQna = validQuestions.reduce((acc, q) => {
          acc[q.id] = { teamA: '', teamB: '' };
          return acc;
        }, {} as Record<string, { teamA: string, teamB: string }>);
        setQnaPredictions(initialQna);
        
        setIsLoading(false);
      }
    }
    fetchDialogData();
  }, [match, open]);

  if (!match) return null;

  const handleQnaInputChange = (qId: string, team: 'teamA' | 'teamB', value: string) => {
    setQnaPredictions(prev => ({
        ...prev,
        [qId]: { ...prev[qId], [team]: value }
    }));
  };

  const handlePlayerInputChange = (playerName: string, qId: string, value: string) => {
    // When a player input is used, we treat this as a player bet
    const player = (match.teamA.players?.find(p => p.name === playerName)) 
      ? { ...match.teamA.players.find(p => p.name === playerName)!, team: 'teamA' as const }
      : { ...match.teamB.players?.find(p => p.name === playerName)!, team: 'teamB' as const };
    
    setSelectedPlayer(player);
    setPlayerPredictions(prev => ({
      ...prev,
      [playerName]: { ...prev[playerName], [qId]: value }
    }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !match) return;

    let finalPredictions: Prediction[] = [];
    const isPlayerBet = !!selectedPlayer;
    
    if (isPlayerBet && selectedPlayer) {
        const predsForPlayer = playerPredictions[selectedPlayer.name] || {};
        for (const q of questions) {
            const answer = predsForPlayer[q.id];
            if (answer && answer.trim()) {
                finalPredictions.push({
                    questionId: `${selectedPlayer.name}:${q.id}`,
                    questionText: `(${selectedPlayer.name}) ${q.question}`,
                    predictedAnswer: { [selectedPlayer.team]: answer },
                });
            }
        }
    } else {
      for (const q of questions) {
        const pred = qnaPredictions[q.id];
        const teamAAnswer = pred?.teamA?.trim() ?? '';
        const teamBAnswer = pred?.teamB?.trim() ?? '';

        if (match.allowOneSidedBets) {
            if (betOnSide === 'teamA' && !teamAAnswer) continue;
            if (betOnSide === 'teamB' && !teamBAnswer) continue;
            if (betOnSide === 'both' && (!teamAAnswer || !teamBAnswer)) continue;
        } else if (!teamAAnswer || !teamBAnswer) {
            continue;
        }

        finalPredictions.push({
          questionId: q.id,
          questionText: q.question,
          predictedAnswer: { teamA: teamAAnswer, teamB: teamBAnswer }
        });
      }
    }

    if (finalPredictions.length === 0) {
        toast({ variant: "destructive", title: "Validation Failed", description: "Please enter your predictions before playing." });
        return;
    }

    setIsSubmitting(true);
    const result = await createBet({
      userId: user.uid,
      matchId: match.id,
      predictions: finalPredictions,
      amount,
      betType: isPlayerBet ? 'player' : 'qna',
      isOneSidedBet: !isPlayerBet && betOnSide !== 'both',
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}>
      <DialogContent className="sm:max-w-lg bg-[#0a140f] border-none text-foreground p-0 overflow-hidden">
        <div className="p-6 space-y-6">
            <DialogHeader className="flex flex-col items-center">
              <DialogTitle className="font-headline text-3xl text-white mb-2">Play Your Game</DialogTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Image src={match.teamA.logoUrl} alt="" width={20} height={20} className="rounded-full" />
                    <span>{match.teamA.name}</span>
                  </div>
                  <span className="text-primary font-bold">vs</span>
                  <div className="flex items-center gap-2">
                    <Image src={match.teamB.logoUrl} alt="" width={20} height={20} className="rounded-full" />
                    <span>{match.teamB.name}</span>
                  </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
                <Label className="font-headline text-xl text-white">Select Amount</Label>
                <div className="grid grid-cols-3 gap-2">
                    {betOptions.map((opt) => (
                    <Button
                        key={opt.amount}
                        type="button"
                        variant={amount === opt.amount ? "default" : "secondary"}
                        onClick={() => setAmount(opt.amount)}
                        className={cn(
                            "h-12 font-bold text-lg rounded-md border-none",
                            amount === opt.amount ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(250,204,82,0.3)]" : "bg-[#1a2b24] text-muted-foreground hover:bg-[#253d33]"
                        )}
                    >
                        INR {opt.amount}
                    </Button>
                    ))}
                </div>
            </div>

            <div className="bg-[#14221b] rounded-lg p-1">
                <RadioGroup
                    value={betOnSide}
                    onValueChange={(value: any) => {
                        setBetOnSide(value);
                        setSelectedPlayer(null);
                    }}
                    className="grid grid-cols-3 gap-0"
                >
                    {['teamA', 'teamB', 'both'].map((side) => {
                        const isSelected = betOnSide === side;
                        const label = side === 'both' ? 'Both' : (side === 'teamA' ? match.teamA.name : match.teamB.name);
                        return (
                            <label key={side} className={cn(
                                "flex items-center justify-center gap-2 py-2 px-1 rounded-md cursor-pointer transition-all text-[10px] sm:text-xs font-semibold uppercase truncate",
                                isSelected ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"
                            )}>
                                <RadioGroupItem value={side} className="sr-only" />
                                <div className={cn("w-3 h-3 rounded-full border-2 flex items-center justify-center", isSelected ? "border-primary" : "border-muted-foreground")}>
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </div>
                                {label}
                            </label>
                        )
                    })}
                </RadioGroup>
            </div>

            <ScrollArea className="h-64 pr-4">
                <div className="space-y-4 pb-4">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full bg-[#1a2b24]" />)
                    ) : (
                        <>
                            {/* Team Questions */}
                            <div className="space-y-3">
                                {questions.map((q) => (
                                    <div key={q.id} className="flex items-center gap-2">
                                        <Input
                                            placeholder={match.teamA.name}
                                            disabled={betOnSide === 'teamB'}
                                            className="flex-1 bg-transparent border-primary/40 focus-visible:ring-primary rounded-full text-center h-9 text-xs placeholder:text-muted-foreground/30"
                                            value={qnaPredictions[q.id]?.teamA ?? ''}
                                            onChange={(e) => handleQnaInputChange(q.id, 'teamA', e.target.value)}
                                        />
                                        <div className="w-20 text-center text-[10px] font-black text-muted-foreground leading-tight uppercase shrink-0">
                                            {q.question}
                                        </div>
                                        <Input
                                            placeholder={match.teamB.name}
                                            disabled={betOnSide === 'teamA'}
                                            className="flex-1 bg-transparent border-primary/40 focus-visible:ring-primary rounded-full text-center h-9 text-xs placeholder:text-muted-foreground/30"
                                            value={qnaPredictions[q.id]?.teamB ?? ''}
                                            onChange={(e) => handleQnaInputChange(q.id, 'teamB', e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Player Section if Special Match */}
                            {match.isSpecialMatch && (
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <h4 className="text-center text-xs font-bold text-primary tracking-widest uppercase">Player Performance</h4>
                                    {[... (match.teamA.players || []), ... (match.teamB.players || [])].filter(p => p.bettingEnabled).map((player) => (
                                        <div key={player.name} className="space-y-2 p-3 bg-white/5 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={player.imageUrl} />
                                                    <AvatarFallback>{player.name[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-bold text-white">{player.name}</span>
                                            </div>
                                            {questions.map(q => (
                                                <div key={`${player.name}-${q.id}`} className="flex items-center gap-2">
                                                     <div className="flex-1 text-[10px] text-muted-foreground uppercase">{q.question}</div>
                                                     <Input
                                                        placeholder="Your prediction..."
                                                        className="flex-1 bg-[#0a140f] border-primary/40 focus-visible:ring-primary rounded-md h-8 text-xs text-center"
                                                        value={playerPredictions[player.name]?.[q.id] || ''}
                                                        onChange={(e) => handlePlayerInputChange(player.name, q.id, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </ScrollArea>

            <div className="bg-[#14221b] border border-white/5 rounded-xl p-4 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Potential Win</p>
                <p className="text-4xl font-headline font-black text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    INR {potentialWin.toFixed(2)}
                </p>
            </div>

            <div className="flex items-center gap-4">
                 <DialogClose asChild>
                    <button type="button" className="text-sm font-bold text-muted-foreground hover:text-white transition-colors">Cancel</button>
                </DialogClose>
                <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || isLoading || questions.length === 0}
                    className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground font-black text-lg h-14 rounded-xl shadow-[0_4px_20px_rgba(250,204,82,0.2)]"
                >
                    {isSubmitting ? "Placing Bet..." : "Play Game"}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
