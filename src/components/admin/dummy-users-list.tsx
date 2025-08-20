
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

interface DummyUsersListProps {
  initialDummyUsers: DummyUser[];
  onDummyUserDeleted: (dummyUserId: string) => void;
}

export function DummyUsersList({ initialDummyUsers, onDummyUserDeleted }: DummyUsersListProps) {
  const { toast } = useToast();
  const [dummyUsers, setDummyUsers] = useState(initialDummyUsers);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    setDummyUsers(initialDummyUsers);
  }, [initialDummyUsers]);

  const handleDelete = async (dummyUserId: string) => {
    setIsDeleting(true);
    const result = await deleteDummyUser(dummyUserId);
    if (result.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
      toast({ title: "Dummy User Deleted", description: result.success });
      onDummyUserDeleted(dummyUserId);
    }
    setIsDeleting(false);
  };

  const DummyUserItem = ({ user }: { user: DummyUser }) => (
    <div className="flex items-center justify-between p-2 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-full">
            <User className="h-6 w-6 text-muted-foreground" />
        </div>
        <span className="font-medium">{user.name}</span>
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
              This will permanently delete the dummy user from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(user.id)} disabled={isDeleting}>
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
            {dummyUsers.filter(p => p.sport === sport).length > 0 ? (
              dummyUsers.filter(p => p.sport === sport).map(user => (
                <DummyUserItem key={user.id} user={user} />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-10">No dummy users found for {sport}.</p>
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
