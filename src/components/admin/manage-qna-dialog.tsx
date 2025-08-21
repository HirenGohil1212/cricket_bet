'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Match, Question, Winner } from '@/lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { saveQuestionResults, settleMatchAndPayouts } from '@/app/actions/qna.actions';
import { Alert, AlertDescription } from '../ui/alert';
import { Info } from 'lucide-react';
import { Label } from '../ui/label';
import { SettlementResultsDialog } from './settlement-results-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/auth-context';
import { Separator } from '../ui/separator';
import { useForm, FormProvider } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem } from '../ui/form';

type ResultState = {
    [key: string]: { teamA: string; teamB: string } | Record<string, Record<string, string>>;
};

interface ManageQnaDialogProps {
    match: Match;
    questions: Question[];
    isOpen: boolean;
    onClose: (shouldRefresh: boolean) => void;
}

export function ManageQnaDialog({ match, questions, isOpen, onClose }: ManageQnaDialogProps) {
    const { toast } = useToast();
    const router = useRouter();
    const { userProfile } = useAuth();
    const [isSaving, setIsSaving] = React.useState(false);
    const [isSettling, setIsSettling] = React.useState(false);
    
    const [settlementResults, setSettlementResults] = React.useState<{ winners: Winner[]; totalBetsProcessed: number; } | null>(null);
    const [isResultsDialogOpen, setIsResultsDialogOpen] = React.useState(false);

    const isAdmin = userProfile?.role === 'admin';

    const form = useForm({
        defaultValues: React.useMemo(() => {
            const defaults: ResultState = {};
            questions.forEach(q => {
                defaults[q.id] = {
                    teamA: q.result?.teamA || '',
                    teamB: q.result?.teamB || ''
                };
                if (match.isSpecialMatch) {
                    const playerResultObject: Record<string, Record<string, string>> = { teamA: {}, teamB: {} };
                    match.teamA.players?.forEach(p => {
                        playerResultObject.teamA[p.name] = (q.playerResult as any)?.teamA?.[p.name] || '';
                    });
                    match.teamB.players?.forEach(p => {
                        playerResultObject.teamB[p.name] = (q.playerResult as any)?.teamB?.[p.name] || '';
                    });
                    defaults[`player_${q.id}`] = playerResultObject;
                }
            });
            return defaults;
        }, [questions, match])
    });
    
    React.useEffect(() => {
        const defaults: ResultState = {};
        questions.forEach(q => {
            defaults[q.id] = {
                teamA: q.result?.teamA || '',
                teamB: q.result?.teamB || ''
            };
            if (match.isSpecialMatch) {
                const playerResultObject: Record<string, Record<string, string>> = { teamA: {}, teamB: {} };
                match.teamA.players?.forEach(p => {
                    playerResultObject.teamA[p.name] = (q.playerResult as any)?.teamA?.[p.name] || '';
                });
                match.teamB.players?.forEach(p => {
                    playerResultObject.teamB[p.name] = (q.playerResult as any)?.teamB?.[p.name] || '';
                });
                defaults[`player_${q.id}`] = playerResultObject;
            }
        });
        form.reset(defaults);
    }, [questions, match, form]);


    const handleSave = async (data: ResultState) => {
        if (!isAdmin) {
            toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to perform this action.' });
            return;
        }
        setIsSaving(true);
        
        const resultsToSave: Record<string, { teamA: string; teamB: string }> = {};
        const playerResultsToSave: Record<string, any> = {};

        Object.keys(data).forEach(key => {
            if (key.startsWith('player_')) {
                const questionId = key.substring(7);
                playerResultsToSave[questionId] = data[key];
            } else {
                resultsToSave[key] = data[key] as { teamA: string; teamB: string };
            }
        });

        const actionResult = await saveQuestionResults(match.id, resultsToSave, playerResultsToSave);

        if (actionResult.error) {
            toast({ variant: 'destructive', title: 'Save Failed', description: actionResult.error });
        } else {
            toast({ title: 'Success', description: actionResult.success });
            onClose(true);
        }
        setIsSaving(false);
    };

    const handleSettle = async () => {
        if (!isAdmin) {
            toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to perform this action.' });
            return;
        }
        setIsSettling(true);
        const actionResult = await settleMatchAndPayouts(match.id);
        setIsSettling(false);

        if (actionResult.error) {
            toast({ variant: 'destructive', title: 'Settlement Failed', description: actionResult.error });
        } else {
            toast({ title: 'Success', description: actionResult.success });
            onClose(true); 
            if (actionResult.winners) {
                setSettlementResults({ 
                    winners: actionResult.winners,
                    totalBetsProcessed: actionResult.totalBetsProcessed || 0
                });
                setIsResultsDialogOpen(true);
            }
        }
    };

    const hasActiveQuestions = questions.some(q => q.status === 'active');
    
    const PlayerResultGrid = ({ team, teamSide }: { team: Match['teamA'], teamSide: 'teamA' | 'teamB' }) => {
        if (!team.players || team.players.length === 0) return null;

        return (
             <div className="space-y-2">
                <h4 className="font-semibold">{team.name} Player Results</h4>
                <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Question</TableHead>
                            {team.players.map(p => <TableHead key={p.name} className="text-center">{p.name}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {questions.map((q) => (
                            <TableRow key={q.id}>
                                <TableCell className="font-medium text-xs text-muted-foreground">{q.question}</TableCell>
                                {team.players?.map(p => (
                                    <TableCell key={p.name}>
                                       <FormField
                                            control={form.control}
                                            name={`player_${q.id}.${teamSide}.${p.name}`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input
                                                          type="text"
                                                          className="min-w-[60px] text-center"
                                                          placeholder="-"
                                                          disabled={isSaving || isSettling || q.status === 'settled'}
                                                          {...field}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                         ))}
                    </TableBody>
                </Table>
                </div>
            </div>
        )
    };

    const TeamResultGrid = () => {
         return (
             <div className="space-y-2">
                <h4 className="font-semibold">Team Results</h4>
                <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-1/2">Question</TableHead>
                            <TableHead className="text-center">{match.teamA.name}</TableHead>
                            <TableHead className="text-center">{match.teamB.name}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {questions.map((q) => (
                            <TableRow key={q.id}>
                                <TableCell className="font-medium text-xs text-muted-foreground">{q.question}</TableCell>
                                <TableCell>
                                    <FormField
                                        control={form.control}
                                        name={`${q.id}.teamA`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                      type="text"
                                                      className="min-w-[60px] text-center"
                                                      placeholder="Result"
                                                      disabled={isSaving || isSettling || q.status === 'settled'}
                                                      {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell>
                                     <FormField
                                        control={form.control}
                                        name={`${q.id}.teamB`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                      type="text"
                                                      className="min-w-[60px] text-center"
                                                      placeholder="Result"
                                                      disabled={isSaving || isSettling || q.status === 'settled'}
                                                      {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                            </TableRow>
                         ))}
                    </TableBody>
                </Table>
                </div>
            </div>
        )
    };
    
    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
                <DialogContent className="sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Manage Q&amp;A for {match.teamA.name} vs {match.teamB.name}</DialogTitle>
                        <DialogDescription>
                           Enter and save the results for each question, then finalize to process payouts.
                        </DialogDescription>
                    </DialogHeader>
                    <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(handleSave)}>
                        <ScrollArea className="max-h-[60vh] overflow-y-auto p-1 mt-4">
                            <div className="space-y-6">
                            {questions.length > 0 ? (
                                    <div className="space-y-6">
                                        {match.isSpecialMatch && (
                                            <>
                                                <PlayerResultGrid team={match.teamA} teamSide="teamA" />
                                                <PlayerResultGrid team={match.teamB} teamSide="teamB" />
                                                <Separator /> 
                                            </>
                                        )}
                                        <TeamResultGrid />
                                    </div>
                            ) : (
                                    <p className='text-center text-muted-foreground p-8'>No questions found for this match.</p>
                            )}
                            </div>
                        </ScrollArea>
                        <DialogFooter className="mt-6 flex-col sm:flex-row items-center sm:justify-between w-full">
                        <Alert className="sm:max-w-xs text-left">
                                <Info className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                    Save results first, then Settle to pay winners. Payouts are irreversible.
                                </AlertDescription>
                        </Alert>
                        <div className="flex justify-end gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                            <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isSaving || isSettling}>Cancel</Button>
                            <Button type="submit" variant="outline" disabled={isSaving || isSettling || match.status === 'Finished' || !isAdmin}>
                                {isSaving ? 'Saving...' : 'Save Results'}
                            </Button>
                            <Button type="button" variant="destructive" onClick={handleSettle} disabled={isSaving || isSettling || match.status === 'Finished' || !hasActiveQuestions || !isAdmin}>
                                {isSettling ? 'Settling...' : (match.status === 'Finished' ? 'Match Settled' : 'Settle & Payout')}
                            </Button>
                        </div>
                    </DialogFooter>
                    </form>
                    </FormProvider>
                </DialogContent>
            </Dialog>
            <SettlementResultsDialog
                isOpen={isResultsDialogOpen}
                onClose={() => setIsResultsDialogOpen(false)}
                results={settlementResults}
            />
        </>
    );
}
