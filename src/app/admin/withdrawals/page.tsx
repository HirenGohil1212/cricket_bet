
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllWithdrawals } from "@/app/actions/withdrawal.actions";
import { AdminWithdrawalsTabs } from "@/components/admin/admin-withdrawals-tabs";

export default async function AdminWithdrawalsPage() {
    const allWithdrawals = await getAllWithdrawals();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Withdrawal History</CardTitle>
                <CardDescription>
                    Review and manage all user withdrawal requests.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AdminWithdrawalsTabs withdrawals={allWithdrawals} />
            </CardContent>
        </Card>
    );
}
