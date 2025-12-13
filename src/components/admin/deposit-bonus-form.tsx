
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { appSettingsSchema, type AppSettingsFormValues } from "@/lib/schemas";
import { updateAppSettings } from "@/app/actions/settings.actions";
import { Percent } from "lucide-react";

interface DepositBonusFormProps {
    initialPercentage: number;
}

export function DepositBonusForm({ initialPercentage }: DepositBonusFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<Pick<AppSettingsFormValues, 'depositBonusPercentage'>>({
    resolver: zodResolver(appSettingsSchema.pick({ depositBonusPercentage: true })),
    defaultValues: {
      depositBonusPercentage: initialPercentage,
    }
  });

  async function onSubmit(data: Pick<AppSettingsFormValues, 'depositBonusPercentage'>) {
    setIsSubmitting(true);
    const result = await updateAppSettings(data);
    
    if (result.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
        toast({ title: "Settings Saved", description: "Deposit bonus percentage updated." });
        router.refresh();
    }
    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2">
        <FormField
          control={form.control}
          name="depositBonusPercentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Deposit Bonus</FormLabel>
              <div className="relative">
                <Input type="number" placeholder="e.g. 5" {...field} className="pl-7" />
                <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </Form>
  )
}
