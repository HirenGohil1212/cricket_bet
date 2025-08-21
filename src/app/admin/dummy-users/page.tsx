"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddDummyUserForm } from "@/components/admin/add-dummy-user-form";
import { getDummyUsers } from "@/app/actions/dummy-user.actions";
import { DummyUsersList } from "@/components/admin/dummy-users-list";
import type { DummyUser } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

function DummyUsersPageSkeleton() {
    return (
        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle><Skeleton className="h-6 w-3/4" /></CardTitle>
                        <CardDescription>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3 mt-1" />
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle><Skeleton className="h-6 w-1/2" /></CardTitle>
                        <CardDescription>
                            <Skeleton className="h-4 w-3/4" />
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function HouseAccountsPage() {
    const [dummyUsers, setDummyUsers] = React.useState<DummyUser[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const loadDummyUsers = async () => {
            const fetchedDummyUsers = await getDummyUsers();
            setDummyUsers(fetchedDummyUsers);
            setIsLoading(false);
        }
        loadDummyUsers();
    }, [])

    const handleDummyUserAdded = (newDummyUser: DummyUser) => {
        setDummyUsers(currentDummyUsers => [newDummyUser, ...currentDummyUsers]);
    };
    
    const handleDummyUserDeleted = (deletedDummyUserId: string) => {
        setDummyUsers(currentDummyUsers => currentDummyUsers.filter(p => p.id !== deletedDummyUserId));
    };

    if (isLoading) {
        return <DummyUsersPageSkeleton />;
    }

    return (
        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle>Add New House Account</CardTitle>
                        <CardDescription>
                            Add a house account for display purposes when no real user wins a match.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <AddDummyUserForm onDummyUserAdded={handleDummyUserAdded} />
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>House Accounts List</CardTitle>
                        <CardDescription>
                            View and manage all house accounts in the database.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DummyUsersList initialDummyUsers={dummyUsers} onDummyUserDeleted={handleDummyUserDeleted}/>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}