
"use client";

import * as React from "react";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepositHistoryTable } from "@/components/wallet/deposit-history-table";
import { WithdrawalHistoryTable } from "./withdrawal-history-table";
import { BonusHistoryTable } from "./bonus-history-table";
import { AllHistoryTable } from "./all-history-table";
import { WinsLossesHistoryTable } from "./wins-losses-history-table";
import { DatePickerWithRange } from "../date-picker-with-range";
import type { DateRange } from "react-day-picker";
import { Button } from "../ui/button";
import { Download } from "lucide-react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Bet, DepositRequest, Referral, Transaction, WithdrawalRequest } from "@/lib/types";

type CombinedHistoryItem = {
    id: string;
    type: 'Win' | 'Loss' | 'Deposit' | 'Withdrawal' | 'Bonus' | 'Pending Bonus';
    amount: number;
    description: string;
    date: Date;
    status: string;
};


export function TransactionHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownload = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to download a statement.' });
        return;
    }
    if (!dateRange || !dateRange.from || !dateRange.to) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a valid date range.' });
        return;
    }

    setIsDownloading(true);
    try {
        const from = Timestamp.fromDate(dateRange.from);
        const to = Timestamp.fromDate(dateRange.to);

        // Fetch all data within the range
        const betsQuery = query(collection(db, 'bets'), where('userId', '==', user.uid), where('timestamp', '>=', from), where('timestamp', '<=', to));
        const depositsQuery = query(collection(db, 'deposits'), where('userId', '==', user.uid), where('createdAt', '>=', from), where('createdAt', '<=', to));
        const withdrawalsQuery = query(collection(db, 'withdrawals'), where('userId', '==', user.uid), where('createdAt', '>=', from), where('createdAt', '<=', to));
        const bonusesQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('timestamp', '>=', from), where('timestamp', '<=', to), where('type', 'in', ['referral_bonus', 'deposit_commission']));

        const [betsSnap, depositsSnap, withdrawalsSnap, bonusesSnap] = await Promise.all([
            getDocs(betsQuery),
            getDocs(depositsQuery),
            getDocs(withdrawalsQuery),
            getDocs(bonusesQuery),
        ]);

        const historyItems: CombinedHistoryItem[] = [];

        betsSnap.forEach(doc => {
            const data = doc.data() as Bet;
            if (data.status === 'Won') {
                historyItems.push({ id: doc.id, type: 'Win', amount: data.potentialWin, description: `Win on ${data.matchDescription}`, date: (data.timestamp as Timestamp).toDate(), status: data.status });
            } else if (data.status === 'Lost') {
                historyItems.push({ id: doc.id, type: 'Loss', amount: data.amount, description: `Loss on ${data.matchDescription}`, date: (data.timestamp as Timestamp).toDate(), status: data.status });
            }
        });
        depositsSnap.forEach(doc => {
            const data = doc.data() as DepositRequest;
            historyItems.push({ id: doc.id, type: 'Deposit', amount: data.amount, description: `Deposit`, date: (data.createdAt as Timestamp).toDate(), status: data.status });
        });
        withdrawalsSnap.forEach(doc => {
            const data = doc.data() as WithdrawalRequest;
            historyItems.push({ id: doc.id, type: 'Withdrawal', amount: data.amount, description: 'Withdrawal', date: (data.createdAt as Timestamp).toDate(), status: data.status });
        });
        bonusesSnap.forEach(doc => {
            const data = doc.data() as Transaction;
            historyItems.push({ id: doc.id, type: 'Bonus', amount: data.amount, description: data.description, date: (data.timestamp as Timestamp).toDate(), status: 'Completed' });
        });

        if (historyItems.length === 0) {
            toast({ title: 'No Data', description: 'No transactions found for the selected date range.' });
            setIsDownloading(false);
            return;
        }
        
        historyItems.sort((a, b) => b.date.getTime() - a.date.getTime());

        // Create Excel sheet
        const worksheetData = historyItems.map(item => ({
            Date: item.date.toLocaleString(),
            Type: item.type,
            Description: item.description,
            Status: item.status,
            Amount: item.type === 'Loss' || item.type === 'Withdrawal' ? -item.amount : item.amount,
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Account Statement');
        XLSX.utils.sheet_add_aoa(worksheet, [['Date', 'Type', 'Description', 'Status', 'Amount (INR)']], { origin: 'A1' });
        
        // Auto-fit columns
        const max_width = worksheetData.reduce((w, r) => Math.max(w, r.Description.length), 10);
        worksheet["!cols"] = [ { wch: 20 }, { wch: 15 }, { wch: max_width }, { wch: 15 }, { wch: 15 }];

        XLSX.writeFile(workbook, 'UPI11_Account_Statement.xlsx');

    } catch (error) {
        console.error("Error generating statement:", error);
        toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not generate your account statement.' });
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                  A complete record of all your financial activity.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <DatePickerWithRange onDateChange={setDateRange} />
              <Button onClick={handleDownload} disabled={isDownloading} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                {isDownloading ? 'Downloading...' : 'Download'}
              </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="wins">Wins</TabsTrigger>
            <TabsTrigger value="losses">Losses</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">
              Withdrawals
            </TabsTrigger>
            <TabsTrigger value="bonuses">Bonuses</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <AllHistoryTable />
          </TabsContent>
           <TabsContent value="wins" className="mt-4">
             <WinsLossesHistoryTable type="Won" />
          </TabsContent>
           <TabsContent value="losses" className="mt-4">
             <WinsLossesHistoryTable type="Lost" />
          </TabsContent>
          <TabsContent value="deposits" className="mt-4">
            <DepositHistoryTable />
          </TabsContent>
          <TabsContent value="withdrawals" className="mt-4">
             <WithdrawalHistoryTable />
          </TabsContent>
          <TabsContent value="bonuses" className="mt-4">
             <BonusHistoryTable />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
