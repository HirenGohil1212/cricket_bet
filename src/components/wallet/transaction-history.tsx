
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepositHistoryTable } from "@/components/wallet/deposit-history-table";
import { WithdrawalHistoryTable } from "./withdrawal-history-table";

export function TransactionHistory() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deposits" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">
              Withdrawals
            </TabsTrigger>
          </TabsList>
          <TabsContent value="deposits" className="mt-4">
            <DepositHistoryTable />
          </TabsContent>
          <TabsContent value="withdrawals" className="mt-4">
             <WithdrawalHistoryTable />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
