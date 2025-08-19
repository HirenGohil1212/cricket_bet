

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import * as React from "react";
import Image from "next/image";
import { PlusCircle, Trash2, UploadCloud, Loader2, CheckCircle } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { debounce } from 'lodash';

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
import { updateBankDetails } from "@/app/actions/settings.actions";
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
import { cn } from "@/lib/utils";

interface BankDetailsFormProps {
    initialData: BankAccount[];
}

type SavingState = 'idle' | 'saving' | 'saved';

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
  const [savingState, setSavingState] = React.useState<SavingState>('idle');
  const [previews, setPreviews] = React.useState<Record<string, string>>({});

  const form = useForm<BankDetailsFormValues>({
    resolver: zodResolver(bankDetailsFormSchema),
    defaultValues: {
      accounts: initialData.length > 0 ? initialData.map(acc => ({ ...acc, id: acc.id || uuidv4() })) : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "accounts",
  });
  
  React.useEffect(() => {
    const initialPreviews = initialData.reduce((acc, account) => {
        if (account.id && account.qrCodeUrl) {
            acc[account.id] = account.qrCodeUrl;
        }
        return acc;
    }, {} as Record<string, string>);
    setPreviews(initialPreviews);
     form.reset({
      accounts: initialData.length > 0 ? initialData.map(acc => ({ ...acc, id: acc.id || uuidv4() })) : [],
    });
  }, [initialData, form]);
  
  
  const debouncedSave = React.useCallback(
      debounce(async (data: BankDetailsFormValues) => {
          setSavingState('saving');
          try {
            const result = await updateBankDetails(data.accounts);
            if (result.error) {
                toast({ variant: 'destructive', title: 'Auto-save Failed', description: result.error });
                setSavingState('idle');
            } else {
                setSavingState('saved');
                router.refresh();
                setTimeout(() => setSavingState('idle'), 2000);
            }
          } catch (error: any) {
             toast({ variant: 'destructive', title: 'Save Failed', description: error.message || 'An unknown error occurred.' });
             setSavingState('idle');
          }
      }, 1500),
  [toast, router]
  );
  
  const watchedFields = useWatch({ control: form.control, name: 'accounts' });
  const isDirty = form.formState.isDirty;

  React.useEffect(() => {
    if (isDirty) {
      const validation = bankDetailsFormSchema.safeParse({ accounts: watchedFields });
      if (validation.success) {
          debouncedSave(validation.data);
      }
    }
  }, [watchedFields, isDirty, debouncedSave]);


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
        form.setValue(`accounts.${index}.qrCodeFile`, file, { shouldValidate: true, shouldDirty: true });
        setPreviews(prev => ({...prev, [fieldId]: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
        <div className="flex items-center justify-end">
             <div className={cn("flex items-center gap-1 text-xs text-muted-foreground transition-opacity", savingState !== 'idle' ? 'opacity-100' : 'opacity-0')}>
                {savingState === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
                {savingState === 'saving' && <span>Saving...</span>}
                {savingState === 'saved' && <CheckCircle className="h-3 w-3 text-green-500" />}
                {savingState === 'saved' && <span className="text-green-500">Saved</span>}
            </div>
        </div>
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
                                This will remove this bank account. The change will be saved automatically.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => remove(index)}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                Remove
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
                disabled={fields.length >= 5 || savingState === 'saving'}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Another Account
            </Button>
        </div>
      </form>
    </Form>
  )
}
