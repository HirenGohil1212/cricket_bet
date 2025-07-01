import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function AdminDashboardPage() {
    return (
        <div>
            <h1 className="text-2xl font-bold tracking-tight mb-4">Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Welcome, Admin!</CardTitle>
                        <CardDescription>This is your control center for Guess and Win.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Here you can manage users, matches, and view summaries of the app's activity. Use the navigation on the left to get started.</p>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Security Notice</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                           <Terminal className="h-4 w-4" />
                           <AlertTitle>Action Required</AlertTitle>
                           <AlertDescription>
                              The current admin access is for demonstration only. Any logged-in user can access this panel. Proper role-based security must be implemented before going live.
                           </AlertDescription>
                        </Alert>
                    </CardContent>
                 </Card>
            </div>
        </div>
    );
}
