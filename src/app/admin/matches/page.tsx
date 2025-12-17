
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchesTable } from "@/components/admin/matches-table";
import Link from 'next/link';
import { getMatches } from "@/app/actions/match.actions";
import { Skeleton } from "@/components/ui/skeleton";
import type { Match } from "@/lib/types";

function MatchesPageSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-4 w-48 mt-2" />
                    </div>
                    <Skeleton className="h-10 w-36" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </CardContent>
        </Card>
    )
}

export default function AdminMatchesPage() {
    const [matches, setMatches] = React.useState<Match[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchMatches = async () => {
            setIsLoading(true);
            const fetchedMatches = await getMatches();
            setMatches(fetchedMatches);
            setIsLoading(false);
        };
        fetchMatches();
    }, []);

    const handleMatchDeleted = (matchId: string) => {
        setMatches(currentMatches => currentMatches.filter(match => match.id !== matchId));
    };

    if (isLoading) {
        return <MatchesPageSkeleton />;
    }

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
                <MatchesTable matches={matches} onMatchDeleted={handleMatchDeleted} />
            </CardContent>
        </Card>
    );
}
