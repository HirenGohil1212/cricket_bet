
"use client";

import { useState, useEffect } from "react";
import type { DummyUser } from "@/lib/types";
import { sports } from "@/lib/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trash2, User } from "lucide-react";
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
import { deleteDummyUser } from "@/app/actions/dummy-user.actions";
import { SportIcon } from "../icons";

interface DummyUsersListProps {
  initialDummyUsers: DummyUser[];
  onDummyUserDeleted: (dummyUserId: string) => void;
}

export function DummyUsersList({ initialDummyUsers, onDummyUserDeleted }: DummyUsersListProps) {
  const { toast } = useToast();
  const [dummyUsers, setDummyUsers] = useState(initialDummyUsers);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  useEffect(() => {
    setDummyUsers(initialDummyUsers);
  }, [initialDummyUsers]);

  const handleDelete = async (dummyUserId: string) => {
    setIsDeleting(dummyUserId);
    const result = await deleteDummyUser(dummyUserId);
    if (result.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
      toast({ title: "House Account Deleted", description: result.success });
      onDummyUserDeleted(dummyUserId);
    }
    setIsDeleting(null);
  };

  const DummyUserItem = ({ user }: { user: DummyUser }) => (
    <div className="flex items-center justify-between p-2 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-full">
            <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="font-medium text-sm">{user.name}</span>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" disabled={isDeleting === user.id}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the house account from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(user.id)} disabled={isDeleting === user.id} className="bg-destructive hover:bg-destructive/80">
              {isDeleting === user.id ? "Deleting..." : "Delete"}
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
          <TabsTrigger key={sport} value={sport} className="flex items-center gap-2">
            <SportIcon sport={sport} className="w-4 h-4" />
            {sport}
          </TabsTrigger>
        ))}
      </TabsList>
      {sports.map((sport) => (
        <TabsContent key={sport} value={sport} className="mt-4">
          <div className="space-y-3">
            {dummyUsers.filter(p => p.sport === sport).length > 0 ? (
              dummyUsers.filter(p => p.sport === sport).map(user => (
                <DummyUserItem key={user.id} user={user} />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-10">No house accounts found for {sport}.</p>
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
