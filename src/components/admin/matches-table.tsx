
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
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface MatchesTableProps {
    matches: Match[];
    onMatchDeleted: (matchId: string) => void;
}

export function MatchesTable({ matches, onMatchDeleted }: MatchesTableProps) {
    const getStatusVariant = (status: Match['status']) => {
        switch (status) {
            case "Live": return "destructive";
            case "Finished": return "default";
            case "Upcoming": return "secondary";
            case "Cancelled": return "outline";
            default: return "outline";
        }
    };

    return (
        <>
            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {matches.map((match) => (
                    <Card key={match.id}>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center">
                                            <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={24} height={24} className="object-cover" />
                                        </div>
                                        <span className="font-semibold">{match.teamA.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center">
                                            <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={24} height={24} className="object-cover" />
                                        </div>
                                        <span className="font-semibold">{match.teamB.name}</span>
                                    </div>
                                </div>
                                <MatchActions matchId={match.id} status={match.status} onMatchDeleted={onMatchDeleted} />
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground text-xs">Sport</p>
                                    <p className="font-medium">{match.sport}</p>
                                </div>
                                 <div className="text-right">
                                    <p className="text-muted-foreground text-xs">Status</p>
                                    <Badge variant={getStatusVariant(match.status)}>{match.status}</Badge>
                                </div>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Start Time</p>
                                <p className="font-medium">{new Date(match.startTime).toLocaleString()}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Desktop View */}
            <Table className="hidden md:table">
                <TableHeader>
                    <TableRow>
                        <TableHead>Match</TableHead>
                        <TableHead className="hidden md:table-cell">Sport</TableHead>
                        <TableHead className="hidden lg:table-cell">Start Time</TableHead>
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
                                        <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center">
                                          <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={24} height={24} className="object-cover" />
                                        </div>
                                        <span className="truncate">{match.teamA.name}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">vs</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center">
                                          <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={24} height={24} className="object-cover" />
                                        </div>
                                        <span className="truncate">{match.teamB.name}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{match.sport}</TableCell>
                            <TableCell className="hidden lg:table-cell whitespace-nowrap">{new Date(match.startTime).toLocaleString()}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(match.status)}>{match.status}</Badge>
                            </TableCell>
                            <TableCell>
                                <MatchActions matchId={match.id} status={match.status} onMatchDeleted={onMatchDeleted} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </>
    );
}
