
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Match, Sport } from "@/lib/types";
import { PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { qnaFormSchema, type QnAFormValues } from "@/lib/schemas";
import { createQuestions } from "@/app/actions/qna.actions";


interface QandAFormProps {
    sport: Sport;
    matchesForSport: Match[];
}

const defaultQuestion = {
  question: "",
  options: [
    { text: "", odds: 1.0 },
    { text: "", odds: 1.0 },
  ],
};

export function QandAForm({ sport, matchesForSport }: QandAFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<QnAFormValues>({
        resolver: zodResolver(qnaFormSchema),
        defaultValues: {
            applyTo: "single",
            matchId: "",
            questions: [defaultQuestion],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "questions",
    });

    const watchApplyTo = form.watch("applyTo");

    async function onSubmit(data: QnAFormValues) {
        setIsSubmitting(true);
        const result = await createQuestions(data, sport);

        if (result.error) {
            toast({
                variant: "destructive",
                title: "Error Creating Questions",
                description: result.error,
            });
        } else {
            toast({
                title: "Success!",
                description: result.success,
            });
            form.reset({
                applyTo: "single",
                matchId: "",
                questions: [defaultQuestion],
            });
        }
        setIsSubmitting(false);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                        control={form.control}
                        name="applyTo"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel>Application Scope</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  className="flex flex-col space-y-1"
                                >
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value="single" /></FormControl>
                                    <FormLabel className="font-normal">Apply to a single match</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value="all" /></FormControl>
                                    <FormLabel className="font-normal">Apply to all upcoming {sport} matches</FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    {watchApplyTo === 'single' && (
                        <FormField
                            control={form.control}
                            name="matchId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select a Match</FormLabel>
                                     <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={`Select a ${sport} match`} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {matchesForSport.length > 0 ? (
                                                matchesForSport.map(match => (
                                                    <SelectItem key={match.id} value={match.id}>
                                                        {match.teamA.name} vs {match.teamB.name}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <div className="p-4 text-sm text-muted-foreground">No upcoming matches for {sport}.</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>

                <div className="space-y-6">
                    {fields.map((questionField, qIndex) => (
                        <QuestionField key={questionField.id} qIndex={qIndex} remove={remove} control={form.control} />
                    ))}
                </div>

                <div className="flex justify-between items-center">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => append(defaultQuestion)}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Question
                    </Button>
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save Questions"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}

function QuestionField({ qIndex, remove, control }: { qIndex: number; remove: (index: number) => void; control: any }) {
    const { fields, append, remove: removeOption } = useFieldArray({
        control,
        name: `questions.${qIndex}.options`,
    });

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
            <CardContent className="space-y-4">
                 <FormField
                    control={control}
                    name={`questions.${qIndex}.question`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Question Text</FormLabel>
                            <FormControl>
                                <Textarea placeholder="e.g., Who will be the man of the match?" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                <div className="space-y-3">
                    <FormLabel>Answer Options</FormLabel>
                    {fields.map((optionField, oIndex) => (
                        <div key={optionField.id} className="flex items-end gap-2">
                            <FormField
                                control={control}
                                name={`questions.${qIndex}.options.${oIndex}.text`}
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <FormControl>
                                            <Input placeholder={`Option ${oIndex + 1}`} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={control}
                                name={`questions.${qIndex}.options.${oIndex}.odds`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input type="number" step="0.1" placeholder="Odds" className="w-24" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive shrink-0 w-8 h-8"
                                onClick={() => removeOption(oIndex)}
                                disabled={fields.length <= 1}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ text: "", odds: 1.0 })}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Option
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
