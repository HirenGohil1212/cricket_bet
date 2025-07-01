
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as React from "react";
import Image from "next/image";
import { z } from "zod";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Match, Sport } from "@/lib/types";
import { PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

// Define a schema for the Q&A form
const answerSchema = z.object({
    text: z.string().min(1, "Answer text cannot be empty."),
    odds: z.coerce.number().min(1, "Odds must be at least 1."),
});

const qnaFormSchema = z.object({
    matchId: z.string().min(1, "Please select a match."),
    question: z.string().min(10, "Question must be at least 10 characters long."),
    answers: z.array(answerSchema).min(2, "You must provide at least two answers."),
});

type QnAFormValues = z.infer<typeof qnaFormSchema>;

interface QandAFormProps {
    sport: Sport;
    matchesForSport: Match[];
}

export function QandAForm({ sport, matchesForSport }: QandAFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [selectedMatch, setSelectedMatch] = React.useState<Match | null>(null);

    const form = useForm<QnAFormValues>({
        resolver: zodResolver(qnaFormSchema),
        defaultValues: {
            matchId: "",
            question: "",
            answers: [{ text: "", odds: 1.0 }, { text: "", odds: 1.0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "answers",
    });

    const handleMatchChange = (matchId: string) => {
        const match = matchesForSport.find(m => m.id === matchId) || null;
        setSelectedMatch(match);
        form.setValue("matchId", matchId);
    }

    async function onSubmit(data: QnAFormValues) {
        setIsSubmitting(true);
        console.log("Submitting Q&A data:", data);
        // TODO: Implement server action to save this data
        toast({
            title: "Success (Simulation)",
            description: `Question for match ${selectedMatch?.teamA.name} vs ${selectedMatch?.teamB.name} has been saved.`,
        });
        form.reset({
            matchId: "",
            question: "",
            answers: [{ text: "", odds: 1.0 }, { text: "", odds: 1.0 }],
        });
        setSelectedMatch(null);
        setIsSubmitting(false);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="matchId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Select a Match</FormLabel>
                             <Select onValueChange={handleMatchChange} value={field.value}>
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

                {selectedMatch && (
                    <Card className="border-dashed">
                        <CardHeader>
                            <CardTitle>Create Question for:</CardTitle>
                            <div className="flex justify-around items-center pt-2">
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <Image src={selectedMatch.teamA.logoUrl} alt={selectedMatch.teamA.name} width={40} height={40} className="rounded-full" />
                                    <span className="font-semibold">{selectedMatch.teamA.name}</span>
                                </div>
                                <span className="text-muted-foreground font-bold">VS</span>
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <Image src={selectedMatch.teamB.logoUrl} alt={selectedMatch.teamB.name} width={40} height={40} className="rounded-full" />
                                    <span className="font-semibold">{selectedMatch.teamB.name}</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="question"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-lg font-semibold">Question</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="e.g., Who will be the Man of the Match?" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-4">
                                <FormLabel className="text-lg font-semibold">Possible Answers</FormLabel>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-end gap-4 p-4 border rounded-md relative">
                                        <FormField
                                            control={form.control}
                                            name={`answers.${index}.text`}
                                            render={({ field }) => (
                                                <FormItem className="flex-grow">
                                                    <FormLabel>Answer #{index + 1}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g., Virat Kohli" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={form.control}
                                            name={`answers.${index}.odds`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Odds (e.g., 2.5)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.1" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive shrink-0"
                                            onClick={() => remove(index)}
                                            disabled={fields.length <= 2}
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
                                    Add Answer
                                </Button>
                            </div>

                            <Button type="submit" disabled={isSubmitting} className="w-full">
                                {isSubmitting ? "Saving..." : "Save Question"}
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </form>
        </Form>
    )
}
