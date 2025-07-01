
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as React from "react";
import Image from "next/image";
import { PlusCircle, Trash2, UploadCloud } from "lucide-react";

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

interface BankDetailsFormProps {
    initialData: BankAccount[];
}

const defaultAccount = {
  upiId: '',
  accountHolderName: '',
  accountNumber: '',
  ifscCode: '',
  qrCodeUrl: '',
};

export function BankDetailsForm({ initialData }: BankDetailsFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // State to hold previews for newly selected files
  const [previews, setPreviews] = React.useState<Record<number, string>>({});

  const form = useForm<BankDetailsFormValues>({
    resolver: zodResolver(bankDetailsFormSchema),
    defaultValues: {
      accounts: initialData.length > 0 ? initialData : [defaultAccount],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "accounts",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file on the client side before creating a preview
      if (file.size > 5 * 1024 * 1024) {
          form.setError(`accounts.${index}.qrCode`, { message: "Max file size is 5MB." });
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        form.setValue(`accounts.${index}.qrCodeDataUri`, result);
        form.setValue(`accounts.${index}.qrCode`, file); // Also store file for validation
        form.clearErrors(`accounts.${index}.qrCode`);
        setPreviews(prev => ({...prev, [index]: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(data: BankDetailsFormValues) {
    setIsSubmitting(true);
    const result = await updateBankDetails(data);
    
    if (result.error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: result.error,
        });
    } else {
        toast({
            title: "Success!",
            description: result.success,
        });
        setPreviews({});
        // We don't router.refresh() here to avoid refetching and resetting the form,
        // as the server action already revalidates the path for subsequent page loads.
    }
    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
            {fields.map((field, index) => (
                <Card key={field.id} className="relative pt-8 border-border">
                    {fields.length > 1 && (
                      <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(index)}
                      >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove Account</span>
                      </Button>
                    )}
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
                                name={`accounts.${index}.qrCode`}
                                render={() => (
                                <FormItem>
                                    <FormLabel>QR Code Image</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-4">
                                            <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
                                                {previews[index] ? (
                                                    <Image src={previews[index]} alt="QR Preview" width={96} height={96} className="object-contain"/>
                                                ) : form.getValues(`accounts.${index}.qrCodeUrl`) ? (
                                                     <Image src={form.getValues(`accounts.${index}.qrCodeUrl`)!} alt="Current QR Code" width={96} height={96} className="object-contain" />
                                                ) : (
                                                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                                )}
                                            </div>
                                            <Input 
                                                type="file" 
                                                accept="image/png, image/jpeg, image/webp" 
                                                onChange={(e) => handleFileChange(e, index)} 
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
                onClick={() => append(defaultAccount)}
                disabled={fields.length >= 5 || isSubmitting}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Another Account
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
        </div>
      </form>
    </Form>
  )
}
