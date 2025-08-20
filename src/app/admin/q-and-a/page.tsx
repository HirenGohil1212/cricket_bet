import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMatches } from "@/app/actions/match.actions";
import { QandADashboard } from "@/components/admin/q-and-a-dashboard";

export default async function QandAPage() {
    const matches = await getMatches();
    
    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <CardTitle>Match Results &amp; Settlement</CardTitle>
                <CardDescription>
                    Select a match to enter results for its questions and settle the bets.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
                <QandADashboard matches={matches} />
            </CardContent>
        </Card>
    );
}
