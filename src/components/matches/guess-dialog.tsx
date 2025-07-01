"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
import { useToast } from "@/hooks/use-toast";
import type { Match } from "@/lib/types";
import Image from "next/image";

const guessFormSchema = z.object({
  team: z.string({
    required_error: "You need to select a team.",
  }),
  amount: z.enum(['9', '19', '29'], {
    required_error: "You need to select a bet amount.",
  }),
});

type GuessFormValues = z.infer<typeof guessFormSchema>;

interface GuessDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuessDialog({ match, open, onOpenChange }: GuessDialogProps) {
  const { toast } = useToast();

  const form = useForm<GuessFormValues>({
    resolver: zodResolver(guessFormSchema),
  });

  const betAmount = form.watch('amount');
  const potentialWin = betAmount ? Number(betAmount) * 2 : 0;

  function onSubmit(data: GuessFormValues) {
    toast({
      title: "Bet Placed!",
      description: `You bet ₹${data.amount} on ${data.team} to win. Good luck!`,
    });
    onOpenChange(false);
    form.reset();
  }

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Place Your Bet</DialogTitle>
          <DialogDescription>
            Predict the winner for {match.teamA.name} vs {match.teamB.name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="team"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="font-headline">Who will win?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value={match.teamA.name} />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center gap-2">
                          <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={24} height={24} className="rounded-full" data-ai-hint="logo" />
                          {match.teamA.name}
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value={match.teamB.name} />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center gap-2">
                           <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={24} height={24} className="rounded-full" data-ai-hint="logo" />
                          {match.teamB.name}
                        </FormLabel>
                      </FormItem>
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
                <FormItem className="space-y-3">
                  <FormLabel className="font-headline">Select Bet Amount</FormLabel>
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
                              <span className="font-bold text-lg">₹{amount}</span>
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
              <p className="text-2xl font-bold font-headline text-primary">₹{potentialWin.toFixed(2)}</p>
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                Place Bet
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
