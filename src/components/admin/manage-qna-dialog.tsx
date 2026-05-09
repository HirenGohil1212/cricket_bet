
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Match, Question } from '@/lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { saveSingleQuestionResults, settleSingleQuestion } from '@/app/actions/qna.actions';
import { Alert, AlertDescription } from '../ui/alert';
import { Info, CheckCircle2, Save, Send, ShieldAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/auth-context';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

type ResultState = Record<string, any>;

const QuestionActions = ({ 
    onSave, 
    onPublish, 
    isSaving, 
    isSettling, 
    isFullySettled,
    disabled 
}: { 
    onSave: () => void, 
    onPublish: () => void, 
    isSaving: boolean, 
    isSettling: boolean, 
    isFullySettled: boolean,
    disabled: boolean 
}) => {
    if (isFullySettled) {
        return (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 font-black text-[9px] px-3 py-1">
                <CheckCircle2 className="h-3 w-3 mr-1" /> SETTLED
            </Badge>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={onSave} 
                disabled={isSaving || isSettling || disabled}
                className="h-8 px-2 text-xs font-bold text-muted-foreground hover:text-white"
            >
                {isSaving ? <Save className="h-3 w-3 animate-pulse" /> : <Save className="h-3 w-3 mr-1" />}
                Save
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={onPublish} 
                disabled={isSaving || isSettling || disabled}
                className="h-8 px-2 text-[10px] font-black uppercase tracking-tighter border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
            >
                {isSettling ? <Send className="h-3 w-3 animate-pulse" /> : <Send className="h-3 w-3 mr-1" />}
                Publish
            </Button>
        </div>
    );
};

const PlayerResultsGrid = ({ match, teamName, players, questions, results, onInputChange, onSave, onPublish, actionStates, disabled }: any) => {
    if (!players || players.length === 0) return null;
    
    const playerSpecificQuestions = questions.filter((q: any) => q.type === 'player');
    if (playerSpecificQuestions.length === 0) return null;
    
    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-primary/80 uppercase text-xs tracking-[0.2em] border-l-2 border-primary pl-3">{teamName} Player Results</h4>
            {playerSpecificQuestions.map((q: any) => {
                const isSideSettled = (teamName === match.teamA.name ? q.teamABettingEnabled === false : q.teamBBettingEnabled === false);
                const isFullySettled = q.status === 'settled';
                const isDisabled = isSideSettled || isFullySettled || disabled;

                return (
                    <div key={q.id} className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-white/5">
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-black uppercase text-white/80">{q.question}</span>
                                {isSideSettled && !isFullySettled && (
                                    <Badge variant="outline" className="text-[8px] bg-blue-500/10 text-blue-400 border-blue-500/20">PARTIAL SETTLED</Badge>
                                )}
                            </div>
                            <QuestionActions 
                                onSave={() => onSave(q.id, 'player')}
                                onPublish={() => onPublish(q.id, 'player')}
                                isSaving={actionStates[q.id]?.isSaving}
                                isSettling={actionStates[q.id]?.isSettling}
                                isFullySettled={isFullySettled}
                                disabled={isDisabled}
                            />
                        </div>
                        <div className="p-4">
                            <div className="flex flex-wrap gap-4">
                                {players.map((p: any) => (
                                    <div key={p.name} className="flex flex-col items-center gap-1.5 min-w-[70px]">
                                        <span className="text-[9px] font-black uppercase text-muted-foreground truncate w-full text-center" title={p.name}>
                                            {p.name.split(' ')[0]}
                                        </span>
                                        <Input
                                            type="text"
                                            className="w-12 h-10 text-center px-1 text-sm bg-background/50 border-white/10 focus-visible:border-primary/50 focus-visible:ring-0 font-bold"
                                            placeholder="-"
                                            disabled={isDisabled}
                                            value={results[`player_${q.id}`]?.[teamName === match.teamA.name ? 'teamA' : 'teamB']?.[p.name] || ''}
                                            onChange={(e) => onInputChange(`player_${q.id}.${teamName === match.teamA.name ? 'teamA' : 'teamB'}.${p.name}`, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


export function ManageQnaDialog({ match, questions, isOpen, onClose }: { match: Match; questions: Question[]; isOpen: boolean; onClose: (shouldRefresh: boolean) => void; }) {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const [results, setResults] = React.useState<ResultState>({});
    const [actionStates, setActionStates] = React.useState<Record<string, { isSaving: boolean, isSettling: boolean }>>({});

    const isAdmin = userProfile?.role === 'admin';

    React.useEffect(() => {
        if (isOpen) {
            const initialResults: ResultState = {};
            const initialActions: any = {};
            questions.forEach(q => {
                initialResults[q.id] = q.result || { teamA: '', teamB: '' };
                initialActions[q.id] = { isSaving: false, isSettling: false };

                const playerResultObject: Record<string, Record<string, string>> = { teamA: {}, teamB: {} };
                match.teamA.players?.forEach(p => {
                    playerResultObject.teamA[p.name] = (q.playerResult as any)?.teamA?.[p.name] || '';
                });
                match.teamB.players?.forEach(p => {
                    playerResultObject.teamB[p.name] = (q.playerResult as any)?.teamB?.[p.name] || '';
                });
                initialResults[`player_${q.id}`] = playerResultObject;
            });
            setResults(initialResults);
            setActionStates(initialActions);
        }
    }, [isOpen, questions, match]);
    
    const handleInputChange = (path: string, value: string) => {
        setResults(prev => {
            const newResults = JSON.parse(JSON.stringify(prev));
            const keys = path.split('.');
            let current = newResults;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newResults;
        });
    };

    const handleSingleSave = async (qId: string, type: 'qna' | 'player') => {
        if (!isAdmin) return;
        setActionStates(p => ({ ...p, [qId]: { ...p[qId], isSaving: true }}));
        
        let res = type === 'qna' ? results[qId] : undefined;
        let pRes = type === 'player' ? results[`player_${qId}`] : undefined;

        const actionResult = await saveSingleQuestionResults(match.id, qId, res, pRes);
        if (actionResult.error) toast({ variant: 'destructive', title: 'Error', description: actionResult.error });
        else toast({ title: 'Success', description: 'Results saved as draft.' });

        setActionStates(p => ({ ...p, [qId]: { ...p[qId], isSaving: false }}));
    };

    const handleSinglePublish = async (qId: string, type: 'qna' | 'player') => {
        if (!isAdmin) return;
        setActionStates(p => ({ ...p, [qId]: { ...p[qId], isSettling: true }}));

        let res = type === 'qna' ? results[qId] : undefined;
        let pRes = type === 'player' ? results[`player_${qId}`] : undefined;

        const actionResult = await settleSingleQuestion(match.id, qId, type, res, pRes);
        if (actionResult.error) toast({ variant: 'destructive', title: 'Error', description: actionResult.error });
        else {
            toast({ title: 'Published!', description: actionResult.success });
            onClose(true);
        }
        setActionStates(p => ({ ...p, [qId]: { ...p[qId], isSettling: false }}));
    };
    
    const teamQuestions = questions.filter(q => q.type === 'qna' || !q.type);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
            <DialogContent className="sm:max-w-5xl bg-[#0a140f] border-none text-foreground">
                <DialogHeader>
                    <DialogTitle className="text-primary font-headline text-2xl uppercase italic">Manage Results for {match.teamA.name} vs {match.teamB.name}</DialogTitle>
                    <DialogDescription className="text-muted-foreground/60 uppercase text-[10px] font-bold tracking-widest">
                       Publish results individually. Empty sides will remain open for betting.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[70vh] overflow-y-auto pr-4 mt-4">
                    <div className="space-y-10 pb-4">
                        {teamQuestions.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="font-black text-primary uppercase text-xs tracking-[0.2em] border-l-2 border-primary pl-3">Team Results</h4>
                                <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-white/5">
                                            <TableRow className="border-white/10 hover:bg-transparent">
                                                <TableHead className="w-1/3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Question</TableHead>
                                                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-primary">{match.teamA.name}</TableHead>
                                                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-primary">{match.teamB.name}</TableHead>
                                                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {teamQuestions.map((q) => {
                                                const isA_Settled = q.teamABettingEnabled === false;
                                                const isB_Settled = q.teamBBettingEnabled === false;
                                                const isFullySettled = q.status === 'settled';

                                                return (
                                                    <TableRow key={q.id} className="border-white/5 hover:bg-white/[0.02]">
                                                        <TableCell className="font-bold text-[11px] text-white/80 uppercase tracking-tight">
                                                            {q.question}
                                                            {(!isFullySettled && (isA_Settled || isB_Settled)) && (
                                                                <span className="ml-2 text-[8px] text-blue-400 opacity-60">(Partial)</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1 items-center">
                                                                <Input 
                                                                    type="text" 
                                                                    className="min-w-[60px] max-w-[120px] mx-auto text-center h-10 bg-background/50 border-white/10 focus-visible:border-primary/50 focus-visible:ring-0 font-bold" 
                                                                    placeholder="---" 
                                                                    disabled={isA_Settled || isFullySettled} 
                                                                    value={results[q.id]?.teamA || ''}
                                                                    onChange={(e) => handleInputChange(`${q.id}.teamA`, e.target.value)}
                                                                />
                                                                {isA_Settled && !isFullySettled && <span className="text-[7px] font-black uppercase text-green-500">PUBLISHED</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1 items-center">
                                                                <Input 
                                                                    type="text" 
                                                                    className="min-w-[60px] max-w-[120px] mx-auto text-center h-10 bg-background/50 border-white/10 focus-visible:border-primary/50 focus-visible:ring-0 font-bold" 
                                                                    placeholder="---" 
                                                                    disabled={isB_Settled || isFullySettled} 
                                                                    value={results[q.id]?.teamB || ''}
                                                                    onChange={(e) => handleInputChange(`${q.id}.teamB`, e.target.value)}
                                                                />
                                                                {isB_Settled && !isFullySettled && <span className="text-[7px] font-black uppercase text-green-500">PUBLISHED</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <QuestionActions 
                                                                onSave={() => handleSingleSave(q.id, 'qna')}
                                                                onPublish={() => handleSinglePublish(q.id, 'qna')}
                                                                isSaving={actionStates[q.id]?.isSaving}
                                                                isSettling={actionStates[q.id]?.isSettling}
                                                                isFullySettled={isFullySettled}
                                                                disabled={!isAdmin}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {match.isSpecialMatch && (
                            <div className="space-y-8">
                                <PlayerResultsGrid 
                                    match={match}
                                    teamName={match.teamA.name}
                                    players={match.teamA.players}
                                    questions={questions}
                                    results={results}
                                    onInputChange={handleInputChange}
                                    onSave={handleSingleSave}
                                    onPublish={handleSinglePublish}
                                    actionStates={actionStates}
                                    disabled={!isAdmin}
                                />
                                <PlayerResultsGrid 
                                    match={match}
                                    teamName={match.teamB.name}
                                    players={match.teamB.players}
                                    questions={questions}
                                    results={results}
                                    onInputChange={handleInputChange}
                                    onSave={handleSingleSave}
                                    onPublish={handleSinglePublish}
                                    actionStates={actionStates}
                                    disabled={!isAdmin}
                                />
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="mt-8 flex-col sm:flex-row items-center sm:justify-between w-full gap-4 border-t border-white/5 pt-6">
                    <Alert className="sm:max-w-md text-left bg-primary/5 border-primary/20">
                        <ShieldAlert className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-[10px] font-bold uppercase tracking-tight text-primary/80">
                            You can publish Team A result separately. This will suspend betting for Team A but keep Team B open.
                        </AlertDescription>
                    </Alert>
                    <div className="flex justify-end gap-3 w-full sm:w-auto">
                        <Button type="button" variant="ghost" onClick={() => onClose(false)} className="font-bold uppercase text-xs">Close Lobby</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

