'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Match, Question } from '@/lib/types';
import { getQuestionsForMatch } from '@/app/actions/qna.actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ManageQnaDialog } from './manage-qna-dialog';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface MatchQnaCardProps {
    match: Match;
}

export function MatchQnaCard({ match }: MatchQnaCardProps) {
    const [questions, setQuestions] = React.useState<Question[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isManageDialogOpen, setIsManageDialogOpen] = React.useState(false);

    const fetchAndSetQuestions = React.useCallback(() => {
        setIsLoading(true);
        getQuestionsForMatch(match.id).then(data => {
            setQuestions(data);
            setIsLoading(false);
        });
    }, [match.id]);

    React.useEffect(() => {
        fetchAndSetQuestions();
    }, [fetchAndSetQuestions]);
    
    const onDialogClose = (shouldRefresh: boolean) => {
        setIsManageDialogOpen(false);
        if (shouldRefresh) {
            fetchAndSetQuestions();
        }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={40} height={40} className="rounded-full" />
                        <CardTitle>{match.teamA.name} vs {match.teamB.name}</CardTitle>
                        <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={40} height={40} className="rounded-full" />
                    </div>
                    <CardDescription>
                        {new Date(match.startTime).toLocaleString()} - {match.sport}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ) : questions.length > 0 ? (
                        <div className="flex items-center gap-2 text-green-600">
                           <CheckCircle className="h-5 w-5" />
                           <p>{questions.length} questions are set for this match.</p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-yellow-600">
                            <AlertCircle className="h-5 w-5" />
                            <p>No questions have been set for this match yet.</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button 
                        onClick={() => setIsManageDialogOpen(true)}
                    >
                        Manage Q&A
                    </Button>
                </CardFooter>
            </Card>

            {isManageDialogOpen && (
                <ManageQnaDialog
                    match={match}
                    questions={questions}
                    isOpen={isManageDialogOpen}
                    onClose={onDialogClose}
                />
            )}
        </>
    );
}
