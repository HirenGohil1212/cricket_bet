
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getReferralSettings } from "@/app/actions/referral.actions";
import { ReferralSettingsForm } from "@/components/admin/referral-settings-form";

export default async function ReferralsPage() {
    const settings = await getReferralSettings();
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Referral Program Settings</CardTitle>
                <CardDescription>
                    Manage the referral bonus amounts and enable or disable the program.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ReferralSettingsForm initialData={settings} />
            </CardContent>
        </Card>
    );
}
