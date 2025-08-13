
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, FormProvider, useFormContext, useWatch } from "react-hook-form";
import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { debounce } from 'lodash';

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
import { cn } from "@/lib/utils";

interface BettingSettingsFormProps {
    initialData: BettingSettings;
}

const defaultOption = { amount: 10, payout: 20 };

type SavingState = 'idle' | 'saving' | 'saved';

function SportBettingForm({ sport }: { sport: Sport }) {
    const { control, getValues, formState: { isDirty, dirtyFields } } = useFormContext<BettingSettingsFormValues>();
    const { toast } = useToast();
    const router = useRouter();
    const [savingState, setSavingState] = React.useState<SavingState>('idle');
    
    const { fields, append, remove } = useFieldArray({
        control,
        name: `betOptions.${sport}`,
    });

    const watchedFields = useWatch({
        control,
        name: `betOptions.${sport}`
    });

    const debouncedSave = React.useCallback(
        debounce(async (data: BettingSettingsFormValues) => {
            setSavingState('saving');
            const result = await updateBettingSettings(data);
            if (result.error) {
                toast({ variant: "destructive", title: "Auto-save Failed", description: result.error });
                setSavingState('idle');
            } else {
                setSavingState('saved');
                setTimeout(() => setSavingState('idle'), 2000); // Reset after 2s
            }
        }, 1500),
    [toast, router]
    );

    React.useEffect(() => {
        const sportIsDirty = dirtyFields.betOptions?.[sport];
        if (isDirty && sportIsDirty) {
             // We need to pass all betOptions to the server action, not just the ones for this sport
            const allValues = getValues();
            const validation = bettingSettingsSchema.safeParse(allValues);
            if(validation.success){
                debouncedSave(validation.data);
            }
        }
    }, [watchedFields, isDirty, dirtyFields.betOptions, sport, debouncedSave, getValues]);


    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SportIcon sport={sport} className="w-5 h-5" />
                        {sport} Settings
                    </div>
                     <div className={cn("flex items-center gap-1 text-xs text-muted-foreground transition-opacity", savingState !== 'idle' ? 'opacity-100' : 'opacity-0')}>
                        {savingState === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
                        {savingState === 'saving' && <span>Saving...</span>}
                        {savingState === 'saved' && <CheckCircle className="h-3 w-3 text-green-500" />}
                        {savingState === 'saved' && <span className="text-green-500">Saved</span>}
                    </div>
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
                                                <Input type="number" placeholder="e.g. 9" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}/>
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
                </div>
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
            </CardContent>
        </Card>
    );
}

export function BettingSettingsForm({ initialData }: BettingSettingsFormProps) {
  
  const form = useForm<BettingSettingsFormValues>({
    resolver: zodResolver(bettingSettingsSchema),
    defaultValues: {
        betOptions: initialData.betOptions
    },
  });

  return (
    <FormProvider {...form}>
      <div className="space-y-8">
        <FormDescription>
          Define the fixed bet amounts available to users and the corresponding payout if they win for each sport. Changes are saved automatically.
        </FormDescription>

        <div className="space-y-6">
            {sports.map((sport) => (
                <SportBettingForm key={sport} sport={sport} />
            ))}
        </div>
        
      </div>
    </FormProvider>
  )
}
