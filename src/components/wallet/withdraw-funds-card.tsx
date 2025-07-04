
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { Banknote, CircleDollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDesc } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { withdrawalRequestSchema, type WithdrawalRequestFormValues } from "@/lib/schemas";
import { createWithdrawalRequest } from "@/app/actions/withdrawal.actions";
import { Skeleton } from "../ui/skeleton";

export function WithdrawFundsCard() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<WithdrawalRequestFormValues>({
    resolver: zodResolver(withdrawalRequestSchema),
    defaultValues: {
      amount: 100,
    },
  });

  const walletBalance = userProfile?.walletBalance ?? 0;
  const hasBankAccount = !!userProfile?.bankAccount;

  async function onSubmit(data: WithdrawalRequestFormValues) {
    if (!user || !userProfile) {
      toast({ variant: "destructive", title: "Not logged in" });
      return;
    }
    if (data.amount > walletBalance) {
      form.setError("amount", { message: "Amount exceeds wallet balance." });
      return;
    }

    setIsSubmitting(true);
    
    const result = await createWithdrawalRequest({
      userId: user.uid,
      userName: userProfile.name,
      amount: data.amount,
    });

    if (result.error) {
      toast({ variant: "destructive", title: "Submission Failed", description: result.error });
    } else {
      toast({ title: "Request Submitted", description: result.success });
      form.reset({ amount: 100 });
      router.refresh();
    }

    setIsSubmitting(false);
  }

  if (loading) {
    return (
        <Card>
            <CardHeader>
              <Skeleton className="h-6 w-3/5" />
              <Skeleton className="h-4 w-4/5" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw Funds</CardTitle>
        <CardDescription>
          Request a withdrawal to your registered bank account.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-8">
        <div className="flex flex-col space-y-4">
            <h3 className="font-semibold">Available Balance</h3>
            <div className="p-4 bg-muted rounded-lg text-center flex-grow flex flex-col justify-center min-h-[150px]">
                <p className="text-sm text-muted-foreground">Currently in Wallet</p>
                <p className="text-2xl font-bold font-headline text-primary">INR {walletBalance.toFixed(2)}</p>
            </div>
        </div>
        <div>
            <h3 className="font-semibold mb-4">Request Withdrawal</h3>
            {!hasBankAccount ? (
                <Alert>
                    <CircleDollarSign className="h-4 w-4" />
                    <AlertTitle>Bank Account Required</AlertTitle>
                    <AlertDescription>
                        You need to add your bank details before you can make a withdrawal.
                        <Button asChild variant="link" className="p-0 h-auto ml-1">
                            <Link href="/profile">Add Bank Details</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount to Withdraw</FormLabel>
                        <FormControl>
                            <div className="flex items-start gap-2">
                                <div className="relative flex-grow">
                                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                      type="number" 
                                      placeholder="Enter amount" 
                                      className="pl-10" 
                                      {...field} 
                                      onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="shrink-0"
                                    onClick={() => form.setValue('amount', Math.floor(walletBalance), { shouldValidate: true })}
                                    disabled={walletBalance < 100}
                                >
                                    Max
                                </Button>
                            </div>
                        </FormControl>
                        <FormDesc>
                          Minimum withdrawal is INR 100.
                        </FormDesc>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting || !hasBankAccount || loading}>
                    {isSubmitting ? "Submitting..." : "Request Withdrawal"}
                  </Button>
                </form>
              </Form>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
