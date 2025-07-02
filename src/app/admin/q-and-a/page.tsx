import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMatches } from "@/app/actions/match.actions";
import { QandADashboard } from "@/components/admin/q-and-a-dashboard";
import { getQuestionTemplates } from "@/app/actions/qna.actions";

export default async function QandAPage() {
    const matches = await getMatches();
    const templates = await getQuestionTemplates();
    
    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <CardTitle>Match Questions & Answers</CardTitle>
                <CardDescription>
                    Manage question templates for each sport, apply them to upcoming matches, and set results after a match is complete.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
                <QandADashboard matches={matches} initialTemplates={templates} />
            </CardContent>
        </Card>
    );
}
