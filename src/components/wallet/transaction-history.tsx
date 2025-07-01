"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepositHistoryTable } from "@/components/wallet/deposit-history-table";
import { Badge } from "../ui/badge";

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
            <TabsTrigger value="withdrawals" disabled>
              Withdrawals
              <Badge variant="outline" className="ml-2">Soon</Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="deposits" className="mt-4">
            <DepositHistoryTable />
          </TabsContent>
          <TabsContent value="withdrawals" className="mt-4">
            <div className="text-center text-muted-foreground py-12 border rounded-md mt-4">
              <p>Your withdrawal history will appear here once the feature is available.</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
