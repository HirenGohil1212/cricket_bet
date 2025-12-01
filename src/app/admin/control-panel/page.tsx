
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMatches } from "@/app/actions/match.actions";
import { ControlPanelDashboard } from "@/components/admin/control-panel-dashboard";

export default async function ControlPanelPage() {
    const matches = await getMatches();
    const liveMatches = matches.filter(m => m.status === 'Live');
    const upcomingMatches = matches.filter(m => m.status === 'Upcoming');

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Match Control Panel</CardTitle>
                    <CardDescription>
                        Enable or disable betting features for live and upcoming matches in real-time.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ControlPanelDashboard 
                        liveMatches={liveMatches}
                        upcomingMatches={upcomingMatches}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
