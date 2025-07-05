
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Banknote, Copy, QrCode, UploadCloud, X } from "lucide-react";

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
  const [screenshotPreview, setScreenshotPreview] = React.useState<string | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        form.setValue("screenshotDataUri", result, { shouldValidate: true });
        form.setValue("screenshot", file, { shouldValidate: true });
        setScreenshotPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearScreenshot = () => {
    form.resetField("screenshot");
    form.resetField("screenshotDataUri");
    setScreenshotPreview(null);
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
      form.reset({ amount: 100 });
      setScreenshotPreview(null);
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
                  <AccordionContent>
                    <div className="flex flex-col sm:flex-row gap-6 items-center">
                      {account.qrCodeUrl && (
                        <div className="flex flex-col items-center flex-shrink-0">
                          <Image src={account.qrCodeUrl} alt="UPI QR Code" width={160} height={160} className="rounded-md border p-1 h-40 w-40 object-contain" />
                          <p className="text-muted-foreground text-xs mt-2 text-center">Scan the QR code to pay</p>
                        </div>
                      )}
                      <div className="w-full space-y-2 text-sm">
                          <DetailRow label="UPI ID" value={account.upiId} onCopy={() => handleCopy(account.upiId, 'UPI ID')} />
                          <DetailRow label="Account Name" value={account.accountHolderName} onCopy={() => handleCopy(account.accountHolderName, 'Account Name')} />
                          <DetailRow label="Account Number" value={account.accountNumber} onCopy={() => handleCopy(account.accountNumber, 'Account Number')} />
                          <DetailRow label="IFSC Code" value={account.ifscCode} onCopy={() => handleCopy(account.ifscCode, 'IFSC Code')} />
                      </div>
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
              <FormField
                control={form.control}
                name="screenshot"
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
