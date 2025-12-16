"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletView } from "@/components/wallet/wallet-view";
import { getBankDetails } from "@/app/actions/settings.actions";
import { BankAccount } from "@/lib/types";
import { useEffect, useState } from "react";

export function WalletActions() {
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBankAccounts = async () => {
            setIsLoading(true);
            const accounts = await getBankDetails();
            setBankAccounts(accounts);
            setIsLoading(false);
        };
        fetchBankAccounts();
    }, []);

    if (isLoading) {
        return <Skeleton className="h-[450px] w-full" />;
    }

    return <WalletView bankAccounts={bankAccounts} />;
}
