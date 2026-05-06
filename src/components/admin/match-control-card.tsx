
"use client";

import * as React from 'react';
import Image from 'next/image';
import type { Match, Player, Question } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateMatchControls } from '@/app/actions/match.actions';
import { getQuestionsForMatch } from '@/app/actions/qna.actions';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Users, Clock, HelpCircle } from 'lucide-react';
import { Countdown } from '../countdown';
import { Separator } from '../ui/separator';

interface MatchControlCardProps {
    match: Match;
    onUpdate: () => void;
}

type ControlState = {
    isSpecialMatch: boolean;
    teamABettingEnabled: boolean;
    teamBBettingEnabled: boolean;
    players: Record<string, { bettingEnabled: boolean }>;
    questions: Record<string, { teamABettingEnabled: boolean, teamBBettingEnabled: boolean }>;
};

function SettingToggle({ id, label, description, checked, onCheckedChange, disabled }: { id: string, label: string, description?: string, checked: boolean, onCheckedChange: (checked: boolean) => void, disabled?: boolean }) {
    return (
        <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
            <div className="space-y-0.5">
                <Label htmlFor={id} className="text-sm font-bold uppercase tracking-tight">{label}</Label>
                {description && <p className="text-[10px] text-muted-foreground uppercase font-black opacity-50">{description}</p>}
            </div>
            <Switch
                id={id}
                checked={checked}
                onCheckedChange={onCheckedChange}
                disabled={disabled}
            />
        </div>
    );
}


export function MatchControlCard({ match, onUpdate }: MatchControlCardProps) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    const [isLoadingQuestions, setIsLoadingQuestions] = React.useState(true);
    const [questions, setQuestions] = React.useState<Question[]>([]);

    const initialPlayersState = React.useMemo(() => {
        const state: Record<string, { bettingEnabled: boolean }> = {};
        match.teamA.players?.forEach(p => {
            state[p.name] = { bettingEnabled: p.bettingEnabled ?? true };
        });
        match.teamB.players?.forEach(p => {
            state[p.name] = { bettingEnabled: p.bettingEnabled ?? true };
        });
        return state;
    }, [match.teamA.players, match.teamB.players]);

    const [controls, setControls] = React.useState<ControlState>({
        isSpecialMatch: match.isSpecialMatch ?? false,
        teamABettingEnabled: (match as any).teamABettingEnabled ?? true,
        teamBBettingEnabled: (match as any).teamBBettingEnabled ?? true,
        players: initialPlayersState,
        questions: {},
    });

    React.useEffect(() => {
        setIsLoadingQuestions(true);
        getQuestionsForMatch(match.id).then(data => {
            setQuestions(data);
            const questionState: Record<string, { teamABettingEnabled: boolean, teamBBettingEnabled: boolean }> = {};
            data.forEach(q => {
                questionState[q.id] = {
                    teamABettingEnabled: q.teamABettingEnabled ?? true,
                    teamBBettingEnabled: q.teamBBettingEnabled ?? true,
                };
            });
            setControls(prev => ({ ...prev, questions: questionState }));
            setIsLoadingQuestions(false);
        });
    }, [match.id]);

    const handlePlayerToggle = (playerName: string, checked: boolean) => {
        setControls(prev => ({
            ...prev,
            players: {
                ...prev.players,
                [playerName]: { bettingEnabled: checked }
            }
        }));
    };

    const handleQuestionToggle = (questionId: string, team: 'A' | 'B', checked: boolean) => {
        setControls(prev => ({
            ...prev,
            questions: {
                ...prev.questions,
                [questionId]: {
                    ...prev.questions[questionId],
                    [team === 'A' ? 'teamABettingEnabled' : 'teamBBettingEnabled']: checked
                }
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const playerUpdates = Object.entries(controls.players).map(([name, { bettingEnabled }]) => ({ name, bettingEnabled }));
        const questionUpdates = Object.entries(controls.questions).map(([id, settings]) => ({ id, ...settings }));
        
        const payload = {
            isSpecialMatch: controls.isSpecialMatch,
            teamABettingEnabled: controls.teamABettingEnabled,
            teamBBettingEnabled: controls.teamBBettingEnabled,
            players: playerUpdates,
            questions: questionUpdates,
        };

        const result = await updateMatchControls(match.id, payload);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
        } else {
            toast({ title: 'Success', description: 'Match controls updated.' });
            onUpdate();
        }
        setIsSaving(false);
    };

    return (
        <Card className="bg-secondary border-primary/20">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0 border border-primary/20 bg-white/5">
                        <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={40} height={40} className="object-cover" />
                    </div>
                    <CardTitle className="text-lg font-headline italic uppercase">{match.teamA.name} vs {match.teamB.name}</CardTitle>
                    <div className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0 border border-primary/20 bg-white/5">
                        <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={40} height={40} className="object-cover" />
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    {match.status === 'Upcoming' && (
                        <div className="text-center bg-primary/10 text-primary p-2 rounded-md w-full sm:w-auto">
                            <p className="text-[10px] font-black flex items-center justify-center gap-1 uppercase tracking-widest"><Clock className="h-3 w-3"/> STARTS IN:</p>
                            <Countdown targetDate={new Date(match.startTime)} onEnd={() => onUpdate()} />
                        </div>
                    )}
                    <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto flex-shrink-0 bg-primary hover:bg-primary/80 text-primary-foreground font-black uppercase">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save All Controls
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <SettingToggle
                        id={`teamA-${match.id}`}
                        label={`${match.teamA.name} Global`}
                        description="Global Team Toggle"
                        checked={controls.teamABettingEnabled}
                        onCheckedChange={(checked) => setControls(p => ({...p, teamABettingEnabled: checked}))}
                        disabled={isSaving}
                    />
                     <SettingToggle
                        id={`teamB-${match.id}`}
                        label={`${match.teamB.name} Global`}
                        description="Global Team Toggle"
                        checked={controls.teamBBettingEnabled}
                        onCheckedChange={(checked) => setControls(p => ({...p, teamBBettingEnabled: checked}))}
                        disabled={isSaving}
                    />
                     <SettingToggle
                        id={`special-${match.id}`}
                        label="Special Match"
                        description="Toggle Player Bets Section"
                        checked={controls.isSpecialMatch}
                        onCheckedChange={(checked) => setControls(p => ({...p, isSpecialMatch: checked}))}
                        disabled={isSaving}
                    />
                </div>
                
                <Accordion type="multiple" className="space-y-4">
                    {/* Question Controls */}
                    <AccordionItem value="questions" className="border rounded-lg overflow-hidden bg-background">
                         <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:bg-muted/50">
                            <div className="flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-primary" />
                                <h3 className="font-bold uppercase tracking-tight">Question-Level Controls</h3>
                            </div>
                         </AccordionTrigger>
                         <AccordionContent className="p-4 pt-4">
                            {isLoadingQuestions ? (
                                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
                            ) : questions.length > 0 ? (
                                <div className="space-y-6">
                                    {questions.map((q) => (
                                        <div key={q.id} className="space-y-2">
                                            <p className="text-xs font-black text-primary uppercase tracking-widest leading-none border-l-2 border-primary pl-2 mb-3">
                                                {q.question} <span className="opacity-50 ml-1">({q.type})</span>
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <SettingToggle
                                                    id={`q-teamA-${q.id}`}
                                                    label={`${match.teamA.name}`}
                                                    description="Individual question side"
                                                    checked={controls.questions[q.id]?.teamABettingEnabled ?? true}
                                                    onCheckedChange={(checked) => handleQuestionToggle(q.id, 'A', checked)}
                                                    disabled={isSaving}
                                                />
                                                <SettingToggle
                                                    id={`q-teamB-${q.id}`}
                                                    label={`${match.teamB.name}`}
                                                    description="Individual question side"
                                                    checked={controls.questions[q.id]?.teamBBettingEnabled ?? true}
                                                    onCheckedChange={(checked) => handleQuestionToggle(q.id, 'B', checked)}
                                                    disabled={isSaving}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-sm text-muted-foreground py-4 uppercase font-bold tracking-widest opacity-50">No questions found for this match.</p>
                            )}
                         </AccordionContent>
                    </AccordionItem>

                    {/* Individual Player Controls */}
                    <AccordionItem value="players" className="border rounded-lg overflow-hidden bg-background" disabled={!controls.isSpecialMatch}>
                         <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:bg-muted/50">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                <h3 className="font-bold uppercase tracking-tight">Individual Player Controls</h3>
                            </div>
                         </AccordionTrigger>
                         <AccordionContent className="p-4 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.keys(controls.players).length > 0 ? (
                                    Object.entries(controls.players).map(([playerName, { bettingEnabled }]) => (
                                        <SettingToggle
                                            key={playerName}
                                            id={`${playerName}-${match.id}`}
                                            label={playerName}
                                            checked={bettingEnabled}
                                            onCheckedChange={(checked) => handlePlayerToggle(playerName, checked)}
                                            disabled={isSaving}
                                        />
                                    ))
                                ) : (
                                    <p className="col-span-full text-center text-sm text-muted-foreground py-4 uppercase font-bold tracking-widest opacity-50">No players found for this match.</p>
                                )}
                            </div>
                         </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}
