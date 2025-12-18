
"use client";

import * as React from 'react';
import Image from 'next/image';
import type { Match, Player } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateMatchControls } from '@/app/actions/match.actions';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Users, Clock } from 'lucide-react';
import { Countdown } from '../countdown';

interface MatchControlCardProps {
    match: Match;
    onUpdate: () => void;
}

type ControlState = {
    isSpecialMatch: boolean;
    teamABettingEnabled: boolean;
    teamBBettingEnabled: boolean;
    players: Record<string, { bettingEnabled: boolean }>;
};

function SettingToggle({ id, label, description, checked, onCheckedChange, disabled }: { id: string, label: string, description?: string, checked: boolean, onCheckedChange: (checked: boolean) => void, disabled?: boolean }) {
    return (
        <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
            <div className="space-y-0.5">
                <Label htmlFor={id} className="text-base font-medium">{label}</Label>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
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
    });

    const handlePlayerToggle = (playerName: string, checked: boolean) => {
        setControls(prev => ({
            ...prev,
            players: {
                ...prev.players,
                [playerName]: { bettingEnabled: checked }
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const playerUpdates = Object.entries(controls.players).map(([name, { bettingEnabled }]) => ({ name, bettingEnabled }));
        
        const payload = {
            isSpecialMatch: controls.isSpecialMatch,
            teamABettingEnabled: controls.teamABettingEnabled,
            teamBBettingEnabled: controls.teamBBettingEnabled,
            players: playerUpdates
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
        <Card className="bg-secondary">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0">
                        <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={40} height={40} className="object-cover" />
                    </div>
                    <CardTitle className="text-lg text-center sm:text-left">{match.teamA.name} vs {match.teamB.name}</CardTitle>
                    <div className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0">
                        <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={40} height={40} className="object-cover" />
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    {match.status === 'Upcoming' && (
                        <div className="text-center bg-accent/10 text-accent p-2 rounded-md w-full sm:w-auto">
                            <p className="text-xs font-semibold flex items-center justify-center gap-1"><Clock className="h-3 w-3"/> Starts in:</p>
                            <Countdown targetDate={new Date(match.startTime)} onEnd={() => onUpdate()} />
                        </div>
                    )}
                    <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto flex-shrink-0">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <SettingToggle
                        id={`teamA-${match.id}`}
                        label={`${match.teamA.name} Betting`}
                        description="Toggle all bets for this team"
                        checked={controls.teamABettingEnabled}
                        onCheckedChange={(checked) => setControls(p => ({...p, teamABettingEnabled: checked}))}
                        disabled={isSaving}
                    />
                     <SettingToggle
                        id={`teamB-${match.id}`}
                        label={`${match.teamB.name} Betting`}
                        description="Toggle all bets for this team"
                        checked={controls.teamBBettingEnabled}
                        onCheckedChange={(checked) => setControls(p => ({...p, teamBBettingEnabled: checked}))}
                        disabled={isSaving}
                    />
                     <SettingToggle
                        id={`special-${match.id}`}
                        label="Special Match"
                        description="Enable/disable player-specific bets"
                        checked={controls.isSpecialMatch}
                        onCheckedChange={(checked) => setControls(p => ({...p, isSpecialMatch: checked}))}
                        disabled={isSaving}
                    />
                </div>
                
                <Accordion type="single" collapsible disabled={!controls.isSpecialMatch}>
                    <AccordionItem value="players" className="border rounded-lg overflow-hidden bg-background">
                         <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:bg-muted/50">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                <h3 className="font-semibold">Individual Player Controls</h3>
                            </div>
                         </AccordionTrigger>
                         <AccordionContent className="p-4 pt-0">
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
                                    <p className="col-span-full text-center text-sm text-muted-foreground py-4">No players found for this match.</p>
                                )}
                            </div>
                         </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}
