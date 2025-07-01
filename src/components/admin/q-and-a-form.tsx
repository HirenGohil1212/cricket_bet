
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
import { Card, CardContent } from "../ui/card";

// Define a schema for the Q&A form
const answerSchema = z.object({
    text: z.string().min(1, "Answer text cannot be empty."),
    odds: z.coerce.number().min(1, "Odds must be at least 1."),
});

const qnaFormSchema = z.object({
    matchId: z.string().min(1, "Please select a match."),
    question: z.string().min(10, "Question must be at least 10 characters long."),
    teamA_answers: z.array(answerSchema).min(1, "You must provide at least one answer for Team A."),
    teamB_answers: z.array(answerSchema).min(1, "You must provide at least one answer for Team B."),
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
            teamA_answers: [{ text: "", odds: 1.0 }],
            teamB_answers: [{ text: "", odds: 1.0 }],
        },
    });

    const { fields: fieldsA, append: appendA, remove: removeA } = useFieldArray({
        control: form.control,
        name: "teamA_answers",
    });
    
    const { fields: fieldsB, append: appendB, remove: removeB } = useFieldArray({
        control: form.control,
        name: "teamB_answers",
    });

    const handleMatchChange = (matchId: string) => {
        const match = matchesForSport.find(m => m.id === matchId) || null;
        setSelectedMatch(match);
        form.setValue("matchId", matchId);
        form.reset({
            matchId: matchId,
            question: "",
            teamA_answers: [{ text: "", odds: 1.0 }],
            teamB_answers: [{ text: "", odds: 1.0 }],
        });
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
            teamA_answers: [{ text: "", odds: 1.0 }],
            teamB_answers: [{ text: "", odds: 1.0 }],
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
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                                {/* Column 1: Team A */}
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center gap-2 text-center p-4 rounded-lg bg-muted/50">
                                        <Image src={selectedMatch.teamA.logoUrl} alt={selectedMatch.teamA.name} width={40} height={40} className="rounded-full" />
                                        <span className="font-semibold">{selectedMatch.teamA.name}</span>
                                    </div>
                                    <h4 className="font-semibold text-center text-sm text-muted-foreground">Answer Options for Team A</h4>
                                    
                                    {fieldsA.map((field, index) => (
                                        <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md relative bg-muted/20">
                                            <FormField
                                                control={form.control}
                                                name={`teamA_answers.${index}.text`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-grow">
                                                        <FormLabel className="text-xs">Answer #{index + 1}</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g., Player Name" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`teamA_answers.${index}.odds`}
                                                render={({ field }) => (
                                                    <FormItem className="w-24">
                                                        <FormLabel className="text-xs">Odds</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" step="0.1" placeholder="e.g. 2.5" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive shrink-0 w-7 h-7"
                                                onClick={() => removeA(index)}
                                                disabled={fieldsA.length <= 1}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => appendA({ text: "", odds: 1.0 })}
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Answer
                                    </Button>
                                </div>

                                {/* Column 2: Question */}
                                <div className="space-y-4 lg:pt-16">
                                    <FormField
                                        control={form.control}
                                        name="question"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-lg font-semibold text-center block">The Question</FormLabel>
                                                <FormControl>
                                                    <Textarea rows={5} placeholder="e.g., How many catches will be dropped?" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" disabled={isSubmitting} className="w-full !mt-8">
                                        {isSubmitting ? "Saving..." : "Save Question & Answers"}
                                    </Button>
                                </div>

                                {/* Column 3: Team B */}
                                <div className="space-y-4">
                                     <div className="flex flex-col items-center gap-2 text-center p-4 rounded-lg bg-muted/50">
                                        <Image src={selectedMatch.teamB.logoUrl} alt={selectedMatch.teamB.name} width={40} height={40} className="rounded-full" />
                                        <span className="font-semibold">{selectedMatch.teamB.name}</span>
                                    </div>
                                    <h4 className="font-semibold text-center text-sm text-muted-foreground">Answer Options for Team B</h4>
                                    
                                    {fieldsB.map((field, index) => (
                                        <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md relative bg-muted/20">
                                            <FormField
                                                control={form.control}
                                                name={`teamB_answers.${index}.text`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-grow">
                                                        <FormLabel className="text-xs">Answer #{index + 1}</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g., Player Name" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`teamB_answers.${index}.odds`}
                                                render={({ field }) => (
                                                    <FormItem className="w-24">
                                                        <FormLabel className="text-xs">Odds</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" step="0.1" placeholder="e.g. 2.5" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive shrink-0 w-7 h-7"
                                                onClick={() => removeB(index)}
                                                disabled={fieldsB.length <= 1}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => appendB({ text: "", odds: 1.0 })}
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Answer
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </form>
        </Form>
    )
}
