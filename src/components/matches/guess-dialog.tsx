
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Match, Question } from "@/lib/types";
import { betSchema, type BetFormValues } from "@/lib/schemas";
import { createBet } from "@/app/actions/bet.actions";
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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<BetFormValues>({
    resolver: zodResolver(betSchema),
    defaultValues: {
      matchId: match?.id,
    }
  });

  useEffect(() => {
    async function fetchQuestions() {
      if (open && match) {
        setIsLoading(true);
        form.reset({
          matchId: match.id,
          prediction: undefined,
          amount: undefined,
        });
        const fetchedQuestions = await getQuestionsForMatch(match.id);
        // Filter out questions that don't have exactly 2 options, as they can't be bet on.
        const validQuestions = fetchedQuestions.filter(q => q.options && q.options.length === 2);
        setQuestions(validQuestions);
        setIsLoading(false);
      }
    }
    fetchQuestions();
  }, [match, open, form]);

  const betAmount = form.watch('amount');
  const potentialWin = betAmount ? Number(betAmount) * 2 : 0;

  async function onSubmit(data: BetFormValues) {
    if (!user) {
        toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in to place a bet." });
        return;
    }
    if (!match) return;

    const [questionId, prediction] = data.prediction.split('|');
    const question = questions.find(q => q.id === questionId);

    if (!question) {
        toast({ variant: "destructive", title: "Error", description: "Selected question not found." });
        return;
    }
    
    setIsSubmitting(true);
    const result = await createBet({
        userId: user.uid,
        matchId: match.id,
        questionId: question.id,
        questionText: question.question,
        prediction: prediction,
        amount: Number(data.amount)
    });

    if (result.error) {
        toast({ variant: "destructive", title: "Bet Failed", description: result.error });
    } else {
        toast({ title: "Bet Placed!", description: `Your bet on "${prediction}" has been placed. Good luck!` });
        router.refresh();
        onOpenChange(false);
    }
    setIsSubmitting(false);
  }

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Place Your Bet on {match.teamA.name} vs {match.teamB.name}</DialogTitle>
          <DialogDescription>
            Select an answer for one of the questions below and place your bet.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="prediction"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="font-headline text-lg">Available Questions</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col"
                    >
                      <ScrollArea className="h-64 pr-4">
                        <div className="space-y-4">
                          {isLoading ? (
                            Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                          ) : questions.length > 0 ? (
                            questions.map((q) => (
                              <div key={q.id} className="grid grid-cols-5 items-center gap-4 p-3 border rounded-lg">
                                <FormItem className="col-span-2 flex items-center space-x-3 space-y-0 justify-end text-right">
                                  <FormLabel className="font-normal flex-1 cursor-pointer">{q.options[0].text}</FormLabel>
                                  <FormControl>
                                    <RadioGroupItem value={`${q.id}|${q.options[0].text}`} />
                                  </FormControl>
                                </FormItem>
                                
                                <p className="col-span-1 text-center text-sm font-medium text-muted-foreground">{q.question}</p>
                                
                                <FormItem className="col-span-2 flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value={`${q.id}|${q.options[1].text}`} />
                                  </FormControl>
                                  <FormLabel className="font-normal flex-1 cursor-pointer">{q.options[1].text}</FormLabel>
                                </FormItem>
                              </div>
                            ))
                          ) : (
                             <div className="text-center text-muted-foreground py-12">
                                <p>No questions available for this match yet.</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="space-y-3 pt-4">
                  <FormLabel className="font-headline text-lg">Select Bet Amount</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-3 gap-4"
                    >
                      {['9', '19', '29'].map((amount) => (
                        <FormItem key={amount} className="flex-1">
                          <FormControl>
                             <RadioGroupItem value={amount} id={`amount-${amount}`} className="sr-only peer" />
                          </FormControl>
                           <FormLabel htmlFor={`amount-${amount}`} className="flex h-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                              <span className="font-bold text-lg">INR {amount}</span>
                           </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
