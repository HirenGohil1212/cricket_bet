
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Match, Question, Prediction, Bet } from "@/lib/types";
import { createBet, getUserBets } from "@/app/actions/bet.actions";
import { getQuestionsForMatch } from "@/app/actions/qna.actions";
import { useAuth } from "@/context/auth-context";

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

  const [predictions, setPredictions] = useState<Record<string, { A: string; B: string }>>({});
  const [amount, setAmount] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetState = () => {
    setIsSubmitting(false);
    setQuestions([]);
    setIsLoading(true);
    setPredictions({});
    setAmount(null);
    setErrors({});
  };

  useEffect(() => {
    async function fetchAllData() {
      if (open && match && user) {
        resetState();
        setIsLoading(true);

        const fetchedQuestions = await getQuestionsForMatch(match.id);
        const validQuestions = fetchedQuestions.filter(q => q.options && q.options.length === 2);
        setQuestions(validQuestions);
        
        const userBets = await getUserBets(user.uid);
        const matchBets = userBets.filter(b => b.matchId === match.id);

        const initialPredictions: Record<string, { A: string; B: string }> = {};
        
        // Pre-fill from the latest bet if it exists
        if (matchBets.length > 0) {
            const latestBet = matchBets[0]; // Already sorted by date desc
            latestBet.predictions.forEach(p => {
                initialPredictions[p.questionId] = { A: p.predictionA, B: p.predictionB };
            });
        }
        
        // Ensure all current valid questions have an entry in the predictions state
        validQuestions.forEach(q => {
            if (!initialPredictions[q.id]) {
                initialPredictions[q.id] = { A: '', B: '' };
            }
        });
        
        setPredictions(initialPredictions);
        setIsLoading(false);
      }
    }
    fetchAllData();
  }, [match, open, user]);

  const handlePredictionChange = (questionId: string, side: 'A' | 'B', value: string) => {
    setPredictions(prev => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { A: '', B: '' }),
        [side]: value,
      }
    }));
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (questions.length > 0) {
      for (const q of questions) {
        const p = predictions[q.id];
        if (!p || !p.A || p.A.trim() === '' || !p.B || p.B.trim() === '') {
          newErrors.predictions = 'Please provide predictions for all questions.';
          break;
        }
      }
    }
    if (!amount) {
      newErrors.amount = "Please select a bet amount.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !match || !validateForm()) {
      return;
    }
    
    const predictionsPayload: Prediction[] = questions.map(q => ({
        questionId: q.id,
        questionText: q.question,
        predictionA: predictions[q.id].A,
        predictionB: predictions[q.id].B,
    }));

    setIsSubmitting(true);
    const result = await createBet({
      userId: user.uid,
      matchId: match.id,
      predictions: predictionsPayload,
      amount: Number(amount)
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

  const potentialWin = amount ? Number(amount) * 2 : 0;
  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Place Your Bet on {match.teamA.name} vs {match.teamB.name}</DialogTitle>
          <DialogDescription>
            Answer all the questions below to place your bet. Your previous answers are pre-filled.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="font-headline text-lg">Available Questions</Label>
              <ScrollArea className="h-64 pr-4 mt-3">
                <div className="space-y-4">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)
                  ) : questions.length > 0 ? (
                    questions.map((q) => (
                      <div key={q.id} className="p-4 border rounded-lg">
                        <p className="text-center text-sm font-medium text-muted-foreground mb-4">{q.question}</p>
                        <div className="flex justify-between items-start text-center gap-4">
                            <div className="flex-1 flex flex-col items-center gap-2">
                                <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={40} height={40} className="rounded-full" data-ai-hint="logo" />
                                <p className="font-semibold text-sm leading-tight">{match.teamA.name}</p>
                                <Input
                                  value={predictions[q.id]?.A || ''}
                                  onChange={(e) => handlePredictionChange(q.id, 'A', e.target.value)}
                                  placeholder={q.options[0].text}
                                  className="text-center"
                                  disabled={isSubmitting}
                                />
                            </div>
                            
                            <div className="flex h-full items-center pt-16">
                                <span className="text-sm font-bold text-muted-foreground">vs</span>
                            </div>
                    
                            <div className="flex-1 flex flex-col items-center gap-2">
                                <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={40} height={40} className="rounded-full" data-ai-hint="logo" />
                                <p className="font-semibold text-sm leading-tight">{match.teamB.name}</p>
                                <Input
                                  value={predictions[q.id]?.B || ''}
                                  onChange={(e) => handlePredictionChange(q.id, 'B', e.target.value)}
                                  placeholder={q.options[1].text}
                                  className="text-center"
                                  disabled={isSubmitting}
                                />
                            </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-12">
                      <p>No questions available for this match yet.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              {errors.predictions && <p className="text-sm font-medium text-destructive mt-2">{errors.predictions}</p>}
            </div>

            <div className="space-y-3 pt-4">
              <Label className="font-headline text-lg">Select Bet Amount</Label>
              <RadioGroup
                onValueChange={(value) => setAmount(value)}
                defaultValue={amount || undefined}
                className="grid grid-cols-3 gap-4"
              >
                {['9', '19', '29'].map((val) => (
                  <Label key={val} htmlFor={`amount-${val}`} className="flex h-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                    <RadioGroupItem value={val} id={`amount-${val}`} className="sr-only peer" />
                    <span className="font-bold text-lg">INR {val}</span>
                  </Label>
                ))}
              </RadioGroup>
              {errors.amount && <p className="text-sm font-medium text-destructive">{errors.amount}</p>}
            </div>

            <div className="p-4 bg-accent/10 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Potential Win</p>
              <p className="text-2xl font-bold font-headline text-primary">INR {potentialWin.toFixed(2)}</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold" disabled={isSubmitting || isLoading}>
                {isSubmitting ? "Placing Bet..." : "Place Bet"}
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
