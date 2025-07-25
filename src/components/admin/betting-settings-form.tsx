
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2 } from "lucide-react";

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
import { Card, CardContent } from "../ui/card";

interface BettingSettingsFormProps {
    initialData: BettingSettings;
}

const defaultOption = { amount: 10, payout: 20 };

export function BettingSettingsForm({ initialData }: BettingSettingsFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<BettingSettingsFormValues>({
    resolver: zodResolver(bettingSettingsSchema),
    defaultValues: {
      betOptions: initialData.betOptions.length > 0 ? initialData.betOptions : [defaultOption],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "betOptions",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
        <div>
          {fields.map((field, index) => (
             <Card key={field.id} className="relative mb-4 p-4">
               <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name={`betOptions.${index}.amount`}
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Bet Amount (INR)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g. 9" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name={`betOptions.${index}.payout`}
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Payout Amount (INR)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g. 20" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
               </CardContent>
                {fields.length > 1 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                        disabled={isSubmitting}
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove Option</span>
                    </Button>
                )}
             </Card>
          ))}
           <FormDescription>
            Define the fixed bet amounts available to users and the corresponding payout if they win.
          </FormDescription>
        </div>
        
        <div className="flex items-center justify-between">
            <Button
                type="button"
                variant="outline"
                onClick={() => append(defaultOption)}
                disabled={fields.length >= 5 || isSubmitting}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Bet Option
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
        </div>
      </form>
    </Form>
  )
}
