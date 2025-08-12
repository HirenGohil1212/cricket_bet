
"use client";

import * as React from "react";
import { useSearchParams, useRouter } from 'next/navigation'
import { AddFundsCard } from "@/components/wallet/add-funds-card";
import { WithdrawFundsCard } from "@/components/wallet/withdraw-funds-card";
import type { BankAccount } from "@/lib/types";

interface WalletViewProps {
  bankAccounts: BankAccount[];
}

export function WalletView({ bankAccounts }: WalletViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams()
  const initialAction = searchParams.get('action') === 'withdraw' ? 'withdraw' : 'deposit';
  
  const [activeTab, setActiveTab] = React.useState<'deposit' | 'withdraw'>(initialAction);

  // Effect to sync tab state if the URL is changed by browser back/forward buttons
  React.useEffect(() => {
    const action = searchParams.get('action') === 'withdraw' ? 'withdraw' : 'deposit';
    setActiveTab(action);
  }, [searchParams]);

  return (
    <div className="space-y-4">
      {activeTab === 'deposit' && <AddFundsCard bankAccounts={bankAccounts} />}
      {activeTab === 'withdraw' && <WithdrawFundsCard />}
    </div>
  )
}
