
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPendingDeposits } from "@/app/actions/wallet.actions";
import { DepositsTable } from "@/components/admin/deposits-table";

export default async function AdminDepositsPage() {
    const deposits = await getPendingDeposits();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Deposit Requests</CardTitle>
                <CardDescription>
                    Review and approve or reject user deposit requests. Approved requests will update the user's wallet.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <DepositsTable deposits={deposits} />
            </CardContent>
        </Card>
    );
}
