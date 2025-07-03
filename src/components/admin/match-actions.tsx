
"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteMatch } from "@/app/actions/match.actions";
import type { Match } from "@/lib/types";

interface MatchActionsProps {
    matchId: string;
    status: Match['status'];
}

export function MatchActions({ matchId, status }: MatchActionsProps) {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const isFinished = status === 'Finished';

    const handleDelete = async () => {
        setIsDeleting(true);
        const result = await deleteMatch(matchId);
        if (result.error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: result.error,
            });
        } else {
            toast({
                title: "Match Deleted",
                description: "The match has been successfully deleted.",
            });
        }
        setIsDeleting(false);
    };

    return (
        <AlertDialog>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    {isFinished ? (
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/matches/summary/${matchId}`} className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" />
                                View Summary
                            </Link>
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/matches/edit/${matchId}`} className="cursor-pointer">
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                        </DropdownMenuItem>
                    )}
                    <AlertDialogTrigger asChild>
                         <DropdownMenuItem 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10" 
                            onSelect={(e) => e.preventDefault()}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the match
                        and all associated betting data.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
