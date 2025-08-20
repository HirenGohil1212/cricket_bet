

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Match, Question, Prediction, BetOption } from "@/lib/types";
import { createBet } from "@/app/actions/bet.actions";
import { getQuestionsForMatch } from "@/app/actions/qna.actions";
import { useAuth } from "@/context/auth-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import { FormControl, FormField, FormItem, FormMessage, FormLabel } from "../ui/form";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


interface GuessDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  betOptions: BetOption[];
}

// This component is no longer used by the user-facing app, but we are keeping it
// to avoid breaking changes in the admin panel if it's referenced there.
// The primary betting logic is now in `src/components/matches/guess-dialog.tsx`.

export function GuessDialog({ match, open, onOpenChange, betOptions }: GuessDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [betOnSide, setBetOnSide] = React.useState<'teamA' | 'teamB' | 'both'>('both');
  const [bettingMode, setBettingMode] = useState<'qna' | 'player'>('qna');

  const validBetAmounts = React.useMemo(() => betOptions.map(opt => opt.amount), [betOptions]);
  
  const form = useForm<any>(); // Simplified for admin/deprecated component
  
  useEffect(() => {
    async function fetchQuestionsAndSetDefaults() {
      if (match) {
        setIsLoading(true);
        setQuestions([]);
        const fetchedQuestions = await getQuestionsForMatch(match.id);
        setQuestions(fetchedQuestions.filter(q => q.status === 'active'));
        setIsLoading(false);
      }
    }

    if (open) {
      fetchQuestionsAndSetDefaults();
    }
  }, [match, open]);

  if (!match) return null;

  return (
     <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin Guess Dialog (Deprecated)</DialogTitle>
          <DialogDescription>
            This component is no longer in active use for user-facing betting. The primary logic has moved to `src/components/matches/guess-dialog.tsx`.
          </DialogDescription>
        </DialogHeader>
        <div className="py-8 text-center text-muted-foreground">
            <p>This dialog is deprecated.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
