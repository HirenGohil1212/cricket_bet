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
import { SettlementResultsDialog } from './settlement-results-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/auth-context';
import { Separator } from '../ui/separator';

type ResultState = Record<string, any>;

const PlayerResultsGrid = ({ match, teamName, players, questions, results, onInputChange, disabled }: any) => {
    if (!players || players.length === 0) return null;
    
    return (
        <div className="space-y-2">
            <h4 className="font-semibold">{teamName} Player Results</h4>
            <div className="rounded-md border p-2">
                <div 
                    className="grid items-center gap-x-1 gap-y-2"
                    style={{ gridTemplateColumns: `minmax(80px, auto) repeat(${players.length}, 1fr)` }}
                >
                    {/* Header Row */}
                    <div />
                    {players.map((p: any) => (
                        <div key={p.name} className="text-xs font-medium text-center truncate" title={p.name}>
                            {p.name}
                        </div>
                    ))}
                    
                    {/* Data Rows */}
                    {questions.map((q: any) => (
                        <React.Fragment key={q.id}>
                            <div className="text-xs text-muted-foreground truncate pr-2" title={q.question}>{q.question}</div>
                            {players.map((p: any) => (
                                <Input
                                    key={p.name}
                                    type="text"
                                    className="w-10 h-10 text-center px-1 text-sm mx-auto"
                                    placeholder="-"
                                    disabled={disabled}
                                    value={results[`player_${q.id}`]?.[teamName === match.teamA.name ? 'teamA' : 'teamB']?.[p.name] || ''}
                                    onChange={(e) => onInputChange(`player_${q.id}.${teamName === match.teamA.name ? 'teamA' : 'teamB'}.${p.name}`, e.target.value)}
                                />
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};


export function ManageQnaDialog({ match, questions, isOpen, onClose }: { match: Match; questions: Question[]; isOpen: boolean; onClose: (shouldRefresh: boolean) => void; }) {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const [isSaving, setIsSaving] = React.useState(false);
    const [isSettling, setIsSettling] = React.useState(false);
    const [results, setResults] = React.useState<ResultState>({});
    
    const [settlementResults, setSettlementResults] = React.useState<{ winners: Winner[]; totalBetsProcessed: number; } | null>(null);
    const [isResultsDialogOpen, setIsResultsDialogOpen] = React.useState(false);

    const isAdmin = userProfile?.role === 'admin';

    React.useEffect(() => {
        if (isOpen) {
            const initialResults: ResultState = {};
            questions.forEach(q => {
                // Initialize team results
                initialResults[q.id] = q.result || { teamA: '', teamB: '' };

                // Initialize player results if special match
                if (match.isSpecialMatch) {
                    const playerResultObject: Record<string, Record<string, string>> = { teamA: {}, teamB: {} };
                    match.teamA.players?.forEach(p => {
                        playerResultObject.teamA[p.name] = (q.playerResult as any)?.teamA?.[p.name] || '';
                    });
                    match.teamB.players?.forEach(p => {
                        playerResultObject.teamB[p.name] = (q.playerResult as any)?.teamB?.[p.name] || '';
                    });
                    initialResults[`player_${q.id}`] = playerResultObject;
                }
            });
            setResults(initialResults);
        }
    }, [isOpen, questions, match]);
    
    const handleInputChange = (path: string, value: string) => {
        setResults(prev => {
            const newResults = JSON.parse(JSON.stringify(prev)); // Deep copy
            const keys = path.split('.');
            let current = newResults;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                  // If a nested path doesn't exist, create it.
                  // This is crucial for player results which are nested two levels deep.
                  current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newResults;
        });
    };
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin) {
            toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to perform this action.' });
            return;
        }
        setIsSaving(true);
        
        const resultsToSave: Record<string, { teamA: string; teamB: string }> = {};
        const playerResultsToSave: Record<string, any> = {};

        Object.keys(results).forEach(key => {
            if (key.startsWith('player_')) {
                const questionId = key.substring(7);
                playerResultsToSave[questionId] = results[key];
            } else {
                resultsToSave[key] = results[key] as { teamA: string; teamB: string };
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
    
    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
                <DialogContent className="sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Manage Results for {match.teamA.name} vs {match.teamB.name}</DialogTitle>
                        <DialogDescription>
                           Enter and save the results for each question, then finalize to process payouts.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave}>
                        <ScrollArea className="max-h-[60vh] overflow-y-auto p-1 mt-4">
                            <div className="space-y-6">
                            {questions.length > 0 ? (
                                    <div className="space-y-6">
                                        {match.isSpecialMatch && (
                                            <>
                                                <PlayerResultsGrid 
                                                    match={match}
                                                    teamName={match.teamA.name}
                                                    players={match.teamA.players}
                                                    questions={questions}
                                                    results={results}
                                                    onInputChange={handleInputChange}
                                                    disabled={isSaving || isSettling || match.status === 'Finished'}
                                                />
                                                <PlayerResultsGrid 
                                                    match={match}
                                                    teamName={match.teamB.name}
                                                    players={match.teamB.players}
                                                    questions={questions}
                                                    results={results}
                                                    onInputChange={handleInputChange}
                                                    disabled={isSaving || isSettling || match.status === 'Finished'}
                                                />
                                                <Separator />
                                            </>
                                        )}
                                        
                                        {/* Team Result Grid */}
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
                                                                <Input 
                                                                    type="text" 
                                                                    className="min-w-[60px] max-w-[120px] mx-auto text-center" 
                                                                    placeholder="Result" 
                                                                    disabled={isSaving || isSettling || q.status === 'settled'} 
                                                                    value={results[q.id]?.teamA || ''}
                                                                    onChange={(e) => handleInputChange(`${q.id}.teamA`, e.target.value)}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input 
                                                                    type="text" 
                                                                    className="min-w-[60px] max-w-[120px] mx-auto text-center" 
                                                                    placeholder="Result" 
                                                                    disabled={isSaving || isSettling || q.status === 'settled'} 
                                                                    value={results[q.id]?.teamB || ''}
                                                                    onChange={(e) => handleInputChange(`${q.id}.teamB`, e.target.value)}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            </div>
                                        </div>
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
                                    Save results first, then Publish to process payouts. This action is irreversible.
                                </AlertDescription>
                        </Alert>
                        <div className="flex justify-end gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                            <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isSaving || isSettling}>Cancel</Button>
                            <Button type="submit" variant="outline" disabled={isSaving || isSettling || match.status === 'Finished' || !isAdmin}>
                                {isSaving ? 'Saving...' : 'Save Results'}
                            </Button>
                            <Button type="button" onClick={handleSettle} disabled={isSaving || isSettling || match.status === 'Finished' || !hasActiveQuestions || !isAdmin}>
                                {isSettling ? 'Publishing...' : (match.status === 'Finished' ? 'Match Settled' : 'Publish Result')}
                            </Button>
                        </div>
                    </DialogFooter>
                    </form>
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
