
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, FormProvider, useFormContext } from "react-hook-form";
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
import type { BettingSettings, Sport } from "@/lib/types";
import { sports } from "@/lib/data";
import { bettingSettingsSchema, type BettingSettingsFormValues } from "@/lib/schemas";
import { updateBettingSettings } from "@/app/actions/settings.actions";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { SportIcon } from "../icons";

interface BettingSettingsFormProps {
    initialData: BettingSettings;
}

const defaultOption = { amount: 10, payout: 20 };

function SportBettingForm({ sport }: { sport: Sport }) {
    const { control, formState: { isSubmitting } } = useFormContext<BettingSettingsFormValues>();
    
    const { fields, append, remove } = useFieldArray({
        control,
        name: `betOptions.${sport}`,
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <SportIcon sport={sport} className="w-5 h-5" />
                    {sport} Settings
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="relative p-4 border rounded-md">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={control}
                                    name={`betOptions.${sport}.${index}.amount`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bet Amount (INR)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g. 9" {...field} onChange={e => field.onChange(Number(e.target.value))}/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`betOptions.${sport}.${index}.payout`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Payout Amount (INR)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g. 20" {...field} onChange={e => field.onChange(Number(e.target.value))}/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
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
                        </div>
                    ))}
                </div>
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => append(defaultOption)}
                    disabled={fields.length >= 5 || isSubmitting}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Option
                </Button>
            </CardContent>
        </Card>
    );
}

export function BettingSettingsForm({ initialData }: BettingSettingsFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<BettingSettingsFormValues>({
    resolver: zodResolver(bettingSettingsSchema),
    defaultValues: {
        betOptions: initialData.betOptions
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: BettingSettingsFormValues) {
    const result = await updateBettingSettings(data);
    
    if (result.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
        toast({ title: "Settings Saved", description: result.success });
        router.refresh();
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormDescription>
          Define the fixed bet amounts available to users and the corresponding payout if they win for each sport.
        </FormDescription>

        <div className="space-y-6">
            {sports.map((sport) => (
                <SportBettingForm key={sport} sport={sport} />
            ))}
        </div>
        
        <div className="flex items-center justify-end">
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save All Settings"}
            </Button>
        </div>
      </form>
    </FormProvider>
  )
}
