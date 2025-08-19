'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Match, Question, Winner } from '@/lib/types';
import { getQuestionsForMatch, getWinnersForMatch } from '@/app/actions/qna.actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ManageQnaDialog } from './manage-qna-dialog';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { SettlementResultsDialog } from './settlement-results-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cancelMatch } from '@/app/actions/match.actions';
import { useRouter } from 'next/navigation';

interface MatchQnaCardProps {
    match: Match;
    onUpdate: () => void;
}

export function MatchQnaCard({ match, onUpdate }: MatchQnaCardProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [questions, setQuestions] = React.useState<Question[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isCancelling, setIsCancelling] = React.useState(false);
    const [isManageDialogOpen, setIsManageDialogOpen] = React.useState(false);

    const [isFetchingWinners, setIsFetchingWinners] = React.useState(false);
    const [winnersData, setWinnersData] = React.useState<{ winners: Winner[] } | null>(null);
    const [isWinnersDialogOpen, setIsWinnersDialogOpen] = React.useState(false);

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
            onUpdate(); 
        }
    }

    const handleViewWinners = async () => {
        setIsFetchingWinners(true);
        const winners = await getWinnersForMatch(match.id);
        setWinnersData({ winners });
        setIsWinnersDialogOpen(true);
        setIsFetchingWinners(false);
    };

    const handleCancelMatch = async () => {
        setIsCancelling(true);
        const result = await cancelMatch(match.id);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Cancellation Failed', description: result.error });
        } else {
            toast({ title: 'Match Cancelled', description: result.success });
            onUpdate();
        }
        setIsCancelling(false);
    }

    const isActionable = match.status === 'Upcoming' || match.status === 'Live';

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center">
                            <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={40} height={40} className="object-cover" />
                        </div>
                        <CardTitle>{match.teamA.name} vs {match.teamB.name}</CardTitle>
                        <div className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center">
                            <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={40} height={40} className="object-cover" />
                        </div>
                    </div>
                    <CardDescription>
                        {new Date(match.startTime).toLocaleString()} - {match.sport} - Status: <span className="font-bold">{match.status}</span>
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
                    {match.status === 'Finished' && (
                        <Button variant="outline" onClick={handleViewWinners} disabled={isFetchingWinners}>
                            {isFetchingWinners && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            View Winners
                        </Button>
                    )}
                    {isActionable && (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={isCancelling}>
                                    {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Cancel Match
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will cancel the match and refund all pending bets to the users' wallets.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Close</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelMatch} className="bg-destructive hover:bg-destructive/90">Confirm & Refund</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <Button 
                        onClick={() => setIsManageDialogOpen(true)}
                        disabled={!isActionable}
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
            
            {winnersData && (
                <SettlementResultsDialog
                    isOpen={isWinnersDialogOpen}
                    onClose={() => setIsWinnersDialogOpen(false)}
                    results={winnersData}
                />
            )}
        </>
    );
}
