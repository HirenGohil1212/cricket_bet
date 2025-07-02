
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
import type { Match, Question } from "@/lib/types";
import { createBet } from "@/app/actions/bet.actions";
import { getQuestionsForMatch } from "@/app/actions/qna.actions";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

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

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, { A: string; B: string }>>({});
  const [amount, setAmount] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetState = () => {
    setIsSubmitting(false);
    setQuestions([]);
    setIsLoading(true);
    setSelectedQuestionId(null);
    setPredictions({});
    setAmount(null);
    setErrors({});
  };

  useEffect(() => {
    async function fetchQuestions() {
      if (open && match) {
        resetState();
        const fetchedQuestions = await getQuestionsForMatch(match.id);
        const validQuestions = fetchedQuestions.filter(q => q.options && q.options.length === 2);
        setQuestions(validQuestions);
        
        // Initialize predictions state
        const initialPredictions: Record<string, { A: string; B: string }> = {};
        validQuestions.forEach(q => {
          initialPredictions[q.id] = { A: '', B: '' };
        });
        setPredictions(initialPredictions);

        setIsLoading(false);
      }
    }
    fetchQuestions();
  }, [match, open]);

  const handlePredictionChange = (questionId: string, side: 'A' | 'B', value: string) => {
    // When user starts typing, select the question
    if (selectedQuestionId !== questionId) {
      setSelectedQuestionId(questionId);
    }
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
    if (!selectedQuestionId) {
      newErrors.question = "Please select a question to bet on by typing in its fields.";
    } else {
      const predA = predictions[selectedQuestionId]?.A;
      const predB = predictions[selectedQuestionId]?.B;
      if (!predA || !predB || predA.trim() === '' || predB.trim() === '') {
        newErrors.prediction = "Please provide a prediction for both sides of the selected question.";
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
    
    const question = questions.find(q => q.id === selectedQuestionId);
    if (!question) return;

    setIsSubmitting(true);
    const result = await createBet({
      userId: user.uid,
      matchId: match.id,
      questionId: question.id,
      questionText: question.question,
      predictionA: predictions[selectedQuestionId].A,
      predictionB: predictions[selectedQuestionId].B,
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
            Select a question and type your prediction in the boxes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="font-headline text-lg">Available Questions</Label>
              <ScrollArea className="h-64 pr-4 mt-3">
                <div className="space-y-4">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                  ) : questions.length > 0 ? (
                    questions.map((q) => (
                      <div 
                        key={q.id} 
                        className={cn(
                          "grid grid-cols-5 items-center gap-4 p-3 border rounded-lg transition-all cursor-pointer",
                          selectedQuestionId === q.id ? "border-primary ring-2 ring-primary" : "border-border",
                          selectedQuestionId && selectedQuestionId !== q.id ? "opacity-50" : ""
                        )}
                        onClick={() => setSelectedQuestionId(q.id)}
                      >
                        <Input
                          value={predictions[q.id]?.A || ''}
                          onChange={(e) => handlePredictionChange(q.id, 'A', e.target.value)}
                          placeholder={q.options[0].text}
                          className="text-right"
                          disabled={isSubmitting}
                        />
                        <p className="col-span-3 text-center text-sm font-medium text-muted-foreground">{q.question}</p>
                        <Input
                          value={predictions[q.id]?.B || ''}
                          onChange={(e) => handlePredictionChange(q.id, 'B', e.target.value)}
                          placeholder={q.options[1].text}
                          disabled={isSubmitting}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-12">
                      <p>No questions available for this match yet.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              {errors.question && <p className="text-sm font-medium text-destructive mt-2">{errors.question}</p>}
              {errors.prediction && <p className="text-sm font-medium text-destructive mt-2">{errors.prediction}</p>}
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
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold" disabled={isSubmitting}>
                {isSubmitting ? "Placing Bet..." : "Place Bet"}
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
