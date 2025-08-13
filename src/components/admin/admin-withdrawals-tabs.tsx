
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WithdrawalRequest } from "@/lib/types";
import { AdminWithdrawalsTable } from "@/components/admin/admin-withdrawals-table";

interface AdminWithdrawalsTabsProps {
  withdrawals: WithdrawalRequest[];
}

export function AdminWithdrawalsTabs({ withdrawals }: AdminWithdrawalsTabsProps) {
  const processing = withdrawals.filter(d => d.status === 'Processing');
  const approved = withdrawals.filter(d => d.status === 'Approved');
  const rejected = withdrawals.filter(d => d.status === 'Rejected');

  return (
    <Tabs defaultValue="processing" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
        <TabsTrigger value="processing">Processing ({processing.length})</TabsTrigger>
        <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
        <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
        <TabsTrigger value="all">All ({withdrawals.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="processing" className="mt-4">
        <AdminWithdrawalsTable withdrawals={processing} />
      </TabsContent>
      <TabsContent value="approved" className="mt-4">
        <AdminWithdrawalsTable withdrawals={approved} />
      </TabsContent>
      <TabsContent value="rejected" className="mt-4">
        <AdminWithdrawalsTable withdrawals={rejected} />
      </TabsContent>
      <TabsContent value="all" className="mt-4">
        <AdminWithdrawalsTable withdrawals={withdrawals} />
      </TabsContent>
    </Tabs>
  );
}
