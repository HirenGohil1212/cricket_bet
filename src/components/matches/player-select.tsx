
"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PlayerSelectProps {
  players: Player[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function PlayerSelect({ players, value, onValueChange, placeholder, className }: PlayerSelectProps) {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {players.length > 0 ? players.map((player) => (
          <SelectItem key={player.name} value={player.name}>
            <span className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={player.imageUrl} alt={player.name} />
                <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>{player.name}</span>
            </span>
          </SelectItem>
        )) : (
          <div className="p-2 text-sm text-muted-foreground text-center">No players available</div>
        )}
      </SelectContent>
    </Select>
  );
}
