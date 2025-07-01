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
                                <div className="flex items-center gap-2">
                                    <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={24} height={24} className="rounded-sm object-contain" />
                                    <span>{match.teamA.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">vs</span>
                                <div className="flex items-center gap-2">
                                     <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={24} height={24} className="rounded-sm object-contain" />
                                    <span>{match.teamB.name}</span>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>{match.sport}</TableCell>
                        <TableCell className="whitespace-nowrap">{new Date(match.startTime).toLocaleString()}</TableCell>
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
