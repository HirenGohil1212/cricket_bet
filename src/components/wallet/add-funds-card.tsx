
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Banknote, Copy, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { depositRequestSchema, type DepositRequestFormValues } from "@/lib/schemas";
import type { BankAccount } from "@/lib/types";
import { createDepositRequest } from "@/app/actions/wallet.actions";
import { uploadFile } from "@/lib/storage";

interface AddFundsCardProps {
  bankAccounts: BankAccount[];
}

const DetailRow = ({ label, value, onCopy }: { label: string; value?: string; onCopy?: () => void }) => {
    if (!value) return null;
    return (
        <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{label}:</span>
            <div className="flex items-center gap-2">
                <span className="font-medium text-right">{value}</span>
                {onCopy && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCopy}>
                        <Copy className="h-3 w-3" />
                    </Button>
                )}
            </div>
        </div>
    );
};


export function AddFundsCard({ bankAccounts }: AddFundsCardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [screenshotPreview, setScreenshotPreview] = React.useState<string | null>(null);

  const form = useForm<DepositRequestFormValues>({
    resolver: zodResolver(depositRequestSchema),
    defaultValues: {
      amount: 100,
      utrNumber: "",
      selectedAccountId: bankAccounts.length > 0 ? bankAccounts[0].id : "",
    },
  });
  
  React.useEffect(() => {
    if (bankAccounts.length > 0) {
        form.setValue('selectedAccountId', bankAccounts[0].id!);
    }
  }, [bankAccounts, form]);


  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!", description: `${field} has been copied.` });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        form.setValue("screenshotFile", file, { shouldValidate: true });
        setScreenshotPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearScreenshot = () => {
    form.resetField("screenshotFile");
    setScreenshotPreview(null);
    const fileInput = document.getElementById('screenshot-upload') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
  };
  
  async function onSubmit(data: DepositRequestFormValues) {
    if (!user || !userProfile) {
      toast({ variant: "destructive", title: "Not logged in", description: "You must be logged in to add funds." });
      return;
    }
    setIsSubmitting(true);
    
    try {
        if (!data.screenshotFile) {
            throw new Error("Screenshot is required.");
        }
        
        const screenshotUrl = await uploadFile(data.screenshotFile, `deposits/${user.uid}`);
        
        const result = await createDepositRequest({
            userId: user.uid,
            userName: userProfile.name,
            amount: data.amount,
            screenshotUrl: screenshotUrl,
        });

        if (result.error) {
            toast({ variant: "destructive", title: "Submission Failed", description: result.error });
        } else {
            toast({ title: "Request Submitted", description: result.success });
            form.reset({ amount: 100, utrNumber: "" });
            clearScreenshot();
            router.refresh();
        }
    } catch (error: any) {
         toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload screenshot. Please try again." });
    } finally {
        setIsSubmitting(false);
    }
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
            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <Card key={account.id} className="p-4 bg-muted/50">
                    <div className="flex flex-col sm:flex-row gap-6 items-center">
                      {account.qrCodeUrl && (
                        <div className="flex flex-col items-center flex-shrink-0">
                          <Image src={account.qrCodeUrl} alt="UPI QR Code" width={160} height={160} className="rounded-md border p-1 h-40 w-40 object-contain bg-white" />
                          <p className="text-muted-foreground text-xs mt-2 text-center">Scan the QR code to pay</p>
                        </div>
                      )}
                      <div className="w-full space-y-2 text-sm">
                          <DetailRow label="UPI ID" value={account.upiId} onCopy={() => handleCopy(account.upiId!, 'UPI ID')} />
                          <DetailRow label="Account Name" value={account.accountHolderName} onCopy={() => handleCopy(account.accountHolderName, 'Account Name')} />
                          <DetailRow label="Account Number" value={account.accountNumber} onCopy={() => handleCopy(account.accountNumber, 'Account Number')} />
                          <DetailRow label="IFSC Code" value={account.ifscCode} onCopy={() => handleCopy(account.ifscCode, 'IFSC Code')} />
                      </div>
                    </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">The admin has not set up any payment methods yet.</p>
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
               <FormField
                  control={form.control}
                  name="utrNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UTR / UPI Transaction ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the 12-digit transaction ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField
                control={form.control}
                name="screenshotFile"
                render={() => (
                  <FormItem>
                    <FormLabel>Payment Screenshot</FormLabel>
                    {screenshotPreview ? (
                      <div className="relative">
                        <Image src={screenshotPreview} alt="Screenshot preview" width={200} height={200} className="rounded-md border object-contain w-full h-auto max-h-48" />
                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={clearScreenshot}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <FormControl>
                        <div className="flex items-center justify-center w-full">
                          <label htmlFor="screenshot-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                                  <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span></p>
                                  <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP (MAX. 5MB)</p>
                              </div>
                              <Input id="screenshot-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                          </label>
                        </div>
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting || bankAccounts.length === 0}>
                {isSubmitting ? "Submitting..." : "Submit Deposit Request"}
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
