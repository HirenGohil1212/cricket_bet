
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
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Match, Question, Prediction } from "@/lib/types";
import { createBet } from "@/app/actions/bet.actions";
import { getQuestionsForMatch } from "@/app/actions/qna.actions";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, X } from "lucide-react";

interface GuessDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'list' | 'amount';

export function GuessDialog({ match, open, onOpenChange }: GuessDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState<Step>('list');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selection state for the current bet being placed
  const [currentPrediction, setCurrentPrediction] = useState<Prediction | null>(null);
  const [currentBetType, setCurrentBetType] = useState<'qna' | 'player'>('qna');
  const [amount, setAmount] = useState<number>(0);
  
  // Temporary input state for the list view
  const [qnaInputs, setQnaInputs] = useState<Record<string, { teamA: string, teamB: string }>>({});
  const [playerInputs, setPlayerInputs] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    async function fetchDialogData() {
      if (match && open) {
        setIsLoading(true);
        setStep('list');
        setCurrentPrediction(null);
        
        const fetchedQuestions = await getQuestionsForMatch(match.id);
        const validQuestions = fetchedQuestions.filter(q => q.status === 'active');
        setQuestions(validQuestions);

        const initialQna = validQuestions.reduce((acc, q) => {
          acc[q.id] = { teamA: '', teamB: '' };
          return acc;
        }, {} as Record<string, { teamA: string, teamB: string }>);
        setQnaInputs(initialQna);
        setPlayerInputs({});
        
        setIsLoading(false);
      }
    }
    fetchDialogData();
  }, [match, open]);

  const betOptions = React.useMemo(() => {
    if (!match?.bettingSettings) return [];
    const settings = match.bettingSettings;
    
    if (match.sport === 'Cricket') {
        if (currentBetType === 'player') return settings.betOptions.Cricket.player;
        
        // Determine if one-sided
        const isOneSided = currentPrediction?.predictedAnswer && 
            (!currentPrediction.predictedAnswer.teamA || !currentPrediction.predictedAnswer.teamB);
            
        if (match.allowOneSidedBets && isOneSided) return settings.betOptions.Cricket.oneSided;
        return settings.betOptions.Cricket.general;
    }
    return settings.betOptions[match.sport];
  }, [match, currentPrediction, currentBetType]);

  useEffect(() => {
    if (betOptions.length > 0) {
      setAmount(betOptions[0].amount);
    }
  }, [betOptions]);

  if (!match) return null;

  const handleQnaInputChange = (qId: string, team: 'teamA' | 'teamB', value: string) => {
    setQnaInputs(prev => ({
        ...prev,
        [qId]: { ...prev[qId], [team]: value }
    }));
  };

  const handlePlayerInputChange = (playerName: string, qId: string, value: string) => {
    setPlayerInputs(prev => ({
      ...prev,
      [playerName]: { ...prev[playerName], [qId]: value }
    }));
  };

  const handleInitiateQnaBet = (qId: string) => {
    const inputs = qnaInputs[qId];
    const question = questions.find(q => q.id === qId);
    
    if (!inputs.teamA.trim() && !inputs.teamB.trim()) {
        toast({ variant: "destructive", title: "Missing Prediction", description: "Please enter a value for at least one team." });
        return;
    }

    // Validation for suspended sides
    if (inputs.teamA.trim() && !match.teamABettingEnabled) {
        toast({ variant: "destructive", title: "Suspended", description: `Betting for ${match.teamA.name} is currently suspended.` });
        return;
    }
    if (inputs.teamB.trim() && !match.teamBBettingEnabled) {
        toast({ variant: "destructive", title: "Suspended", description: `Betting for ${match.teamB.name} is currently suspended.` });
        return;
    }

    setCurrentPrediction({
        questionId: qId,
        questionText: question?.question || "Match Prediction",
        predictedAnswer: { teamA: inputs.teamA.trim(), teamB: inputs.teamB.trim() }
    });
    setCurrentBetType('qna');
    setStep('amount');
  };

  const handleInitiatePlayerBet = (playerName: string, qId: string) => {
    const value = playerInputs[playerName]?.[qId] || '';
    const question = questions.find(q => q.id === qId);
    
    const teamAUser = match.teamA.players?.find(p => p.name === playerName);
    const teamBUser = match.teamB.players?.find(p => p.name === playerName);
    const player = teamAUser || teamBUser;
    const teamSide = teamAUser ? 'teamA' : 'teamB';

    if (!value.trim()) {
        toast({ variant: "destructive", title: "Missing Prediction", description: "Please enter your prediction for this player." });
        return;
    }

    if (player && !player.bettingEnabled) {
        toast({ variant: "destructive", title: "Suspended", description: `Betting for ${playerName} is currently suspended.` });
        return;
    }

    setCurrentPrediction({
        questionId: `${playerName}:${qId}`,
        questionText: `(${playerName}) ${question?.question || 'Performance'}`,
        predictedAnswer: { [teamSide]: value.trim() } as any,
    });
    setCurrentBetType('player');
    setStep('amount');
  };

  async function handleSubmit() {
    if (!user || !match || !currentPrediction) return;

    setIsSubmitting(true);
    const result = await createBet({
      userId: user.uid,
      matchId: match.id,
      predictions: [currentPrediction], // Single prediction bet
      amount,
      betType: currentBetType,
      isOneSidedBet: currentBetType === 'qna' && (!currentPrediction.predictedAnswer?.teamA || !currentPrediction.predictedAnswer?.teamB),
    });

    if (result.error) {
      toast({ variant: "destructive", title: "Bet Failed", description: result.error });
    } else {
      toast({ title: "Bet Placed!", description: `Success! Your bet has been recorded.` });
      router.refresh();
      // Stay on list step if they want to place more bets
      setStep('list');
      setCurrentPrediction(null);
    }
    setIsSubmitting(false);
  }

  const potentialWin = betOptions?.find(opt => opt.amount === amount)?.payout || 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}>
      <DialogContent className="sm:max-w-lg bg-[#0a140f] border-none text-foreground p-0 overflow-hidden">
        
        {step === 'list' ? (
            <div className="p-6 space-y-6">
                <DialogHeader className="flex flex-col items-center">
                    <DialogTitle className="font-headline text-2xl text-white mb-1">Play Your Game</DialogTitle>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                        <div className="flex items-center gap-1.5">
                            <Image src={match.teamA.logoUrl} alt="" width={14} height={14} className="rounded-full" />
                            <span>{match.teamA.name}</span>
                        </div>
                        <span className="text-primary">•</span>
                        <div className="flex items-center gap-1.5">
                            <Image src={match.teamB.logoUrl} alt="" width={14} height={14} className="rounded-full" />
                            <span>{match.teamB.name}</span>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="h-[60vh] pr-2">
                    <div className="space-y-6 pb-4">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full bg-[#1a2b24] rounded-xl" />)
                        ) : (
                            <>
                                {/* Match Questions */}
                                <div className="space-y-5">
                                    {questions.map((q) => {
                                        const isRowSuspended = !match.teamABettingEnabled && !match.teamBBettingEnabled;
                                        return (
                                            <div key={q.id} className="space-y-2.5">
                                                <div className="text-center">
                                                    <span className="text-[10px] font-black text-muted-foreground/80 uppercase tracking-tight">
                                                        {q.question}
                                                    </span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <Input
                                                            placeholder={isRowSuspended || !match.teamABettingEnabled ? "---" : match.teamA.name}
                                                            className="bg-transparent border-primary/20 focus-visible:border-primary/60 focus-visible:ring-0 rounded-full text-center h-10 text-xs placeholder:text-muted-foreground/20 disabled:opacity-30"
                                                            value={qnaInputs[q.id]?.teamA ?? ''}
                                                            onChange={(e) => handleQnaInputChange(q.id, 'teamA', e.target.value)}
                                                            disabled={isRowSuspended || !match.teamABettingEnabled}
                                                        />
                                                        {(isRowSuspended || !match.teamABettingEnabled) && (
                                                            <span className="text-[7px] text-destructive font-black uppercase text-center leading-none">Suspended</span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="text-primary font-bold text-[10px] pt-3 px-0.5">VS</div>
                                                    
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <Input
                                                            placeholder={isRowSuspended || !match.teamBBettingEnabled ? "---" : match.teamB.name}
                                                            className="bg-transparent border-primary/20 focus-visible:border-primary/60 focus-visible:ring-0 rounded-full text-center h-10 text-xs placeholder:text-muted-foreground/20 disabled:opacity-30"
                                                            value={qnaInputs[q.id]?.teamB ?? ''}
                                                            onChange={(e) => handleQnaInputChange(q.id, 'teamB', e.target.value)}
                                                            disabled={isRowSuspended || !match.teamBBettingEnabled}
                                                        />
                                                        {(isRowSuspended || !match.teamBBettingEnabled) && (
                                                            <span className="text-[7px] text-destructive font-black uppercase text-center leading-none">Suspended</span>
                                                        )}
                                                    </div>

                                                    <div className="pt-0">
                                                        {isRowSuspended ? (
                                                            <div className="flex items-center justify-center border border-destructive/50 bg-destructive/10 rounded-full h-10 px-3 min-w-[70px]">
                                                                <span className="text-destructive font-black text-[9px] uppercase tracking-tighter">Suspended</span>
                                                            </div>
                                                        ) : (
                                                            <Button 
                                                                size="sm"
                                                                onClick={() => handleInitiateQnaBet(q.id)}
                                                                className="bg-primary hover:bg-primary/80 text-primary-foreground font-black text-[9px] h-10 px-3 rounded-full uppercase shadow-md transition-all active:scale-95 min-w-[70px]"
                                                            >
                                                                Play Now
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Player Performance Section */}
                                {match.isSpecialMatch && (
                                    <div className="space-y-5 pt-2">
                                        <h4 className="text-center text-[10px] font-black text-primary tracking-[0.2em] uppercase">Player Performance</h4>
                                        {[...(match.teamA.players || []), ...(match.teamB.players || [])].map((player) => (
                                            <div key={player.name} className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8 border border-primary/20">
                                                        <AvatarImage src={player.imageUrl} className="object-cover" />
                                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{player.name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm font-black text-white font-headline tracking-wide">{player.name}</span>
                                                </div>
                                                <div className="space-y-2.5">
                                                    {questions.map(q => (
                                                        <div key={`${player.name}-${q.id}`} className="flex items-center gap-2">
                                                            <div className="flex-1 text-[10px] text-muted-foreground font-black uppercase tracking-tight leading-tight">{q.question}</div>
                                                            <div className="flex flex-col gap-0.5 items-center">
                                                                <Input
                                                                    placeholder={!player.bettingEnabled ? "---" : "Predict..."}
                                                                    className="w-24 bg-[#0a140f] border-primary/20 focus-visible:border-primary/60 focus-visible:ring-0 rounded-lg h-9 text-[10px] text-center disabled:opacity-30"
                                                                    value={playerInputs[player.name]?.[q.id] || ''}
                                                                    onChange={(e) => handlePlayerInputChange(player.name, q.id, e.target.value)}
                                                                    disabled={!player.bettingEnabled}
                                                                />
                                                                {!player.bettingEnabled && (
                                                                    <span className="text-[7px] text-destructive font-black uppercase leading-none">Suspended</span>
                                                                )}
                                                            </div>
                                                            {!player.bettingEnabled ? (
                                                                <div className="w-16 flex items-center justify-center border border-destructive/50 bg-destructive/10 rounded-lg h-9">
                                                                    <span className="text-destructive font-black text-[7px] uppercase tracking-tighter">Suspended</span>
                                                                </div>
                                                            ) : (
                                                                <Button 
                                                                    size="sm"
                                                                    onClick={() => handleInitiatePlayerBet(player.name, q.id)}
                                                                    className="bg-primary hover:bg-primary/80 text-primary-foreground font-black text-[8px] h-9 px-2 rounded-lg uppercase shadow-sm"
                                                                >
                                                                    Play
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </ScrollArea>

                <div className="pt-2">
                    <DialogClose asChild>
                        <Button variant="ghost" className="w-full text-muted-foreground hover:text-white font-bold h-10 rounded-xl text-sm">
                            Close Game
                        </Button>
                    </DialogClose>
                </div>
            </div>
        ) : (
            <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <Button variant="ghost" size="icon" onClick={() => setStep('list')} className="text-muted-foreground hover:text-white h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <DialogTitle className="font-headline text-xl text-white">Select Bet Amount</DialogTitle>
                            <p className="text-[9px] text-primary font-black uppercase tracking-widest mt-0.5">
                                {currentPrediction?.questionText}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-2">
                    {betOptions.map((opt) => (
                    <Button
                        key={opt.amount}
                        type="button"
                        variant={amount === opt.amount ? "default" : "secondary"}
                        onClick={() => setAmount(opt.amount)}
                        className={cn(
                            "h-14 font-headline font-black text-xl rounded-2xl border-none transition-all",
                            amount === opt.amount 
                                ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(250,204,82,0.3)] scale-105" 
                                : "bg-[#1a2b24] text-muted-foreground hover:bg-[#253d33]"
                        )}
                    >
                        INR {opt.amount}
                    </Button>
                    ))}
                </div>

                <div className="bg-[#14221b] border border-primary/20 rounded-[1.5rem] p-6 text-center shadow-inner">
                    <p className="text-[9px] uppercase font-black text-primary/60 tracking-[0.3em] mb-2">You Can Win</p>
                    <p className="text-4xl font-headline font-black text-primary">
                        INR {potentialWin.toFixed(2)}
                    </p>
                </div>

                <div className="space-y-3">
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-black text-lg h-14 rounded-xl shadow-lg"
                    >
                        {isSubmitting ? "Placing Bet..." : "Confirm & Place Bet"}
                    </Button>
                    <p className="text-center text-[8px] text-muted-foreground uppercase font-bold tracking-[0.15em]">
                        Your balance will be updated instantly!
                    </p>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
