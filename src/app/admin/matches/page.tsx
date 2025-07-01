import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockMatches } from "@/lib/data";
import { MatchesTable } from "@/components/admin/matches-table";
import Link from 'next/link';

export default function AdminMatchesPage() {
    // In a real app, this would be a Firestore query that is paginated and sorted.
    const matches = mockMatches;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Matches</CardTitle>
                        <CardDescription>Manage your games and see their status.</CardDescription>
                    </div>
                    <Button asChild>
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
