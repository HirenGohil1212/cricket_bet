import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMatches } from "@/app/actions/match.actions";
import { QandATabs } from "@/components/admin/q-and-a-tabs";

export default async function QandAPage() {
    const matches = await getMatches();
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Match Questions & Answers</CardTitle>
                <CardDescription>
                    Create and manage custom questions for upcoming matches.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <QandATabs matches={matches} />
            </CardContent>
        </Card>
    );
}
