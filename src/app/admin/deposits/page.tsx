
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllDeposits } from "@/app/actions/wallet.actions";
import { AdminDepositsTabs } from "@/components/admin/admin-deposits-tabs";

export default async function AdminDepositsPage() {
    const allDeposits = await getAllDeposits();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Deposit History</CardTitle>
                <CardDescription>
                    Review and manage all user deposit requests.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AdminDepositsTabs deposits={allDeposits} />
            </CardContent>
        </Card>
    );
}
