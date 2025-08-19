import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentManagementForm } from "@/components/admin/content-management-form";
import { getContent, listContentFiles } from "@/app/actions/content.actions";
import { ContentFileList } from "@/components/admin/content-file-list";
import { Separator } from "@/components/ui/separator";

export default async function ContentManagementPage() {
    const [content, { files, error }] = await Promise.all([
        getContent(),
        listContentFiles()
    ]);
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Content Management</CardTitle>
                    <CardDescription>
                        Manage promotional content like the main banner and videos displayed in the app.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ContentManagementForm initialData={content} />
                </CardContent>
            </Card>

            <Separator />

            <Card>
                 <CardHeader>
                    <CardTitle>Uploaded Content Files</CardTitle>
                    <CardDescription>
                        View and delete all individual files uploaded to the content folder.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ContentFileList initialFiles={files} error={error} />
                </CardContent>
            </Card>
        </div>
    );
}
