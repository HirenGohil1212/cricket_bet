

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as React from "react";
import Image from "next/image";
import { PlusCircle, Trash2, UploadCloud } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { bankDetailsFormSchema, type BankDetailsFormValues } from "@/lib/schemas";
import type { BankAccount } from "@/lib/types";
import { updateBankDetails, deleteBankAccount } from "@/app/actions/settings.actions";
import { Card, CardContent } from "@/components/ui/card";
import { uploadFile } from "@/lib/storage";
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
import { useRouter } from "next/navigation";

interface BankDetailsFormProps {
    initialData: BankAccount[];
}

const createDefaultAccount = (): BankAccount => ({
  id: uuidv4(),
  upiId: '',
  accountHolderName: '',
  accountNumber: '',
  ifscCode: '',
  qrCodeUrl: '',
  qrCodePath: '',
});

export function BankDetailsForm({ initialData }: BankDetailsFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [previews, setPreviews] = React.useState<Record<string, string>>({});

  const form = useForm<BankDetailsFormValues>({
    resolver: zodResolver(bankDetailsFormSchema),
    defaultValues: {
      accounts: initialData.length > 0 ? initialData.map(acc => ({ ...acc, id: acc.id || uuidv4() })) : [createDefaultAccount()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "accounts",
  });
  
  React.useEffect(() => {
    // Sync previews and form when initialData changes
    const initialPreviews = initialData.reduce((acc, account) => {
        if (account.id && account.qrCodeUrl) {
            acc[account.id] = account.qrCodeUrl;
        }
        return acc;
    }, {} as Record<string, string>);
    setPreviews(initialPreviews);
     form.reset({
      accounts: initialData.length > 0 ? initialData.map(acc => ({ ...acc, id: acc.id || uuidv4() })) : [createDefaultAccount()],
    });
  }, [initialData, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldId: string, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
          form.setError(`accounts.${index}.qrCodeFile`, { message: "Max file size is 5MB." });
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        form.setValue(`accounts.${index}.qrCodeFile`, file, { shouldValidate: true });
        setPreviews(prev => ({...prev, [fieldId]: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAccountDelete = async (accountId: string, index: number) => {
    if (!accountId) return;
    setIsDeleting(accountId);
    const result = await deleteBankAccount(accountId);
    if (result.error) {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: result.error });
    } else {
        remove(index);
        toast({ title: 'Success', description: result.success });
        router.refresh();
    }
    setIsDeleting(null);
  }

  async function onSubmit(data: BankDetailsFormValues) {
    setIsSubmitting(true);
    try {
        const accountsWithUploads = await Promise.all(data.accounts.map(async (account) => {
            let qrCodeUrl = account.qrCodeUrl || '';
            let qrCodePath = account.qrCodePath || '';

            if (account.qrCodeFile instanceof File) {
                const uploadResult = await uploadFile(account.qrCodeFile, 'qrcodes');
                qrCodeUrl = uploadResult.downloadUrl;
                qrCodePath = uploadResult.storagePath;
            }

            return {
                id: account.id,
                upiId: account.upiId,
                accountHolderName: account.accountHolderName,
                accountNumber: account.accountNumber,
                ifscCode: account.ifscCode,
                qrCodeUrl,
                qrCodePath,
            };
        }));
        
        const result = await updateBankDetails(accountsWithUploads);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
        } else {
            toast({ title: 'Success', description: 'All changes have been saved.'});
            // Reset the form with the new data to clear dirty state and ensure IDs are correct
            form.reset({ accounts: accountsWithUploads.map(acc => ({...acc, qrCodeFile: undefined})) });
            router.refresh();
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload QR code. Please try again." });
    } finally {
        setIsSubmitting(false);
    }
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
            {fields.map((field, index) => (
                <Card key={field.id} className="relative pt-8 border-border">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this bank account and its QR code.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => handleAccountDelete(field.id, index)}
                                disabled={isDeleting === field.id}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                {isDeleting === field.id ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <FormField
                              control={form.control}
                              name={`accounts.${index}.accountHolderName`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account Holder Name</FormLabel>
                                  <FormControl><Input placeholder="e.g. John Doe" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormField
                              control={form.control}
                              name={`accounts.${index}.accountNumber`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account Number</FormLabel>
                                  <FormControl><Input placeholder="e.g. 1234567890" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        </div>
                        <div className="space-y-6">
                            <FormField
                              control={form.control}
                              name={`accounts.${index}.ifscCode`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>IFSC Code</FormLabel>
                                  <FormControl><Input placeholder="e.g. SBIN0001234" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormField
                              control={form.control}
                              name={`accounts.${index}.upiId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>UPI ID</FormLabel>
                                  <FormControl><Input placeholder="e.g. johndoe@upi" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        </div>
                        <div className="md:col-span-2">
                             <FormField
                                control={form.control}
                                name={`accounts.${index}.qrCodeFile`}
                                render={() => (
                                <FormItem>
                                    <FormLabel>QR Code Image</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-4">
                                            <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
                                                {previews[fields[index].id!] ? (
                                                    <Image src={previews[fields[index].id!]} alt="QR Preview" width={96} height={96} className="object-contain"/>
                                                ) : (
                                                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                                )}
                                            </div>
                                            <Input 
                                                type="file" 
                                                accept="image/png, image/jpeg, image/webp" 
                                                onChange={(e) => handleFileChange(e, fields[index].id!, index)} 
                                                className="max-w-xs"
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>

        <div className="flex items-center justify-between gap-4">
            <Button 
                type="button" 
                variant="outline" 
                onClick={() => append(createDefaultAccount())}
                disabled={fields.length >= 5}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Another Account
            </Button>
            <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
        </div>
      </form>
    </Form>
  )
}
