
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WithdrawalRequest } from "@/lib/types";
import { AdminWithdrawalsTable } from "@/components/admin/admin-withdrawals-table";

interface AdminWithdrawalsTabsProps {
  withdrawals: WithdrawalRequest[];
}

export function AdminWithdrawalsTabs({ withdrawals }: AdminWithdrawalsTabsProps) {
  const pending = withdrawals.filter(d => d.status === 'Pending');
  const completed = withdrawals.filter(d => d.status === 'Completed');
  const failed = withdrawals.filter(d => d.status === 'Failed');

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
        <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
        <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        <TabsTrigger value="failed">Failed ({failed.length})</TabsTrigger>
        <TabsTrigger value="all">All ({withdrawals.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="pending" className="mt-4">
        <AdminWithdrawalsTable withdrawals={pending} />
      </TabsContent>
      <TabsContent value="completed" className="mt-4">
        <AdminWithdrawalsTable withdrawals={completed} />
      </TabsContent>
      <TabsContent value="failed" className="mt-4">
        <AdminWithdrawalsTable withdrawals={failed} />
      </TabsContent>
      <TabsContent value="all" className="mt-4">
        <AdminWithdrawalsTable withdrawals={withdrawals} />
      </TabsContent>
    </Tabs>
  );
}
