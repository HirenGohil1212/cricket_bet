
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { BettingSettings } from "@/lib/types";
import { bettingSettingsSchema, type BettingSettingsFormValues } from "@/lib/schemas";
import { updateBettingSettings } from "@/app/actions/settings.actions";

interface BettingSettingsFormProps {
    initialData: BettingSettings;
}

export function BettingSettingsForm({ initialData }: BettingSettingsFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<BettingSettingsFormValues>({
    resolver: zodResolver(bettingSettingsSchema),
    defaultValues: {
      betMultiplier: initialData.betMultiplier || 2,
    }
  });

  async function onSubmit(data: BettingSettingsFormValues) {
    setIsSubmitting(true);
    const result = await updateBettingSettings(data);
    
    if (result.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
        toast({ title: "Settings Saved", description: result.success });
        router.refresh();
    }
    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-sm">
        <FormField
          control={form.control}
          name="betMultiplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bet Multiplier</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" placeholder="e.g. 2.5" {...field} />
              </FormControl>
              <FormDescription>
                The amount a user bets will be multiplied by this number to calculate the potential win. E.g., a value of 2 means 2x return.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </Form>
  )
}
