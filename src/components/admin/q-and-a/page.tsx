
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMatches } from "@/app/actions/match.actions";
import { QandADashboard } from "@/components/admin/q-and-a-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Question, Sport } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { createQuestionInBank, getQuestionsFromBank, deleteQuestionFromBank } from '@/app/actions/qna.actions';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { sports } from '@/lib/types';
import { SportIcon } from '../icons';

function QandAPageSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <div>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full mt-1" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
             <div>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-3/4 mt-1" />
                    </CardHeader>
                    <CardContent>
                       <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function QuestionBankManager() {
    const { toast } = useToast();
    const [allQuestions, setAllQuestions] = React.useState<Question[]>([]);
    const [newQuestions, setNewQuestions] = React.useState<Record<Sport, string>>({
        Cricket: '', Football: '', Tennis: '', 'Table Tennis': '', Badminton: ''
    });
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState<Sport | null>(null);

    React.useEffect(() => {
        const loadQuestions = async () => {
            const fetchedQuestions = await getQuestionsFromBank();
            setAllQuestions(fetchedQuestions);
            setIsLoading(false);
        };
        loadQuestions();
    }, []);

    const handleAddQuestion = async (e: React.FormEvent, sport: Sport) => {
        e.preventDefault();
        const questionText = newQuestions[sport];
        if (!questionText.trim()) {
            toast({ variant: 'destructive', title: 'Invalid Question', description: 'Question cannot be empty.' });
            return;
        }
        setIsSubmitting(sport);
        const result = await createQuestionInBank(questionText, sport);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
            toast({ title: 'Success', description: 'New question added to the bank.' });
            setAllQuestions(prev => [result.newQuestion as Question, ...prev]);
            setNewQuestions(prev => ({...prev, [sport]: ''}));
        }
        setIsSubmitting(null);
    };
    
    const handleNewQuestionChange = (sport: Sport, value: string) => {
        setNewQuestions(prev => ({...prev, [sport]: value}));
    }

    const handleDeleteQuestion = async (questionId: string) => {
        const result = await deleteQuestionFromBank(questionId);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
            toast({ title: 'Success', description: 'Question removed from the bank.' });
            setAllQuestions(prev => prev.filter(q => q.id !== questionId));
        }
    };
    
    const renderQuestionBankForSport = (sport: Sport) => {
        const sportQuestions = allQuestions.filter(q => q.sport === sport);
        return (
            <div className="space-y-4">
                 <form onSubmit={(e) => handleAddQuestion(e, sport)} className="flex items-center gap-2">
                    <Input 
                        placeholder="Add a new question for this sport..."
                        value={newQuestions[sport]}
                        onChange={(e) => handleNewQuestionChange(sport, e.target.value)}
                        disabled={isSubmitting === sport}
                    />
                    <Button type="submit" disabled={isSubmitting === sport}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Add
                    </Button>
                </form>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                    ) : sportQuestions.length > 0 ? (
                        sportQuestions.map(q => (
                            <div key={q.id} className="flex items-center justify-between p-2 border rounded-md">
                                <span className="text-sm">{q.question}</span>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete this question from the bank.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteQuestion(q.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No questions for {sport} in the bank.</p>
                    )}
                </div>
            </div>
        )
    }

    return (
         <Card>
            <CardHeader>
                <CardTitle>Question Bank</CardTitle>
                <CardDescription>
                    Manage the reusable list of questions, categorized by sport.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="Cricket" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto">
                        {sports.map((sport) => (
                        <TabsTrigger key={sport} value={sport} className="flex items-center gap-2">
                           <SportIcon sport={sport} className="w-4 h-4" />
                            {sport}
                        </TabsTrigger>
                        ))}
                    </TabsList>
                     {sports.map((sport) => (
                        <TabsContent key={sport} value={sport} className="mt-4">
                           {renderQuestionBankForSport(sport)}
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    );
}


export default function QandAPage() {
    const [matches, setMatches] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const refreshMatches = React.useCallback(async () => {
        setIsLoading(true);
        const updatedMatches = await getMatches();
        setMatches(updatedMatches);
        setIsLoading(false);
    }, []);

    React.useEffect(() => {
        refreshMatches();
    }, [refreshMatches]);

    if (isLoading) {
        return <QandAPageSkeleton />
    }
    
    return (
        <Tabs defaultValue="results" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="results">Match Results & Settlement</TabsTrigger>
                <TabsTrigger value="bank">Question Bank</TabsTrigger>
            </TabsList>
            <TabsContent value="results" className="mt-4">
                <Card className="flex h-full flex-col">
                    <CardHeader>
                        <CardTitle>Match Results &amp; Settlement</CardTitle>
                        <CardDescription>
                            Select a match to enter results for its questions and settle the bets.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                        <QandADashboard matches={matches} onUpdate={refreshMatches} />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="bank" className="mt-4">
                <QuestionBankManager />
            </TabsContent>
        </Tabs>
    );
}
