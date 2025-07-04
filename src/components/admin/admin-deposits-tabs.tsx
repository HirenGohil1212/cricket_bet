
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DepositRequest } from "@/lib/types";
import { DepositsTable } from "@/components/admin/deposits-table";

interface AdminDepositsTabsProps {
  deposits: DepositRequest[];
}

export function AdminDepositsTabs({ deposits }: AdminDepositsTabsProps) {
  const pending = deposits.filter(d => d.status === 'Pending');
  const completed = deposits.filter(d => d.status === 'Completed');
  const failed = deposits.filter(d => d.status === 'Failed');

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
        <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
        <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        <TabsTrigger value="failed">Failed ({failed.length})</TabsTrigger>
        <TabsTrigger value="all">All ({deposits.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="pending" className="mt-4">
        <DepositsTable deposits={pending} />
      </TabsContent>
      <TabsContent value="completed" className="mt-4">
        <DepositsTable deposits={completed} />
      </TabsContent>
      <TabsContent value="failed" className="mt-4">
        <DepositsTable deposits={failed} />
      </TabsContent>
      <TabsContent value="all" className="mt-4">
        <DepositsTable deposits={deposits} />
      </TabsContent>
    </Tabs>
  );
}
