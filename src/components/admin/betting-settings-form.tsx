
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, FormProvider, useFormContext } from "react-hook-form";
import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, Loader2, Zap, Settings2 } from "lucide-react";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import type { BettingSettings, Sport } from "@/lib/types";
import { sports } from "@/lib/data";
import { bettingSettingsSchema, type BettingSettingsFormValues } from "@/lib/schemas";
import { updateBettingSettings } from "@/app/actions/settings.actions";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { SportIcon } from "../icons";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";

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
                <div key={field.id} className="relative p-4 border rounded-md bg-background/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={control}
                            name={`${namePrefix}.${index}.amount`}
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
                            name={`${namePrefix}.${index}.payout`}
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
    const mode = form.watch(`betOptions.${sport}.mode` as any);

    async function onSubmit(data: BettingSettingsFormValues) {
        setIsSubmitting(true);
        await onSave(data);
        setIsSubmitting(false);
    }
    
    return (
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card className="border-primary/20">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <SportIcon sport={sport} className="w-6 h-6" />
                            <CardTitle className="text-xl">{sport} Settings</CardTitle>
                        </div>
                        <FormField
                            control={form.control}
                            name={`betOptions.${sport}.mode` as any}
                            render={({ field }) => (
                                <FormItem className="space-y-0">
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex items-center bg-muted p-1 rounded-lg"
                                        >
                                            <div className="flex items-center">
                                                <RadioGroupItem value="fixed" id={`${sport}-fixed`} className="sr-only" />
                                                <Label
                                                    htmlFor={`${sport}-fixed`}
                                                    className={cn(
                                                        "px-4 py-1.5 rounded-md cursor-pointer text-xs font-bold transition-all flex items-center gap-2",
                                                        field.value === 'fixed' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    <Settings2 className="h-3 w-3" /> FIXED
                                                </Label>
                                            </div>
                                            <div className="flex items-center">
                                                <RadioGroupItem value="dynamic" id={`${sport}-dynamic`} className="sr-only" />
                                                <Label
                                                    htmlFor={`${sport}-dynamic`}
                                                    className={cn(
                                                        "px-4 py-1.5 rounded-md cursor-pointer text-xs font-bold transition-all flex items-center gap-2",
                                                        field.value === 'dynamic' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    <Zap className="h-3 w-3" /> DYNAMIC
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {mode === 'fixed' ? (
                        <div className="space-y-6">
                            {sport === 'Cricket' ? (
                                <>
                                    <div>
                                        <h3 className="font-bold text-primary uppercase text-xs tracking-wider mb-4">General Bet Options</h3>
                                        <BetOptionFields namePrefix="betOptions.Cricket.general" />
                                    </div>
                                    <Separator />
                                    <div>
                                        <h3 className="font-bold text-primary uppercase text-xs tracking-wider mb-4">One Side Bet Options</h3>
                                        <BetOptionFields namePrefix="betOptions.Cricket.oneSided" />
                                    </div>
                                    <Separator />
                                    <div>
                                        <h3 className="font-bold text-primary uppercase text-xs tracking-wider mb-4">Player Bet Options</h3>
                                        <BetOptionFields namePrefix="betOptions.Cricket.player" />
                                    </div>
                                </>
                            ) : (
                                <BetOptionFields namePrefix={`betOptions.${sport}.options`} />
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 bg-muted/30 p-6 rounded-xl border border-dashed border-primary/20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField
                                    control={form.control}
                                    name={`betOptions.${sport}.multipliers.qna` as any}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-primary font-bold">QnA Bet Multiplier</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type="number" step="0.1" placeholder="e.g. 2" className="pl-12 h-12 text-lg font-bold" {...field} onChange={e => field.onChange(Number(e.target.value))}/>
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl text-muted-foreground/50">X</span>
                                                </div>
                                            </FormControl>
                                            <FormDescription>Reward multiplier for standard team questions.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`betOptions.${sport}.multipliers.player` as any}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-primary font-bold">Player Bet Multiplier</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type="number" step="0.1" placeholder="e.g. 10" className="pl-12 h-12 text-lg font-bold" {...field} onChange={e => field.onChange(Number(e.target.value))}/>
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl text-muted-foreground/50">X</span>
                                                </div>
                                            </FormControl>
                                            <FormDescription>Reward multiplier for individual player performance.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                                <p className="text-sm text-center text-muted-foreground italic">
                                    "In Dynamic Mode, users can enter any amount. Potential Win = Bet Amount × Multiplier"
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-4">
                    <Button type="submit" disabled={isSubmitting} size="lg" className="px-10">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save {sport} Settings
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
        formMethods.reset(data);
    }
  };

  return (
    <FormProvider {...formMethods}>
        <div className="space-y-8">
            <FormDescription>
                Choose between fixed amounts or dynamic betting with multipliers. Changes apply to future matches.
            </FormDescription>

            <div className="space-y-8">
                {sports.map((sport) => (
                    <SportBettingForm key={sport} sport={sport} onSave={handleSave}/>
                ))}
            </div>
        </div>
    </FormProvider>
  )
}
