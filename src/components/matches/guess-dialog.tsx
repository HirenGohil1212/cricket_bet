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
import { ArrowLeft } from "lucide-react";

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
  
  const [currentPrediction, setCurrentPrediction] = useState<Prediction | null>(null);
  const [currentBetType, setCurrentBetType] = useState<'qna' | 'player'>('qna');
  const [amount, setAmount] = useState<number>(0);
  
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
      predictions: [currentPrediction],
      amount,
      betType: currentBetType,
      isOneSidedBet: currentBetType === 'qna' && (!currentPrediction.predictedAnswer?.teamA || !currentPrediction.predictedAnswer?.teamB),
    });

    if (result.error) {
      toast({ variant: "destructive", title: "Bet Failed", description: result.error });
    } else {
      toast({ title: "Bet Placed!", description: `Success! Your bet has been recorded.` });
      router.refresh();
      setStep('list');
      setCurrentPrediction(null);
    }
    setIsSubmitting(false);
  }

  const potentialWin = betOptions?.find(opt => opt.amount === amount)?.payout || 0;

  const playersWithTeamInfo = [
      ...(match.teamA.players || []).map(p => ({ ...p, teamLogo: match.teamA.logoUrl, teamName: match.teamA.name })),
      ...(match.teamB.players || []).map(p => ({ ...p, teamLogo: match.teamB.logoUrl, teamName: match.teamB.name })),
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}>
      <DialogContent className="sm:max-w-lg bg-[#0a140f] border-none text-foreground p-0 overflow-hidden">
        
        {step === 'list' ? (
            <div className="p-6 space-y-6">
                <DialogHeader className="flex flex-col items-center">
                    <DialogTitle className="font-headline text-3xl text-white mb-1">Play Your Game</DialogTitle>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        <div className="flex items-center gap-1.5">
                            <Image src={match.teamA.logoUrl} alt="" width={16} height={16} className="rounded-full" />
                            <span>{match.teamA.name}</span>
                        </div>
                        <span className="text-primary font-black">•</span>
                        <div className="flex items-center gap-1.5">
                            <Image src={match.teamB.logoUrl} alt="" width={16} height={16} className="rounded-full" />
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
                                            <div key={q.id} className="space-y-3">
                                                <div className="text-center">
                                                    <span className="text-lg font-black text-primary uppercase tracking-[0.1em]">
                                                        {q.question}
                                                    </span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <Input
                                                            placeholder={isRowSuspended || !match.teamABettingEnabled ? "---" : match.teamA.name}
                                                            className="bg-[#14221b] border-primary/20 focus-visible:border-primary/60 focus-visible:ring-0 rounded-full text-center h-12 text-sm placeholder:text-muted-foreground/30 font-bold disabled:opacity-30"
                                                            value={qnaInputs[q.id]?.teamA ?? ''}
                                                            onChange={(e) => handleQnaInputChange(q.id, 'teamA', e.target.value)}
                                                            disabled={isRowSuspended || !match.teamABettingEnabled}
                                                        />
                                                        {(isRowSuspended || !match.teamABettingEnabled) && (
                                                            <span className="text-[8px] text-destructive font-black uppercase text-center leading-none tracking-wider">Suspended</span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="text-primary font-black text-xs pt-4 px-1">VS</div>
                                                    
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <Input
                                                            placeholder={isRowSuspended || !match.teamBBettingEnabled ? "---" : match.teamB.name}
                                                            className="bg-[#14221b] border-primary/20 focus-visible:border-primary/60 focus-visible:ring-0 rounded-full text-center h-12 text-sm placeholder:text-muted-foreground/30 font-bold disabled:opacity-30"
                                                            value={qnaInputs[q.id]?.teamB ?? ''}
                                                            onChange={(e) => handleQnaInputChange(q.id, 'teamB', e.target.value)}
                                                            disabled={isRowSuspended || !match.teamBBettingEnabled}
                                                        />
                                                        {(isRowSuspended || !match.teamBBettingEnabled) && (
                                                            <span className="text-[8px] text-destructive font-black uppercase text-center leading-none tracking-wider">Suspended</span>
                                                        )}
                                                    </div>

                                                    <div className="pt-0">
                                                        {isRowSuspended ? (
                                                            <div className="flex items-center justify-center border-2 border-destructive/50 bg-destructive/10 rounded-full h-12 px-3 min-w-[85px]">
                                                                <span className="text-destructive font-black text-[10px] uppercase tracking-tighter">SUSPENDED</span>
                                                            </div>
                                                        ) : (
                                                            <Button 
                                                                size="sm"
                                                                onClick={() => handleInitiateQnaBet(q.id)}
                                                                className="bg-primary hover:bg-primary/80 text-primary-foreground font-black text-[10px] h-12 px-4 rounded-full uppercase shadow-xl transition-all active:scale-95 min-w-[85px] tracking-tight"
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
                                    <div className="space-y-6 pt-4">
                                        <h4 className="text-center text-xs font-black text-primary tracking-[0.3em] uppercase">Player Performance</h4>
                                        {playersWithTeamInfo.map((player) => (
                                            <div key={player.name} className="space-y-4 p-5 bg-white/[0.03] rounded-[2rem] border border-white/5 shadow-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <Avatar className="h-12 w-12 border-2 border-primary/30">
                                                            <AvatarImage src={player.imageUrl} className="object-cover" />
                                                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-black">{player.name[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#0a140f] overflow-hidden bg-white">
                                                            <Image src={player.teamLogo} alt="" width={24} height={24} className="object-cover w-full h-full" />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-lg font-black text-white font-headline tracking-wide leading-tight">{player.name}</span>
                                                        <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">{player.teamName}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    {questions.map(q => (
                                                        <div key={`${player.name}-${q.id}`} className="flex items-center gap-3">
                                                            <div className="flex-1 text-lg font-black text-primary uppercase tracking-wider leading-tight">{q.question}</div>
                                                            <div className="flex flex-col gap-0.5 items-center">
                                                                <Input
                                                                    placeholder={!player.bettingEnabled ? "---" : "Predict..."}
                                                                    className="w-28 bg-[#0a140f] border-primary/20 focus-visible:border-primary/60 focus-visible:ring-0 rounded-xl h-11 text-xs text-center font-bold disabled:opacity-30 placeholder:text-muted-foreground/20"
                                                                    value={playerInputs[player.name]?.[q.id] || ''}
                                                                    onChange={(e) => handlePlayerInputChange(player.name, q.id, e.target.value)}
                                                                    disabled={!player.bettingEnabled}
                                                                />
                                                                {!player.bettingEnabled && (
                                                                    <span className="text-[7px] text-destructive font-black uppercase leading-none tracking-widest">Suspended</span>
                                                                )}
                                                            </div>
                                                            {!player.bettingEnabled ? (
                                                                <div className="w-20 flex items-center justify-center border-2 border-destructive/50 bg-destructive/10 rounded-xl h-11">
                                                                    <span className="text-destructive font-black text-[8px] uppercase tracking-tighter">SUSPENDED</span>
                                                                </div>
                                                            ) : (
                                                                <Button 
                                                                    size="sm"
                                                                    onClick={() => handleInitiatePlayerBet(player.name, q.id)}
                                                                    className="bg-primary hover:bg-primary/80 text-primary-foreground font-black text-[10px] h-11 px-4 rounded-xl uppercase shadow-lg tracking-tight"
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
                        <Button variant="ghost" className="w-full text-muted-foreground hover:text-white font-black h-12 rounded-2xl text-sm uppercase tracking-widest">
                            Close Game
                        </Button>
                    </DialogClose>
                </div>
            </div>
        ) : (
            <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <DialogHeader>
                    <div className="flex items-center gap-4 mb-4">
                        <Button variant="ghost" size="icon" onClick={() => setStep('list')} className="text-muted-foreground hover:text-white h-10 w-10 bg-white/5 rounded-full">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <DialogTitle className="font-headline text-3xl text-white">Select Bet Amount</DialogTitle>
                            <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-1">
                                {currentPrediction?.questionText}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-3">
                    {betOptions.map((opt) => (
                    <Button
                        key={opt.amount}
                        type="button"
                        variant={amount === opt.amount ? "default" : "secondary"}
                        onClick={() => setAmount(opt.amount)}
                        className={cn(
                            "h-16 font-headline font-black text-2xl rounded-[1.25rem] border-none transition-all duration-300",
                            amount === opt.amount 
                                ? "bg-primary text-primary-foreground shadow-[0_0_30px_rgba(250,204,82,0.4)] scale-105" 
                                : "bg-white/5 text-muted-foreground hover:bg-white/10"
                        )}
                    >
                        INR {opt.amount}
                    </Button>
                    ))}
                </div>

                <div className="bg-white/5 border border-primary/20 rounded-[2rem] p-8 text-center shadow-2xl backdrop-blur-sm">
                    <p className="text-[10px] uppercase font-black text-primary/60 tracking-[0.4em] mb-3">You Can Win</p>
                    <p className="text-6xl font-headline font-black text-primary tracking-tighter">
                        INR {potentialWin.toFixed(2)}
                    </p>
                </div>

                <div className="space-y-4">
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-black text-xl h-16 rounded-2xl shadow-[0_10px_40px_rgba(250,204,82,0.2)] transition-all active:scale-95"
                    >
                        {isSubmitting ? "Placing Bet..." : "Confirm & Place Bet"}
                    </Button>
                    <p className="text-center text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em] opacity-50">
                        Instant Balance Updates • Secure Processing
                    </p>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
