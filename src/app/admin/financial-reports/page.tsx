
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
  Wallet,
  Gift,
  BadgePercent,
  CircleDollarSign,
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
        { title: "Total User Wallet Funds", value: summary.totalUserWalletFunds, icon: Wallet, color: "text-blue-500", description: "Current funds in all user wallets." },
        { title: "Bet Income (Total Wagered)", value: summary.betIncome, icon: BadgePercent, color: "text-indigo-500", description: "Total amount wagered by users." },
        { title: "Referral Bonuses Paid", value: summary.totalReferralBonuses, icon: Gift, color: "text-purple-500", description: "Total bonuses given for referrals." },
    ];
    
    const isProfit = summary.finalProfit >= 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Financials</h1>
            </div>

            {/* Summary Cards */}
             <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                 <Card className={isProfit ? "bg-primary" : "bg-destructive"}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 text-primary-foreground">
                        <CardTitle className="text-sm font-medium text-primary-foreground">{isProfit ? 'Final Profit' : 'Final Loss'}</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-primary-foreground/70" />
                    </CardHeader>
                    <CardContent className="text-primary-foreground">
                        <div className="text-2xl font-bold">INR {Math.abs(summary.finalProfit).toFixed(2)}</div>
                        <p className="text-xs text-primary-foreground/70">Bet Income - Payouts - Bonuses</p>
                    </CardContent>
                 </Card>
            </div>

            {/* Chart */}
            <FinancialActivityChart data={activityData} />
        </div>
    );
}
