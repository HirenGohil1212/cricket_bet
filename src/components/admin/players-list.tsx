
"use client";

import { useState } from "react";
import Image from "next/image";
import type { Player, Sport } from "@/lib/types";
import { sports } from "@/lib/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { deletePlayer } from "@/app/actions/player.actions";

interface PlayersListProps {
  initialPlayers: Player[];
}

export function PlayersList({ initialPlayers }: PlayersListProps) {
  const { toast } = useToast();
  const [players, setPlayers] = useState(initialPlayers);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (playerId: string) => {
    setIsDeleting(true);
    const result = await deletePlayer(playerId);
    if (result.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
      toast({ title: "Player Deleted", description: result.success });
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    }
    setIsDeleting(false);
  };

  const PlayerItem = ({ player }: { player: Player }) => (
    <div className="flex items-center justify-between p-2 border rounded-lg">
      <div className="flex items-center gap-3">
        <Image src={player.imageUrl} alt={player.name} width={40} height={40} className="rounded-full object-cover h-10 w-10" />
        <span className="font-medium">{player.name}</span>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the player from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(player.id!)} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <Tabs defaultValue={sports[0]} className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto">
        {sports.map((sport) => (
          <TabsTrigger key={sport} value={sport}>{sport}</TabsTrigger>
        ))}
      </TabsList>
      {sports.map((sport) => (
        <TabsContent key={sport} value={sport} className="mt-4">
          <div className="space-y-3">
            {players.filter(p => p.sport === sport).length > 0 ? (
              players.filter(p => p.sport === sport).map(player => (
                <PlayerItem key={player.id} player={player} />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-10">No players found for {sport}.</p>
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
