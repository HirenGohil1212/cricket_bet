import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMatchById } from "@/app/actions/match.actions";
import { EditMatchForm } from "@/components/admin/edit-match-form";
import { ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

interface EditMatchPageProps {
    params: {
        matchId: string;
    };
}

export default async function EditMatchPage({ params }: EditMatchPageProps) {
    const match = await getMatchById(params.matchId);

    if (!match) {
        return (
            <div className="flex items-center justify-center h-full">
                <Alert variant="destructive" className="max-w-lg">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Match Not Found</AlertTitle>
                    <AlertDescription>
                        The match you are trying to edit does not exist.
                         <Button variant="outline" size="sm" className="mt-4" asChild>
                            <Link href="/admin/matches">Back to Matches</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    return (
        <div>
            <div className="mb-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/matches">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Matches
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Edit Match</CardTitle>
                    <CardDescription>Update the details for the match below.</CardDescription>
                </CardHeader>
                <CardContent>
                    <EditMatchForm match={match} />
                </CardContent>
            </Card>
        </div>
    );
}
