
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
import type { Match, Question, Prediction, BettingSettings } from "@/lib/types";
import { createBet } from "@/app/actions/bet.actions";
import { getQuestionsForMatch } from "@/app/actions/qna.actions";
import { getBettingSettings } from "@/app/actions/settings.actions";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";
import { Label } from "@/components/ui/label";

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
  const [currentSettings, setCurrentSettings] = useState<BettingSettings | null>(null);
  
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
        
        // Fetch both questions and the LATEST global settings
        const [fetchedQuestions, latestSettings] = await Promise.all([
            getQuestionsForMatch(match.id),
            getBettingSettings()
        ]);

        const validQuestions = fetchedQuestions.filter(q => q.status === 'active');
        setQuestions(validQuestions);
        setCurrentSettings(latestSettings);

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
    // Prefer current settings if available, fallback to match snapshot
    const settingsSource = currentSettings || match?.bettingSettings;
    if (!settingsSource || !match) return null;

    const sportSettings = (settingsSource.betOptions as any)[match.sport];
    if (!sportSettings || sportSettings.mode === 'dynamic') return null;

    if (match.sport === 'Cricket') {
        if (currentBetType === 'player') return sportSettings.player;
        const isOneSided = currentPrediction?.predictedAnswer && 
            (!currentPrediction.predictedAnswer.teamA || !currentPrediction.predictedAnswer.teamB);
        if (match.allowOneSidedBets && isOneSided) return sportSettings.oneSided;
        return sportSettings.general;
    }
    return sportSettings.options;
  }, [match, currentSettings, currentPrediction, currentBetType]);

  const multiplier = React.useMemo(() => {
    const settingsSource = currentSettings || match?.bettingSettings;
    if (!settingsSource || !match) return 1;

    const sportSettings = (settingsSource.betOptions as any)[match.sport];
    if (!sportSettings || sportSettings.mode !== 'dynamic') return 1;

    return currentBetType === 'player' 
        ? (sportSettings.multipliers?.player || 2) 
        : (sportSettings.multipliers?.qna || 2);
  }, [match, currentSettings, currentBetType]);

  useEffect(() => {
    if (betOptions && betOptions.length > 0) {
      setAmount(betOptions[0].amount);
    } else {
      setAmount(10); // Default starting amount for dynamic
    }
  }, [betOptions]);

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
        toast({ variant: "destructive", title: "Missing Prediction", description: "Enter a value for at least one team." });
        return;
    }

    if (inputs.teamA.trim() && !match?.teamABettingEnabled) {
        toast({ variant: "destructive", title: "Suspended", description: `Betting for ${match?.teamA.name} is suspended.` });
        return;
    }
    if (inputs.teamB.trim() && !match?.teamBBettingEnabled) {
        toast({ variant: "destructive", title: "Suspended", description: `Betting for ${match?.teamB.name} is suspended.` });
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
    
    const teamAUser = match?.teamA.players?.find(p => p.name === playerName);
    const teamSide = teamAUser ? 'teamA' : 'teamB';
    const player = teamAUser || match?.teamB.players?.find(p => p.name === playerName);

    if (!value.trim()) {
        toast({ variant: "destructive", title: "Missing Prediction", description: "Enter your prediction." });
        return;
    }

    if (player && !player.bettingEnabled) {
        toast({ variant: "destructive", title: "Suspended", description: `Betting for ${playerName} is suspended.` });
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
    if (amount <= 0) {
        toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid bet amount." });
        return;
    }

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
      onOpenChange(false);
    }
    setIsSubmitting(false);
  }

  const potentialWin = betOptions 
    ? (betOptions.find(opt => opt.amount === amount)?.payout || 0)
    : (amount * multiplier);

  const playersWithTeamInfo = [
      ...(match?.teamA.players || []).map(p => ({ ...p, teamLogo: match?.teamA.logoUrl, teamName: match?.teamA.name })),
      ...(match?.teamB.players || []).map(p => ({ ...p, teamLogo: match?.teamB.logoUrl, teamName: match?.teamB.name })),
  ];

  if (!match) return null;

  const teamQuestions = questions.filter(q => q.type === 'qna' || !q.type);
  const playerQuestions = questions.filter(q => q.type === 'player');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}>
      <DialogContent className="sm:max-w-lg bg-[#0a140f] border-none text-foreground p-0 overflow-hidden">
        
        {step === 'list' ? (
            <div className="p-6 space-y-6">
                <DialogHeader className="flex flex-col items-center">
                    <DialogTitle className="font-headline text-3xl text-white mb-1 uppercase tracking-tighter">Play Your Game</DialogTitle>
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
                                <div className="space-y-6">
                                    {teamQuestions.map((q) => {
                                        const isRowSuspended = !match.teamABettingEnabled && !match.teamBBettingEnabled;
                                        return (
                                            <div key={q.id} className="space-y-3">
                                                <div className="text-center">
                                                    <span className="text-lg font-black text-primary uppercase tracking-widest leading-none">
                                                        {q.question}
                                                    </span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <Input
                                                            placeholder={isRowSuspended || !match.teamABettingEnabled ? "---" : match.teamA.name}
                                                            className="bg-[#14221b] border-primary/20 focus-visible:border-primary/60 focus-visible:ring-0 rounded-xl text-center h-12 text-sm placeholder:text-muted-foreground/30 font-bold disabled:opacity-30"
                                                            value={qnaInputs[q.id]?.teamA ?? ''}
                                                            onChange={(e) => handleQnaInputChange(q.id, 'teamA', e.target.value)}
                                                            disabled={isRowSuspended || !match.teamABettingEnabled}
                                                        />
                                                        {(isRowSuspended || !match.teamABettingEnabled) && (
                                                            <span className="text-[8px] text-destructive font-black uppercase text-center tracking-widest">Suspended</span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="text-primary font-black text-xs pt-4 px-1">VS</div>
                                                    
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <Input
                                                            placeholder={isRowSuspended || !match.teamBBettingEnabled ? "---" : match.teamB.name}
                                                            className="bg-[#14221b] border-primary/20 focus-visible:border-primary/60 focus-visible:ring-0 rounded-xl text-center h-12 text-sm placeholder:text-muted-foreground/30 font-bold disabled:opacity-30"
                                                            value={qnaInputs[q.id]?.teamB ?? ''}
                                                            onChange={(e) => handleQnaInputChange(q.id, 'teamB', e.target.value)}
                                                            disabled={isRowSuspended || !match.teamBBettingEnabled}
                                                        />
                                                        {(isRowSuspended || !match.teamBBettingEnabled) && (
                                                            <span className="text-[8px] text-destructive font-black uppercase text-center tracking-widest">Suspended</span>
                                                        )}
                                                    </div>

                                                    <div className="pt-0">
                                                        {isRowSuspended ? (
                                                            <div className="flex items-center justify-center border-2 border-destructive/50 bg-destructive/10 rounded-xl h-12 px-3 min-w-[85px]">
                                                                <span className="text-destructive font-black text-[10px] uppercase tracking-tighter">SUSPENDED</span>
                                                            </div>
                                                        ) : (
                                                            <Button 
                                                                size="sm"
                                                                onClick={() => handleInitiateQnaBet(q.id)}
                                                                className="bg-primary hover:bg-primary/80 text-primary-foreground font-black text-[12px] h-12 px-4 rounded-xl uppercase shadow-xl transition-all active:scale-95 min-w-[85px]"
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

                                {(match.isSpecialMatch && playerQuestions.length > 0) && (
                                    <div className="space-y-6 pt-4">
                                        <h4 className="text-center text-[10px] font-black text-primary tracking-[0.3em] uppercase opacity-50">Player Performance</h4>
                                        {playersWithTeamInfo.map((player) => (
                                            <div key={player.name} className="space-y-4 p-5 bg-white/[0.03] rounded-[1.5rem] border border-white/5 shadow-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <Avatar className="h-10 w-10 border-2 border-primary/30">
                                                            <AvatarImage src={player.imageUrl} className="object-cover" />
                                                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-black">{player.name[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0a140f] overflow-hidden bg-white">
                                                            <Image src={player.teamLogo} alt="" width={20} height={20} className="object-cover w-full h-full" />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xl font-black text-white font-headline tracking-wide leading-tight uppercase">{player.name}</span>
                                                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{player.teamName}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    {playerQuestions.map(q => (
                                                        <div key={`${player.name}-${q.id}`} className="flex items-center gap-3">
                                                            <div className="flex-1 text-base font-black text-primary uppercase tracking-wider leading-tight">{q.question}</div>
                                                            <div className="flex flex-col gap-0.5 items-center">
                                                                <Input
                                                                    placeholder={!player.bettingEnabled ? "---" : "..."}
                                                                    className="w-20 bg-[#0a140f] border-primary/20 focus-visible:border-primary/60 focus-visible:ring-0 rounded-lg h-10 text-xs text-center font-bold disabled:opacity-30 placeholder:text-muted-foreground/20"
                                                                    value={playerInputs[player.name]?.[q.id] || ''}
                                                                    onChange={(e) => handlePlayerInputChange(player.name, q.id, e.target.value)}
                                                                    disabled={!player.bettingEnabled}
                                                                />
                                                                {!player.bettingEnabled && (
                                                                    <span className="text-[8px] text-destructive font-black uppercase tracking-widest">Suspended</span>
                                                                )}
                                                            </div>
                                                            {!player.bettingEnabled ? (
                                                                <div className="w-16 flex items-center justify-center border border-destructive/50 bg-destructive/10 rounded-lg h-10">
                                                                    <span className="text-destructive font-black text-[9px] uppercase tracking-tighter">OFF</span>
                                                                </div>
                                                            ) : (
                                                                <Button 
                                                                    size="sm"
                                                                    onClick={() => handleInitiatePlayerBet(player.name, q.id)}
                                                                    className="bg-primary hover:bg-primary/80 text-primary-foreground font-black text-[12px] h-10 px-4 rounded-lg uppercase shadow-lg"
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
                        <Button variant="ghost" className="w-full text-muted-foreground hover:text-white font-black h-12 rounded-xl text-xs uppercase tracking-widest">
                            Exit Lobby
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
                            <DialogTitle className="font-headline text-3xl text-white uppercase italic">Finalize Bet</DialogTitle>
                            <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-1">
                                {currentPrediction?.questionText}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                {betOptions ? (
                    <div className="grid grid-cols-2 gap-3">
                        {betOptions.map((opt) => (
                        <Button
                            key={opt.amount}
                            type="button"
                            variant={amount === opt.amount ? "default" : "secondary"}
                            onClick={() => setAmount(opt.amount)}
                            className={cn(
                                "h-14 font-headline font-black text-xl rounded-xl border-none transition-all duration-300",
                                amount === opt.amount 
                                    ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(250,204,82,0.3)] scale-105" 
                                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                            )}
                        >
                            INR {opt.amount}
                        </Button>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Label className="text-primary font-black uppercase tracking-widest text-[10px]">Enter Bet Amount</Label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">INR</span>
                            <Input
                                type="number"
                                min="1"
                                className="h-16 bg-white/5 border-primary/30 rounded-2xl text-3xl font-black text-center pl-14 focus-visible:ring-primary focus-visible:border-primary"
                                value={amount || ''}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                placeholder="0.00"
                            />
                        </div>
                        <p className="text-center text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Multiplier: <span className="text-primary">{multiplier}x</span></p>
                    </div>
                )}

                <div className="bg-white/5 border border-primary/20 rounded-[1.5rem] p-6 text-center shadow-2xl backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"/>
                    <p className="text-[9px] uppercase font-black text-primary/60 tracking-[0.4em] mb-2 relative z-10">Potential Return</p>
                    <p className="text-5xl font-headline font-black text-primary tracking-tighter relative z-10">
                        INR {potentialWin.toFixed(2)}
                    </p>
                </div>

                <div className="space-y-4">
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || amount <= 0}
                        className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-black text-lg h-14 rounded-xl shadow-[0_10px_30px_rgba(250,204,82,0.15)] transition-all active:scale-95 uppercase tracking-tight"
                    >
                        {isSubmitting ? "Processing..." : "Place Bet Now"}
                    </Button>
                    <div className="flex items-center justify-center gap-4 opacity-40">
                         <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-muted-foreground"/>
                         <p className="text-[8px] text-muted-foreground uppercase font-black tracking-[0.2em] whitespace-nowrap">Secure Gateway</p>
                         <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-muted-foreground"/>
                    </div>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
