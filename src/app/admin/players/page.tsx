
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddPlayerForm } from "@/components/admin/add-player-form";
import { getPlayers } from "@/app/actions/player.actions";
import { PlayersList } from "@/components/admin/players-list";

export default async function PlayersPage() {
    const players = await getPlayers();

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
                       <AddPlayerForm />
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
                        <PlayersList initialPlayers={players} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
