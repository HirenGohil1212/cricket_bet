
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
import { ArrowLeft, ChevronRight, X } from "lucide-react";

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

  const handleInitiateQnaBet = (qId: string) => {
    const inputs = qnaInputs[qId];
    const question = questions.find(q => q.id === qId);
    
    if (!inputs.teamA.trim() && !inputs.teamB.trim()) {
        toast({ variant: "destructive", title: "Missing Prediction", description: "Please enter a value for at least one team." });
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
    const teamSide = match.teamA.players?.some(p => p.name === playerName) ? 'teamA' : 'teamB';

    if (!value.trim()) {
        toast({ variant: "destructive", title: "Missing Prediction", description: "Please enter your prediction for this player." });
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
                    <DialogTitle className="font-headline text-4xl text-white mb-2">Play Your Game</DialogTitle>
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

                <ScrollArea className="h-[65vh] pr-4">
                    <div className="space-y-8 pb-8">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full bg-[#1a2b24] rounded-2xl" />)
                        ) : (
                            <>
                                {/* Match Questions */}
                                <div className="space-y-6">
                                    {questions.map((q) => (
                                        <div key={q.id} className="space-y-3 group">
                                            <div className="text-center">
                                                <span className="text-[11px] font-black text-muted-foreground/80 uppercase tracking-tighter">
                                                    {q.question}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    placeholder={match.teamA.name}
                                                    className="flex-1 bg-transparent border-primary/20 focus-visible:border-primary/60 focus-visible:ring-0 rounded-full text-center h-12 text-xs placeholder:text-muted-foreground/20"
                                                    value={qnaInputs[q.id]?.teamA ?? ''}
                                                    onChange={(e) => handleQnaInputChange(q.id, 'teamA', e.target.value)}
                                                />
                                                <div className="text-primary font-bold text-xs px-1">VS</div>
                                                <Input
                                                    placeholder={match.teamB.name}
                                                    className="flex-1 bg-transparent border-primary/20 focus-visible:border-primary/60 focus-visible:ring-0 rounded-full text-center h-12 text-xs placeholder:text-muted-foreground/20"
                                                    value={qnaInputs[q.id]?.teamB ?? ''}
                                                    onChange={(e) => handleQnaInputChange(q.id, 'teamB', e.target.value)}
                                                />
                                                <Button 
                                                    size="sm"
                                                    onClick={() => handleInitiateQnaBet(q.id)}
                                                    className="bg-primary hover:bg-primary/80 text-primary-foreground font-black text-[10px] h-12 px-4 rounded-full uppercase shadow-lg transition-all active:scale-95"
                                                >
                                                    Play Now
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Player Performance Section */}
                                {match.isSpecialMatch && (
                                    <div className="space-y-6 pt-4">
                                        <h4 className="text-center text-xs font-black text-primary tracking-[0.25em] uppercase">Player Performance</h4>
                                        {[...(match.teamA.players || []), ...(match.teamB.players || [])].filter(p => p.bettingEnabled).map((player) => (
                                            <div key={player.name} className="space-y-4 p-5 bg-white/5 rounded-3xl border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                                                        <AvatarImage src={player.imageUrl} className="object-cover" />
                                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{player.name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-base font-black text-white font-headline tracking-wide">{player.name}</span>
                                                </div>
                                                <div className="space-y-3">
                                                    {questions.map(q => (
                                                        <div key={`${player.name}-${q.id}`} className="flex items-center gap-3">
                                                            <div className="flex-1 text-[11px] text-muted-foreground font-black uppercase tracking-tight">{q.question}</div>
                                                            <Input
                                                                placeholder="Your prediction..."
                                                                className="w-32 bg-[#0a140f] border-primary/20 focus-visible:border-primary/60 focus-visible:ring-0 rounded-xl h-10 text-xs text-center"
                                                                value={playerInputs[player.name]?.[q.id] || ''}
                                                                onChange={(e) => handlePlayerInputChange(player.name, q.id, e.target.value)}
                                                            />
                                                            <Button 
                                                                size="sm"
                                                                onClick={() => handleInitiatePlayerBet(player.name, q.id)}
                                                                className="bg-primary hover:bg-primary/80 text-primary-foreground font-black text-[9px] h-10 px-3 rounded-xl uppercase shadow-md"
                                                            >
                                                                Play
                                                            </Button>
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
                        <Button variant="ghost" className="w-full text-muted-foreground hover:text-white font-bold h-12 rounded-2xl">
                            Close Game
                        </Button>
                    </DialogClose>
                </div>
            </div>
        ) : (
            <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <DialogHeader>
                    <div className="flex items-center gap-4 mb-4">
                        <Button variant="ghost" size="icon" onClick={() => setStep('list')} className="text-muted-foreground hover:text-white">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <DialogTitle className="font-headline text-3xl text-white">Select Bet Amount</DialogTitle>
                            <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">
                                Betting on: {currentPrediction?.questionText}
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
                            "h-20 font-headline font-black text-3xl rounded-3xl border-none transition-all",
                            amount === opt.amount 
                                ? "bg-primary text-primary-foreground shadow-[0_0_30px_rgba(250,204,82,0.4)] scale-105" 
                                : "bg-[#1a2b24] text-muted-foreground hover:bg-[#253d33]"
                        )}
                    >
                        INR {opt.amount}
                    </Button>
                    ))}
                </div>

                <div className="bg-[#14221b] border border-primary/20 rounded-[2.5rem] p-10 text-center shadow-inner">
                    <p className="text-xs uppercase font-black text-primary/60 tracking-[0.4em] mb-4">You Can Win</p>
                    <p className="text-6xl font-headline font-black text-primary drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                        INR {potentialWin.toFixed(2)}
                    </p>
                </div>

                <div className="space-y-4">
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-black text-xl h-16 rounded-2xl shadow-[0_12px_40px_rgba(250,204,82,0.35)]"
                    >
                        {isSubmitting ? "Placing Bet..." : "Confirm & Place Bet"}
                    </Button>
                    <p className="text-center text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">
                        Your balance will be updated instantly!
                    </p>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
