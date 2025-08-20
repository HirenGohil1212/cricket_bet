
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, FormProvider, useFormContext } from "react-hook-form";
import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, Loader2 } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { SportIcon } from "../icons";
import { Separator } from "../ui/separator";

interface BettingSettingsFormProps {
    initialData: BettingSettings;
}

const defaultOption = { amount: 10, payout: 20 };

function BetOptionFields({ namePrefix }: { namePrefix: string }) {
    const { control } = useFormContext<BettingSettingsFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: namePrefix as any,
    });

    return (
        <div className="space-y-4">
            {fields.map((field, index) => (
                <div key={field.id} className="relative p-4 border rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={control}
                            name={`${namePrefix}.${index}.amount`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bet Amount (INR)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g. 9" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name={`${namePrefix}.${index}.payout`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payout Amount (INR)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g. 20" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}/>
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
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove Option</span>
                        </Button>
                    )}
                </div>
            ))}
             <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => append(defaultOption)}
                disabled={fields.length >= 5}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Option
            </Button>
        </div>
    )
}

function SportBettingForm({ sport, onSave }: { sport: Sport, onSave: (data: BettingSettingsFormValues) => Promise<any> }) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const form = useFormContext<BettingSettingsFormValues>();

    async function onSubmit(data: BettingSettingsFormValues) {
        setIsSubmitting(true);
        await onSave(data);
        setIsSubmitting(false);
    }
    
    return (
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <SportIcon sport={sport} className="w-5 h-5" />
                            {sport} Settings
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {sport === 'Cricket' ? (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg">General Bet</h3>
                                <p className="text-sm text-muted-foreground">For standard bets where both team predictions are made.</p>
                                <div className="mt-4">
                                <BetOptionFields namePrefix="betOptions.Cricket.general" />
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <h3 className="font-semibold text-lg">One Side Bet</h3>
                                <p className="text-sm text-muted-foreground">For bets where the user only predicts for one team (if enabled on the match).</p>
                                    <div className="mt-4">
                                    <BetOptionFields namePrefix="betOptions.Cricket.oneSided" />
                                    </div>
                            </div>
                                <Separator />
                            <div>
                                <h3 className="font-semibold text-lg">Player Bet</h3>
                                <p className="text-sm text-muted-foreground">For bets on individual player performance (if enabled on the match).</p>
                                    <div className="mt-4">
                                    <BetOptionFields namePrefix="betOptions.Cricket.player" />
                                </div>
                            </div>
                            </div>
                    ) : (
                        <BetOptionFields namePrefix={`betOptions.${sport}`} />
                    )}
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}

export function BettingSettingsForm({ initialData }: BettingSettingsFormProps) {
  const { toast } = useToast();
  const router = useRouter();

  const formMethods = useForm<BettingSettingsFormValues>({
    resolver: zodResolver(bettingSettingsSchema),
    defaultValues: initialData,
  });

  const handleSave = async (data: BettingSettingsFormValues) => {
    const result = await updateBettingSettings(data);
    if (result.error) {
        toast({ variant: "destructive", title: "Save Failed", description: result.error });
    } else {
        toast({ title: "Success", description: result.success });
        router.refresh();
        // After successful save, reset the form with the saved data to mark fields as no longer "dirty"
        formMethods.reset(data);
    }
  };

  return (
    <FormProvider {...formMethods}>
        <div className="space-y-8">
            <FormDescription>
                Define the fixed bet amounts available to users and their corresponding payout for each sport.
            </FormDescription>

            <div className="space-y-6">
                {sports.map((sport) => (
                    <SportBettingForm key={sport} sport={sport} onSave={handleSave}/>
                ))}
            </div>
        </div>
    </FormProvider>
  )
}
