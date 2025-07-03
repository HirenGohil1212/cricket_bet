
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BettingSettingsForm } from "@/components/admin/betting-settings-form";
import { getBettingSettings } from "@/app/actions/settings.actions";

export default async function BettingSettingsPage() {
    const settings = await getBettingSettings();
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Betting Settings</CardTitle>
                <CardDescription>
                    Manage the multiplier for calculating potential wins on bets.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <BettingSettingsForm initialData={settings} />
            </CardContent>
        </Card>
    );
}
