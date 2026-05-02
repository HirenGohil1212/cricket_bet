
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
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface GuessDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'predictions' | 'amount';

export function GuessDialog({ match, open, onOpenChange }: GuessDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState<Step>('predictions');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [amount, setAmount] = useState<number>(0);
  
  // Predictions state
  const [qnaPredictions, setQnaPredictions] = useState<Record<string, { teamA: string, teamB: string }>>({});
  const [playerPredictions, setPlayerPredictions] = useState<Record<string, Record<string, string>>>({});

  // Derivations for bet type logic
  const isPlayerBet = Object.values(playerPredictions).some(p => Object.values(p).some(v => v.trim() !== ''));
  
  const betOnSide = React.useMemo(() => {
    let hasA = false;
    let hasB = false;
    
    // Check QnA
    Object.values(qnaPredictions).forEach(p => {
        if (p.teamA.trim()) hasA = true;
        if (p.teamB.trim()) hasB = true;
    });
    
    // Check Player
    if (match) {
        Object.entries(playerPredictions).forEach(([name, preds]) => {
            const isTeamA = match.teamA.players?.some(p => p.name === name);
            const isTeamB = match.teamB.players?.some(p => p.name === name);
            if (Object.values(preds).some(v => v.trim() !== '')) {
                if (isTeamA) hasA = true;
                if (isTeamB) hasB = true;
            }
        });
    }

    if (hasA && hasB) return 'both';
    if (hasA) return 'teamA';
    if (hasB) return 'teamB';
    return 'both';
  }, [qnaPredictions, playerPredictions, match]);

  const betOptions = React.useMemo(() => {
    if (!match?.bettingSettings) return [];
    const settings = match.bettingSettings;
    
    if (match.sport === 'Cricket') {
        if (isPlayerBet) return settings.betOptions.Cricket.player;
        if (match.allowOneSidedBets && betOnSide !== 'both') return settings.betOptions.Cricket.oneSided;
        return settings.betOptions.Cricket.general;
    }
    return settings.betOptions[match.sport];
  }, [match, betOnSide, isPlayerBet]);

  useEffect(() => {
    if (betOptions.length > 0 && amount === 0) {
      setAmount(betOptions[0].amount);
    }
  }, [betOptions, amount]);

  useEffect(() => {
    async function fetchDialogData() {
      if (match && open) {
        setIsLoading(true);
        setStep('predictions');
        
        const fetchedQuestions = await getQuestionsForMatch(match.id);
        const validQuestions = fetchedQuestions.filter(q => q.status === 'active');
        setQuestions(validQuestions);

        const initialQna = validQuestions.reduce((acc, q) => {
          acc[q.id] = { teamA: '', teamB: '' };
          return acc;
        }, {} as Record<string, { teamA: string, teamB: string }>);
        setQnaPredictions(initialQna);
        setPlayerPredictions({});
        
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
    setPlayerPredictions(prev => ({
      ...prev,
      [playerName]: { ...prev[playerName], [qId]: value }
    }));
  };

  const validatePredictions = () => {
    let finalPredictions: Prediction[] = [];
    
    // Process QnA
    for (const q of questions) {
        const pred = qnaPredictions[q.id];
        const teamAAnswer = pred?.teamA?.trim() ?? '';
        const teamBAnswer = pred?.teamB?.trim() ?? '';

        if (!teamAAnswer && !teamBAnswer) continue;

        finalPredictions.push({
            questionId: q.id,
            questionText: q.question,
            predictedAnswer: { teamA: teamAAnswer, teamB: teamBAnswer }
        });
    }

    // Process Player
    Object.entries(playerPredictions).forEach(([playerName, preds]) => {
        const player = [...(match.teamA.players || []), ...(match.teamB.players || [])].find(p => p.name === playerName);
        const teamSide = match.teamA.players?.some(p => p.name === playerName) ? 'teamA' : 'teamB';
        
        Object.entries(preds).forEach(([qId, value]) => {
            if (value.trim()) {
                const question = questions.find(q => q.id === qId);
                finalPredictions.push({
                    questionId: `${playerName}:${qId}`,
                    questionText: `(${playerName}) ${question?.question || 'Performance'}`,
                    predictedAnswer: { [teamSide]: value.trim() } as any,
                });
            }
        });
    });

    return finalPredictions;
  };

  const handleGoToAmount = () => {
    const preds = validatePredictions();
    if (preds.length === 0) {
        toast({ variant: "destructive", title: "Wait!", description: "Please fill in at least one prediction to continue." });
        return;
    }
    setStep('amount');
  };

  async function handleSubmit() {
    if (!user || !match) return;

    const finalPredictions = validatePredictions();
    
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
      toast({ title: "Bet Placed!", description: `Your bet has been placed successfully.` });
      router.refresh();
      onOpenChange(false);
    }
    setIsSubmitting(false);
  }

  const potentialWin = betOptions?.find(opt => opt.amount === amount)?.payout || 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}>
      <DialogContent className="sm:max-w-lg bg-[#0a140f] border-none text-foreground p-0 overflow-hidden">
        
        {step === 'predictions' ? (
            <div className="p-6 space-y-6">
                <DialogHeader className="flex flex-col items-center">
                    <DialogTitle className="font-headline text-3xl text-white mb-2">Play Your Game</DialogTitle>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        <div className="flex items-center gap-2">
                            <Image src={match.teamA.logoUrl} alt="" width={16} height={16} className="rounded-full" />
                            <span>{match.teamA.name}</span>
                        </div>
                        <span className="text-primary">vs</span>
                        <div className="flex items-center gap-2">
                            <Image src={match.teamB.logoUrl} alt="" width={16} height={16} className="rounded-full" />
                            <span>{match.teamB.name}</span>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6 pb-4">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full bg-[#1a2b24]" />)
                        ) : (
                            <>
                                {/* Unified Match Questions */}
                                <div className="space-y-4">
                                    {questions.map((q) => (
                                        <div key={q.id} className="space-y-2">
                                            <div className="text-center">
                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                                                    {q.question}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    placeholder={match.teamA.name}
                                                    className="flex-1 bg-transparent border-primary/30 focus-visible:ring-primary rounded-full text-center h-10 text-xs placeholder:text-muted-foreground/20"
                                                    value={qnaPredictions[q.id]?.teamA ?? ''}
                                                    onChange={(e) => handleQnaInputChange(q.id, 'teamA', e.target.value)}
                                                />
                                                <div className="text-primary font-bold text-xs">VS</div>
                                                <Input
                                                    placeholder={match.teamB.name}
                                                    className="flex-1 bg-transparent border-primary/30 focus-visible:ring-primary rounded-full text-center h-10 text-xs placeholder:text-muted-foreground/20"
                                                    value={qnaPredictions[q.id]?.teamB ?? ''}
                                                    onChange={(e) => handleQnaInputChange(q.id, 'teamB', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Player Performance Section */}
                                {match.isSpecialMatch && (
                                    <div className="space-y-6 pt-6 border-t border-white/5">
                                        <h4 className="text-center text-xs font-black text-primary tracking-[0.2em] uppercase">Player Performance</h4>
                                        {[...(match.teamA.players || []), ...(match.teamB.players || [])].filter(p => p.bettingEnabled).map((player) => (
                                            <div key={player.name} className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Avatar className="h-8 w-8 border border-primary/20">
                                                        <AvatarImage src={player.imageUrl} />
                                                        <AvatarFallback className="bg-primary/10 text-primary">{player.name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm font-black text-white font-headline tracking-wide">{player.name}</span>
                                                </div>
                                                {questions.map(q => (
                                                    <div key={`${player.name}-${q.id}`} className="grid grid-cols-[1fr_2fr] items-center gap-4">
                                                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{q.question}</div>
                                                        <Input
                                                            placeholder="Your prediction..."
                                                            className="bg-[#0a140f] border-primary/30 focus-visible:ring-primary rounded-lg h-9 text-xs text-center"
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

                <div className="flex items-center gap-4 pt-2">
                    <DialogClose asChild>
                        <button type="button" className="text-sm font-bold text-muted-foreground hover:text-white transition-colors px-4">Cancel</button>
                    </DialogClose>
                    <Button 
                        onClick={handleGoToAmount} 
                        disabled={isLoading || questions.length === 0}
                        className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground font-black text-lg h-14 rounded-xl shadow-[0_4px_20px_rgba(250,204,82,0.2)] group"
                    >
                        Play Now
                        <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        ) : (
            <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <DialogHeader>
                    <div className="flex items-center gap-4 mb-4">
                        <Button variant="ghost" size="icon" onClick={() => setStep('predictions')} className="text-muted-foreground hover:text-white">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <DialogTitle className="font-headline text-3xl text-white">Select Bet Amount</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {betOptions.map((opt) => (
                        <Button
                            key={opt.amount}
                            type="button"
                            variant={amount === opt.amount ? "default" : "secondary"}
                            onClick={() => setAmount(opt.amount)}
                            className={cn(
                                "h-16 font-headline font-black text-2xl rounded-2xl border-none transition-all",
                                amount === opt.amount ? "bg-primary text-primary-foreground shadow-[0_0_25px_rgba(250,204,82,0.4)] scale-105" : "bg-[#1a2b24] text-muted-foreground hover:bg-[#253d33]"
                            )}
                        >
                            INR {opt.amount}
                        </Button>
                        ))}
                    </div>
                </div>

                <div className="bg-[#14221b] border border-primary/20 rounded-3xl p-8 text-center shadow-inner">
                    <p className="text-xs uppercase font-black text-primary/60 tracking-[0.3em] mb-3">Potential Winnings</p>
                    <p className="text-6xl font-headline font-black text-primary drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                        INR {potentialWin.toFixed(2)}
                    </p>
                </div>

                <div className="space-y-3">
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-black text-xl h-16 rounded-2xl shadow-[0_8px_30px_rgba(250,204,82,0.3)]"
                    >
                        {isSubmitting ? "Processing Bet..." : "Confirm & Place Bet"}
                    </Button>
                    <p className="text-center text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                        Good Luck! Your winnings will be credited instantly.
                    </p>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
