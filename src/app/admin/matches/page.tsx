import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchesTable } from "@/components/admin/matches-table";
import Link from 'next/link';
import { getMatches } from "@/app/actions/match.actions";

export default async function AdminMatchesPage() {
    const matches = await getMatches();

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Matches</CardTitle>
                        <CardDescription>Manage your games and see their status.</CardDescription>
                    </div>
                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/admin/matches/add">Add New Match</Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <MatchesTable matches={matches} />
            </CardContent>
        </Card>
    );
}
