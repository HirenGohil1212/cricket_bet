
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { BankAccount } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteBankAccount } from "@/app/actions/settings.actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card } from "../ui/card";

interface BankAccountListProps {
  initialBankAccounts: BankAccount[];
  onAccountDeleted: (accountId: string) => void;
}

export function BankAccountList({ initialBankAccounts, onAccountDeleted }: BankAccountListProps) {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState(initialBankAccounts);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    setAccounts(initialBankAccounts);
  }, [initialBankAccounts]);

  const handleDelete = async (accountId: string) => {
    setIsDeleting(accountId);
    const result = await deleteBankAccount(accountId);
    if (result.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
      toast({ title: "Account Deleted", description: result.success });
      onAccountDeleted(accountId); // Notify parent
    }
    setIsDeleting(null);
  };

  if (accounts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12 border rounded-md mt-4">
        <p>No bank accounts have been added yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {accounts.map(account => (
        <Card key={account.id} className="p-4 relative">
          <div className="absolute top-2 right-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isDeleting === account.id}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the bank account for <span className="font-semibold">{account.accountHolderName}</span>. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(account.id!)} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting === account.id ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex items-center justify-center">
              {account.qrCodeUrl ? (
                <Image src={account.qrCodeUrl} alt="QR Code" width={150} height={150} className="rounded-md border p-1 bg-white object-contain" />
              ) : (
                <div className="w-[150px] h-[150px] bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
                  No QR Code
                </div>
              )}
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <DetailItem label="Holder Name" value={account.accountHolderName} />
                <DetailItem label="Account Number" value={account.accountNumber} />
                <DetailItem label="IFSC Code" value={account.ifscCode} />
                <DetailItem label="UPI ID" value={account.upiId} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

const DetailItem = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
};
