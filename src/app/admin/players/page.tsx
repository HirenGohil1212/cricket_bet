
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddPlayerForm } from "@/components/admin/add-player-form";
import { getPlayers } from "@/app/actions/player.actions";
import { PlayersList } from "@/components/admin/players-list";
import type { Player } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

function PlayerPageSkeleton() {
    return (
        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle><Skeleton className="h-6 w-3/4" /></CardTitle>
                        <CardDescription>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3 mt-1" />
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-24 w-full" /></div>
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle><Skeleton className="h-6 w-1/2" /></CardTitle>
                        <CardDescription>
                            <Skeleton className="h-4 w-3/4" />
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function PlayersPage() {
    const [players, setPlayers] = React.useState<Player[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const loadPlayers = async () => {
            const fetchedPlayers = await getPlayers();
            setPlayers(fetchedPlayers);
            setIsLoading(false);
        }
        loadPlayers();
    }, [])

    const handlePlayerAdded = (newPlayer: Player) => {
        setPlayers(currentPlayers => [newPlayer, ...currentPlayers]);
    };
    
    const handlePlayerDeleted = (deletedPlayerId: string) => {
        setPlayers(currentPlayers => currentPlayers.filter(p => p.id !== deletedPlayerId));
    };

    if (isLoading) {
        return <PlayerPageSkeleton />;
    }

    return (
        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle>Add New Player</CardTitle>
                        <CardDescription>
                            Add a new player to the database. They can then be selected when creating a match.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <AddPlayerForm onPlayerAdded={handlePlayerAdded} />
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Players List</CardTitle>
                        <CardDescription>
                            View and manage all players in the database.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PlayersList initialPlayers={players} onPlayerDeleted={handlePlayerDeleted}/>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
