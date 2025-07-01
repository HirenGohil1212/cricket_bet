
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Banknote, Copy, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { depositRequestSchema, type DepositRequestFormValues } from "@/lib/schemas";
import type { BankAccount } from "@/lib/types";
import { createDepositRequest } from "@/app/actions/wallet.actions";

interface AddFundsCardProps {
  bankAccounts: BankAccount[];
}

export function AddFundsCard({ bankAccounts }: AddFundsCardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<DepositRequestFormValues>({
    resolver: zodResolver(depositRequestSchema),
    defaultValues: {
      amount: 100,
    },
  });

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!", description: `${field} has been copied.` });
  };
  
  async function onSubmit(data: DepositRequestFormValues) {
    if (!user || !userProfile) {
      toast({ variant: "destructive", title: "Not logged in", description: "You must be logged in to add funds." });
      return;
    }
    setIsSubmitting(true);
    
    const result = await createDepositRequest({
        ...data,
        userId: user.uid,
        userName: userProfile.name,
    });

    if (result.error) {
      toast({ variant: "destructive", title: "Submission Failed", description: result.error });
    } else {
      toast({ title: "Request Submitted", description: result.success });
      form.reset();
      router.refresh(); // Refresh to show new entry in history
    }

    setIsSubmitting(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Funds to Wallet</CardTitle>
        <CardDescription>
          Transfer funds to one of the accounts below, then submit your payment details.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-semibold mb-4">Payment Options</h3>
          {bankAccounts.length > 0 ? (
            <Accordion type="single" collapsible defaultValue="item-0">
              {bankAccounts.map((account, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-primary" />
                        <span>Pay with UPI QR / Bank Transfer</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    {account.qrCodeUrl && (
                        <div className="flex flex-col items-center">
                            <Image src={account.qrCodeUrl} alt="UPI QR Code" width={200} height={200} className="rounded-md border p-1" />
                            <p className="text-muted-foreground text-sm mt-2">Scan the QR code to pay</p>
                        </div>
                    )}
                    <div className="space-y-2 text-sm">
                        <DetailRow label="UPI ID" value={account.upiId} onCopy={() => handleCopy(account.upiId, 'UPI ID')} />
                        <DetailRow label="Account Name" value={account.accountHolderName} onCopy={() => handleCopy(account.accountHolderName, 'Account Name')} />
                        <DetailRow label="Account Number" value={account.accountNumber} onCopy={() => handleCopy(account.accountNumber, 'Account Number')} />
                        <DetailRow label="IFSC Code" value={account.ifscCode} onCopy={() => handleCopy(account.ifscCode, 'IFSC Code')} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-muted-foreground">The admin has not set up any payment methods yet.</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-4">Submit Your Deposit</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (Min. INR 100)</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" placeholder="Enter amount" className="pl-10" {...field} />
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Deposit Request"}
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}


function DetailRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
    if (!value) return null;
    return (
        <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{label}:</span>
            <div className="flex items-center gap-2">
                <span className="font-medium">{value}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCopy}>
                    <Copy className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}
