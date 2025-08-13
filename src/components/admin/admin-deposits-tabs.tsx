
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DepositRequest } from "@/lib/types";
import { DepositsTable } from "@/components/admin/deposits-table";

interface AdminDepositsTabsProps {
  deposits: DepositRequest[];
}

export function AdminDepositsTabs({ deposits }: AdminDepositsTabsProps) {
  const processing = deposits.filter(d => d.status === 'Processing');
  const approved = deposits.filter(d => d.status === 'Approved');
  const rejected = deposits.filter(d => d.status === 'Rejected');

  return (
    <Tabs defaultValue="processing" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
        <TabsTrigger value="processing">Processing ({processing.length})</TabsTrigger>
        <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
        <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
        <TabsTrigger value="all">All ({deposits.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="processing" className="mt-4">
        <DepositsTable deposits={processing} />
      </TabsContent>
      <TabsContent value="approved" className="mt-4">
        <DepositsTable deposits={approved} />
      </TabsContent>
      <TabsContent value="rejected" className="mt-4">
        <DepositsTable deposits={rejected} />
      </TabsContent>
      <TabsContent value="all" className="mt-4">
        <DepositsTable deposits={deposits} />
      </TabsContent>
    </Tabs>
  );
}
