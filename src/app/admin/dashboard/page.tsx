
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, Swords, Banknote, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { getFinancialSummary } from "@/app/actions/financials.actions";

async function getDashboardData() {
    try {
        const usersCol = collection(db, 'users');
        const matchesCol = collection(db, 'matches');
        const withdrawalsCol = collection(db, 'withdrawals');
        const depositsCol = collection(db, 'deposits');

        const [
            userSnapshot,
            activeMatchesSnapshot,
            pendingWithdrawalsSnapshot,
            pendingDepositsSnapshot,
            financialSummary
        ] = await Promise.all([
            getCountFromServer(usersCol),
            getCountFromServer(query(matchesCol, where('status', 'in', ['Live', 'Upcoming']))),
            getCountFromServer(query(withdrawalsCol, where('status', '==', 'Processing'))),
            getCountFromServer(query(depositsCol, where('status', '==', 'Processing'))),
            getFinancialSummary()
        ]);
        
        const userCount = userSnapshot.data().count;
        const matchCount = activeMatchesSnapshot.data().count;
        const pendingWithdrawals = pendingWithdrawalsSnapshot.data().count;
        const pendingDeposits = pendingDepositsSnapshot.data().count;
        const totalRevenue = financialSummary.grossRevenue;

        return { userCount, matchCount, totalRevenue, pendingWithdrawals, pendingDeposits };

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return { userCount: 0, matchCount: 0, totalRevenue: 0, pendingWithdrawals: 0, pendingDeposits: 0 };
    }
}

export default async function AdminDashboardPage() {
    const { userCount, matchCount, totalRevenue, pendingWithdrawals, pendingDeposits } = await getDashboardData();

    return (
        <>
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                        <p className="text-xs text-muted-foreground">Live and upcoming</p>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">INR {totalRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">All-time revenue</p>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Deposits</CardTitle>
                        <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingDeposits}</div>
                        <p className="text-xs text-muted-foreground">Awaiting approval</p>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
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
                    <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        <Link href="/admin/matches" className="p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                            <h3 className="font-semibold">Manage Matches</h3>
                            <p className="text-sm text-muted-foreground">View, add, or edit matches and results.</p>
                        </Link>
                         <Link href="/admin/users" className="p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                            <h3 className="font-semibold">Manage Users</h3>
                            <p className="text-sm text-muted-foreground">View and manage user profiles.</p>
                        </Link>
                         <Link href="/admin/withdrawals" className="p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                            <h3 className="font-semibold">Manage Withdrawals</h3>
                            <p className="text-sm text-muted-foreground">Approve or deny user withdrawal requests.</p>
                        </Link>
                        <Link href="/admin/content" className="p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                            <h3 className="font-semibold">Content Management</h3>
                            <p className="text-sm text-muted-foreground">Upload banner and video ads.</p>
                        </Link>
                         <Link href="/admin/financial-reports" className="p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                            <h3 className="font-semibold">Financial Reports</h3>
                            <p className="text-sm text-muted-foreground">View daily and monthly summaries.</p>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
