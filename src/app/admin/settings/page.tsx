
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppSettings } from "@/app/actions/settings.actions";
import { AppSettingsForm } from "@/components/admin/app-settings-form";

export default async function SettingsPage() {
    const settings = await getAppSettings();
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Support Settings</CardTitle>
                <CardDescription>
                    Manage support and contact settings for the application.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AppSettingsForm initialData={settings} />
            </CardContent>
        </Card>
    );
}
