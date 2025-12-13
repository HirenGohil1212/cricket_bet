
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllDeposits } from "@/app/actions/wallet.actions";
import { AdminDepositsTabs } from "@/components/admin/admin-deposits-tabs";
import { getAppSettings } from "@/app/actions/settings.actions";
import { DepositBonusForm } from "@/components/admin/deposit-bonus-form";
import { Separator } from "@/components/ui/separator";

export default async function AdminDepositsPage() {
    const [allDeposits, appSettings] = await Promise.all([
        getAllDeposits(),
        getAppSettings()
    ]);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Deposit History</CardTitle>
                        <CardDescription>
                            Review and manage all user deposit requests.
                        </CardDescription>
                    </div>
                    <DepositBonusForm initialPercentage={appSettings.depositBonusPercentage || 0} />
                </div>
            </CardHeader>
            <CardContent>
                <Separator className="my-4" />
                <AdminDepositsTabs deposits={allDeposits} />
            </CardContent>
        </Card>
    );
}
