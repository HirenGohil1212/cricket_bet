
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepositHistoryTable } from "@/components/wallet/deposit-history-table";
import { WithdrawalHistoryTable } from "./withdrawal-history-table";
import { BonusHistoryTable } from "./bonus-history-table";

export function TransactionHistory() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
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
            {/* Placeholder for All History Table */}
             <p className="text-center text-muted-foreground p-8">Coming soon...</p>
          </TabsContent>
           <TabsContent value="wins" className="mt-4">
             {/* Placeholder for Wins History Table */}
             <p className="text-center text-muted-foreground p-8">Coming soon...</p>
          </TabsContent>
           <TabsContent value="losses" className="mt-4">
             {/* Placeholder for Losses History Table */}
             <p className="text-center text-muted-foreground p-8">Coming soon...</p>
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
