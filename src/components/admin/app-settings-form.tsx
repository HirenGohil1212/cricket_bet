
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
import type { AppSettings } from "@/lib/types";
import { appSettingsSchema, type AppSettingsFormValues } from "@/lib/schemas";
import { updateAppSettings } from "@/app/actions/settings.actions";
import { Card, CardContent } from "../ui/card";

interface AppSettingsFormProps {
    initialData: AppSettings;
}

export function AppSettingsForm({ initialData }: AppSettingsFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      whatsappNumber: initialData.whatsappNumber || "",
    }
  });

  async function onSubmit(data: AppSettingsFormValues) {
    setIsSubmitting(true);
    const result = await updateAppSettings(data);
    
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
        <Card>
            <CardContent className="pt-6">
                 <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Support Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 919876543210" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter the full number including the country code (e.g., 91 for India).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
        </Card>
       
        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </Form>
  )
}
