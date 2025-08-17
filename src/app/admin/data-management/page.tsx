
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataManagementForm } from "@/components/admin/data-management-form";

export default async function DataManagementPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                    Delete historical user data to reduce database load. This action does not delete user accounts.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <DataManagementForm />
            </CardContent>
        </Card>
    );
}
