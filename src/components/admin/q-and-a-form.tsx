
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { QnAFormValues } from "@/lib/schemas";


const defaultQuestion = {
  question: "",
  options: [
    { text: "" },
    { text: "" },
  ],
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
                    <QuestionField key={questionField.id} qIndex={qIndex} remove={remove} control={form.control} />
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

function QuestionField({ qIndex, remove, control }: { qIndex: number; remove: (index: number) => void; control: any }) {
    return (
         <Card className="relative border-dashed">
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
            <CardContent className="grid grid-cols-1 md:grid-cols-3 items-start gap-6 pt-4">
                {/* Left Side Option */}
                <div className="space-y-2">
                    <FormLabel className="font-semibold text-center block">Option A</FormLabel>
                    <FormField
                        control={control}
                        name={`questions.${qIndex}.options.0.text`}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="e.g. India" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Middle Question */}
                <FormField
                    control={control}
                    name={`questions.${qIndex}.question`}
                    render={({ field }) => (
                        <FormItem className="flex flex-col h-full">
                            <FormLabel className="font-semibold text-center">Question</FormLabel>
                            <FormControl className="flex-grow">
                                <Textarea placeholder="e.g., Which team will win the toss?" {...field} className="h-full min-h-[100px]" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Right Side Option */}
                <div className="space-y-2">
                    <FormLabel className="font-semibold text-center block">Option B</FormLabel>
                     <FormField
                        control={control}
                        name={`questions.${qIndex}.options.1.text`}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="e.g. Australia" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
