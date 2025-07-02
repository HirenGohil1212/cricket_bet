import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { getFinancialSummary, getDailyFinancialActivity } from "@/app/actions/financials.actions";
import { FinancialActivityChart } from "@/components/admin/financial-activity-chart";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default async function FinancialReportsPage() {
    const [summary, activityData] = await Promise.all([
        getFinancialSummary(),
        getDailyFinancialActivity()
    ]);

    if (summary.error) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error Loading Financials</AlertTitle>
                <AlertDescription>
                    There was a problem fetching the financial summary. Please check the server logs or try again later.
                </AlertDescription>
            </Alert>
        )
    }

    const summaryCards = [
        { title: "Total Deposits", value: summary.totalDeposits, icon: ArrowUpCircle, color: "text-green-500" },
        { title: "Total Withdrawals", value: summary.totalWithdrawals, icon: ArrowDownCircle, color: "text-red-500" },
        { title: "Total Wagered", value: summary.totalWagered, icon: TrendingUp, color: "text-blue-500" },
        { title: "Total Payouts", value: summary.totalPayouts, icon: TrendingDown, color: "text-orange-500" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Financial Reports</h1>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                 {summaryCards.map(card => (
                    <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <card.icon className={`h-4 w-4 text-muted-foreground ${card.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">INR {card.value.toFixed(2)}</div>
                        </CardContent>
                    </Card>
                 ))}
                 <Card className="bg-primary text-primary-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
                        <Banknote className="h-4 w-4 text-primary-foreground/70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">INR {summary.grossRevenue.toFixed(2)}</div>
                        <p className="text-xs text-primary-foreground/70">Total Wagered - Total Payouts</p>
                    </CardContent>
                 </Card>
            </div>

            {/* Chart */}
            <FinancialActivityChart data={activityData} />
        </div>
    );
}
