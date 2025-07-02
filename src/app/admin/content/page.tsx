import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentManagementForm } from "@/components/admin/content-management-form";
import { getContent } from "@/app/actions/content.actions";

export default async function ContentManagementPage() {
    const content = await getContent();
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Content Management</CardTitle>
                <CardDescription>
                    Manage promotional content like banners and videos displayed in the app.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ContentManagementForm initialData={content} />
            </CardContent>
        </Card>
    );
}
