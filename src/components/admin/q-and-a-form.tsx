
"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { QnAFormValues } from "@/lib/schemas";


const defaultQuestion = {
  question: "",
};

export function QandAForm() {
    const form = useFormContext<QnAFormValues>();

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "questions",
    });

    return (
        <div className="space-y-8">
            <div className="space-y-6">
                {fields.map((questionField, qIndex) => (
                    <Card key={questionField.id} className="relative border-dashed">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg">Question #{qIndex + 1}</CardTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => remove(qIndex)}
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove Question</span>
                            </Button>
                        </CardHeader>
                        <CardContent>
                             <FormField
                                control={form.control}
                                name={`questions.${qIndex}.question`}
                                render={({ field }) => (
                                    <FormItem className="flex flex-col h-full">
                                        <FormLabel className="font-semibold">Question Text</FormLabel>
                                        <FormControl className="flex-grow">
                                            <Textarea placeholder="e.g., Which team will win the toss?" {...field} className="h-full min-h-[70px]" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Button
                type="button"
                variant="outline"
                onClick={() => append(defaultQuestion)}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Another Question
            </Button>
        </div>
    )
}
