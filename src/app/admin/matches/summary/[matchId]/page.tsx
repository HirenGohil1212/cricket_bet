

import { getMatchById } from "@/app/actions/match.actions";
import { getQuestionsForMatch, getWinnersForMatch } from "@/app/actions/qna.actions";
import { getTotalBetAmountForMatch } from "@/app/actions/bet.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Terminal, Trophy, Users, Banknote, HelpCircle, User } from "lucide-react";
import Link from 'next/link';
import Image from 'next/image';
import { Separator } from "@/components/ui/separator";

interface MatchSummaryPageProps {
    params: {
        matchId: string;
    };
}

export default async function MatchSummaryPage({ params }: MatchSummaryPageProps) {
    const { matchId } = params;

    const [match, questions, winners, totalCollection] = await Promise.all([
        getMatchById(matchId),
        getQuestionsForMatch(matchId),
        getWinnersForMatch(matchId),
        getTotalBetAmountForMatch(matchId),
    ]);
    
    if (!match) {
        return (
            <div className="flex items-center justify-center h-full">
                <Alert variant="destructive" className="max-w-lg">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Match Not Found</AlertTitle>
                    <AlertDescription>
                        The match you are trying to view does not exist.
                         <Button variant="outline" size="sm" className="mt-4" asChild>
                            <Link href="/admin/matches">Back to Matches</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    if (match.status !== 'Finished') {
         return (
            <div className="flex items-center justify-center h-full">
                <Alert variant="destructive" className="max-w-lg">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Match Not Finished</AlertTitle>
                    <AlertDescription>
                        A summary is only available for finished matches.
                         <Button variant="outline" size="sm" className="mt-4" asChild>
                            <Link href="/admin/matches">Back to Matches</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const totalPayout = winners.reduce((sum, winner) => sum + winner.payoutAmount, 0);

    const hasPlayerResults = questions.some(q => q.playerResult && (Object.keys(q.playerResult.teamA).length > 0 || Object.keys(q.playerResult.teamB).length > 0));


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold">Match Summary</h1>
                     <p className="text-muted-foreground">
                        {match.teamA.name} vs {match.teamB.name}
                     </p>
                </div>
                 <Button variant="outline" asChild>
                    <Link href="/admin/matches">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Matches
                    </Link>
                </Button>
            </div>

            {/* Match Info and Score */}
            <Card>
                <CardHeader>
                    <CardTitle>Match Details</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-around items-center text-center">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center">
                            <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={64} height={64} className="object-cover" />
                        </div>
                        <h3 className="font-semibold text-base sm:text-lg">{match.teamA.name}</h3>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-muted-foreground">
                        {match.score || "vs"}
                    </div>
                     <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center">
                            <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={64} height={64} className="object-cover" />
                        </div>
                        <h3 className="font-semibold text-base sm:text-lg">{match.teamB.name}</h3>
                    </div>
                </CardContent>
            </Card>

            {/* Financial Summary */}
             <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bets Placed</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">INR {totalCollection.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Total amount wagered on this match.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Payout to Winners</CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">INR {totalPayout.toFixed(2)}</div>
                         <p className="text-xs text-muted-foreground">{winners.length} winner(s).</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Match Revenue</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">INR {(totalCollection - totalPayout).toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Total Bets - Total Payouts</p>
                    </CardContent>
                </Card>
            </div>

            {/* Questions and Team Results */}
            <Card className="bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5"/> Team Q&amp;A Results</CardTitle>
                </CardHeader>
                <CardContent>
                     {questions.length > 0 ? (
                        <div className="space-y-4">
                            {questions.map((q) => (
                                <div key={q.id} className="p-3 border rounded-md bg-background">
                                    <p className="font-medium text-muted-foreground text-center">{q.question}</p>
                                    <div className="mt-2 pt-2 border-t flex justify-around font-semibold text-primary">
                                        <span>{match.teamA.name}: {q.result?.teamA || 'N/A'}</span>
                                        <span>{match.teamB.name}: {q.result?.teamB || 'N/A'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-4">No questions were available for this match.</p>
                    )}
                </CardContent>
            </Card>

            {/* Player Results */}
            {hasPlayerResults && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5"/> Player Q&amp;A Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {questions.map((q) => {
                             const teamAResults = Object.entries(q.playerResult?.teamA || {}).filter(([, result]) => result);
                             const teamBResults = Object.entries(q.playerResult?.teamB || {}).filter(([, result]) => result);

                            if (teamAResults.length === 0 && teamBResults.length === 0) {
                                return null;
                            }
                            return (
                                <div key={`player-${q.id}`} className="p-3 border rounded-md">
                                    <p className="font-medium text-muted-foreground text-center">{q.question}</p>
                                     <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-x-4">
                                        <div className="space-y-1">
                                            {teamAResults.map(([playerName, result]) => (
                                                <div key={playerName} className="text-sm">
                                                    <span className="font-semibold">{playerName} ({match.teamA.name}):</span> {result}
                                                </div>
                                            ))}
                                        </div>
                                         <div className="space-y-1">
                                            {teamBResults.map(([playerName, result]) => (
                                                <div key={playerName} className="text-sm">
                                                    <span className="font-semibold">{playerName} ({match.teamB.name}):</span> {result}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}


            {/* Winners List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Winners List</CardTitle>
                </CardHeader>
                <CardContent>
                    {winners.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Winner Name</TableHead>
                                    <TableHead>User ID</TableHead>
                                    <TableHead className="text-right">Payout Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {winners.map((winner) => (
                                    <TableRow key={winner.userId}>
                                        <TableCell className="font-medium">{winner.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{winner.userId.startsWith('dummy-') ? 'House Account' : winner.userId}</TableCell>
                                        <TableCell className="text-right font-semibold">INR {winner.payoutAmount.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-4">There were no winners for this match.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
