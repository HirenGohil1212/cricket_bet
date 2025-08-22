
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { ReferralSettings } from "@/lib/types";
import { referralSettingsSchema, type ReferralSettingsFormValues } from "@/lib/schemas";
import { updateReferralSettings } from "@/app/actions/referral.actions";

interface ReferralSettingsFormProps {
    initialData: ReferralSettings;
}

export function ReferralSettingsForm({ initialData }: ReferralSettingsFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ReferralSettingsFormValues>({
    resolver: zodResolver(referralSettingsSchema),
    defaultValues: {
      isEnabled: initialData.isEnabled || false,
      referrerBonus: initialData.referrerBonus || 100,
      referredUserBonus: initialData.referredUserBonus || 50,
      minBetAmountForBonus: initialData.minBetAmountForBonus || 150,
    }
  });

  async function onSubmit(data: ReferralSettingsFormValues) {
    setIsSubmitting(true);
    const result = await updateReferralSettings(data);
    
    if (result.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
        toast({ title: "Settings Saved", description: result.success });
        form.reset(data); // Reset the form with the new values
        router.refresh();
    }
    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
        <FormField
          control={form.control}
          name="isEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Referral Program</FormLabel>
                <FormDescription>
                  Turn this on to allow users to earn bonuses by referring others.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="referrerBonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referrer Bonus (INR)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 100" {...field} />
                  </FormControl>
                  <FormDescription>
                    Amount the existing user receives for a successful referral.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="referredUserBonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New User Bonus (INR)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 50" {...field} />
                  </FormControl>
                  <FormDescription>
                    Bonus amount for the new user who signs up with a code.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="minBetAmountForBonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Bet for Referrer Bonus (INR)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 150" {...field} />
                  </FormControl>
                  <FormDescription>
                    The total amount a new user must bet before the referrer gets their bonus.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </Form>
  )
}
