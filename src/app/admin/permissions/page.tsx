
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PermissionsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Permissions Management</CardTitle>
                <CardDescription>
                    This feature is managed directly from the main "Users" table. Find the user you want to manage and click the "Manage Permissions" icon.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    From the user management dialog, you can promote users to Admins, Sub-Admins, or demote them back to regular Users. You can also assign granular permissions to Sub-Admins to control their access to different parts of the admin panel.
                </p>
            </CardContent>
        </Card>
    );
}
