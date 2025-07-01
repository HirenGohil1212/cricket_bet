import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddMatchForm } from "@/components/admin/add-match-form";
import { ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function AddMatchPage() {
    return (
        <div>
            <div className="mb-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/matches">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Matches
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Add New Match</CardTitle>
                    <CardDescription>Fill in the details below to create a new match.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AddMatchForm />
                </CardContent>
            </Card>
        </div>
    );
}
