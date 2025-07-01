"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Match } from "@/lib/types";
import Image from 'next/image';
import { MatchActions } from "@/components/admin/match-actions";

interface MatchesTableProps {
    matches: Match[];
}

export function MatchesTable({ matches }: MatchesTableProps) {
    const getStatusVariant = (status: Match['status']) => {
        switch (status) {
            case "Live": return "destructive";
            case "Finished": return "default";
            case "Upcoming": return "secondary";
            default: return "outline";
        }
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Match</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                        <span className="sr-only">Actions</span>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {matches.map((match) => (
                    <TableRow key={match.id}>
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    <Image src={match.teamA.logoUrl || 'https://placehold.co/40x40.png'} alt={match.teamA.name} width={24} height={24} className="rounded-full border" data-ai-hint="logo" />
                                     <Image src={match.teamB.logoUrl || 'https://placehold.co/40x40.png'} alt={match.teamB.name} width={24} height={24} className="rounded-full border" data-ai-hint="logo" />
                                </div>
                                <span>{match.teamA.name} vs {match.teamB.name}</span>
                            </div>
                        </TableCell>
                        <TableCell>{match.sport}</TableCell>
                        <TableCell>{new Date(match.startTime).toLocaleString()}</TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(match.status)}>{match.status}</Badge>
                        </TableCell>
                        <TableCell>
                            <MatchActions matchId={match.id} />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
