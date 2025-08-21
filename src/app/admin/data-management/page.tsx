
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataManagementForm } from "@/components/admin/data-management-form";

export default async function DataManagementPage() {
    return (
        <div>
            <div className="mb-4">
                 <h1 className="text-lg font-semibold md:text-2xl">Data Management</h1>
            </div>
            <DataManagementForm />
        </div>
    );
}
