
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { userBankAccountSchema, type UserBankAccountFormValues } from "@/lib/schemas";
import { useAuth } from "@/context/auth-context";
import { updateUserBankAccount } from "@/app/actions/user.actions";
import { Skeleton } from "../ui/skeleton";

export function UserProfileForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<UserBankAccountFormValues>({
    resolver: zodResolver(userBankAccountSchema),
    defaultValues: {
      accountHolderName: "",
      accountNumber: "",
      ifscCode: "",
      upiId: "",
    },
  });

  React.useEffect(() => {
    if (userProfile?.bankAccount) {
      form.reset({
        accountHolderName: userProfile.bankAccount.accountHolderName || "",
        accountNumber: userProfile.bankAccount.accountNumber || "",
        ifscCode: userProfile.bankAccount.ifscCode || "",
        upiId: userProfile.bankAccount.upiId || "",
      });
    }
  }, [userProfile, form]);

  async function onSubmit(data: UserBankAccountFormValues) {
    if (!user) {
      toast({ variant: "destructive", title: "Not logged in" });
      return;
    }
    setIsSubmitting(true);
    const result = await updateUserBankAccount(user.uid, data);
    
    if (result.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
      toast({ title: "Success!", description: result.success });
      router.refresh();
    }
    setIsSubmitting(false);
  }

  if (loading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
             <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    </div>
                    <div className="flex justify-end">
                        <Skeleton className="h-10 w-36" />
                    </div>
                </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-4">
        {userProfile && (
            <h2 className="text-2xl font-bold font-headline text-foreground">
                Hello, {userProfile.name}!
            </h2>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Your Bank Details</CardTitle>
            <CardDescription>
              This information will be used for processing your withdrawals. Please ensure it is accurate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="accountHolderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Holder Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ifscCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IFSC Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. SBIN0001234" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="upiId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UPI ID (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. johndoe@upi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting || loading}>
                    {isSubmitting ? "Saving..." : "Save Bank Details"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
    </div>
  );
}
