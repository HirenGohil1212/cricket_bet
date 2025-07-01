import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, Swords, Banknote, LineChart } from "lucide-react";
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

async function getDashboardData() {
    try {
        const usersCol = collection(db, 'users');
        const userSnapshot = await getCountFromServer(usersCol);
        const userCount = userSnapshot.data().count;

        const matchesCol = collection(db, 'matches');
        const activeMatchesQuery = query(matchesCol, where('status', 'in', ['Live', 'Upcoming']));
        const activeMatchesSnapshot = await getCountFromServer(activeMatchesQuery);
        const matchCount = activeMatchesSnapshot.data().count;
        
        // Placeholder for real data to be implemented later
        const totalRevenue = 0;
        const pendingWithdrawals = 0;

        return { userCount, matchCount, totalRevenue, pendingWithdrawals };
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // Return zeros if there's an error (e.g., Firestore rules or collections don't exist)
        return { userCount: 0, matchCount: 0, totalRevenue: 0, pendingWithdrawals: 0 };
    }
}

export default async function AdminDashboardPage() {
    const { userCount, matchCount, totalRevenue, pendingWithdrawals } = await getDashboardData();

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userCount}</div>
                        <p className="text-xs text-muted-foreground">Registered users</p>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Matches</CardTitle>
                        <Swords className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{matchCount}</div>
                        <p className="text-xs text-muted-foreground">Live and upcoming matches</p>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
                        <LineChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingWithdrawals}</div>
                        <p className="text-xs text-muted-foreground">Awaiting approval</p>
                    </CardContent>
                 </Card>
            </div>
            <div className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Admin Actions</CardTitle>
                        <CardDescription>Quick links to manage your application.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Link href="/admin/matches" className="p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                            <h3 className="font-semibold">Manage Matches</h3>
                            <p className="text-sm text-muted-foreground">View, add, or edit matches and results.</p>
                        </Link>
                         <Link href="/admin/users" className="p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                            <h3 className="font-semibold">Manage Users</h3>
                            <p className="text-sm text-muted-foreground">View and manage user profiles.</p>
                        </Link>
                         <div className="p-4 bg-muted/30 rounded-lg cursor-not-allowed">
                            <h3 className="font-semibold text-muted-foreground/70">Manage Withdrawals</h3>
                            <p className="text-sm text-muted-foreground/50">Approve or deny user withdrawal requests.</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg cursor-not-allowed">
                            <h3 className="font-semibold text-muted-foreground/70">Content Management</h3>
                            <p className="text-sm text-muted-foreground/50">Upload banner and video ads.</p>
                        </div>
                         <div className="p-4 bg-muted/30 rounded-lg cursor-not-allowed">
                            <h3 className="font-semibold text-muted-foreground/70">Financial Reports</h3>
                            <p className="text-sm text-muted-foreground/50">View daily and monthly summaries.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
