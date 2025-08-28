
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
        { title: "Total Deposits", value: summary.totalDeposits, icon: ArrowUpCircle, color: "text-green-500", description: "All funds added by users." },
        { title: "Total Withdrawals", value: summary.totalWithdrawals, icon: ArrowDownCircle, color: "text-red-500", description: "All funds paid out to users." },
        { title: "Total Payouts", value: summary.totalPayouts ?? 0, icon: TrendingDown, color: "text-orange-500", description: "All winnings paid out for bets." },
    ];

    const profitLoss = summary.grossRevenue ?? 0;
    const isProfit = profitLoss >= 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Financial Reports</h1>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                 {summaryCards.map(card => (
                    <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <card.icon className={`h-4 w-4 text-muted-foreground ${card.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">INR {card.value.toFixed(2)}</div>
                            <p className="text-xs text-muted-foreground">{card.description}</p>
                        </CardContent>
                    </Card>
                 ))}
                 <Card className={isProfit ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{isProfit ? 'Total Revenue (Profit)' : 'Total Loss'}</CardTitle>
                        <Banknote className="h-4 w-4 text-white/70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">INR {Math.abs(profitLoss).toFixed(2)}</div>
                        <p className="text-xs text-white/70">Total Wagered - Total Payouts</p>
                    </CardContent>
                 </Card>
            </div>

            {/* Chart */}
            <FinancialActivityChart data={activityData} />
        </div>
    );
}
