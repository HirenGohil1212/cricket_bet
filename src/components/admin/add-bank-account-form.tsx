
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { UploadCloud, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { bankAccountSchema, type BankAccount } from "@/lib/schemas";
import { addBankAccount } from "@/app/actions/settings.actions";
import { uploadFile } from "@/lib/storage";

type AddBankAccountFormValues = Omit<BankAccount, 'id' | 'qrCodeUrl' | 'qrCodePath'> & {
  qrCodeFile?: File;
};

const formSchema = bankAccountSchema.omit({ 
    id: true, 
    qrCodeUrl: true, 
    qrCodePath: true 
}).extend({
    qrCodeFile: bankAccountSchema.shape.qrCodeFile.optional()
});

interface AddBankAccountFormProps {
    onAccountAdded: (newAccount: BankAccount) => void;
}

export function AddBankAccountForm({ onAccountAdded }: AddBankAccountFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);

  const form = useForm<AddBankAccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      upiId: "",
      accountHolderName: "",
      accountNumber: "",
      ifscCode: "",
      qrCodeFile: undefined,
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue("qrCodeFile", file, { shouldValidate: true });
    }
  };

  const clearImage = () => {
    setPreview(null);
    form.setValue("qrCodeFile", undefined, { shouldValidate: true });
    // Reset the file input element
    const input = document.getElementById('qrCodeFile') as HTMLInputElement;
    if (input) {
      input.value = "";
    }
  }

  async function onSubmit(data: AddBankAccountFormValues) {
    setIsSubmitting(true);
    let uploadResult: { downloadUrl: string; storagePath: string } | null = null;
    
    try {
      if (data.qrCodeFile) {
        uploadResult = await uploadFile(data.qrCodeFile, 'qrcodes');
      }

      const payload: BankAccount = {
        id: uuidv4(),
        upiId: data.upiId,
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        qrCodeUrl: uploadResult?.downloadUrl || '',
        qrCodePath: uploadResult?.storagePath || '',
      };

      const result = await addBankAccount(payload);

      if (result.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
      } else {
        toast({ title: "Account Added", description: result.success });
        onAccountAdded(payload); // Notify parent component
        form.reset();
        clearImage();
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Operation Failed", description: error.message || "An unknown error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
                control={form.control}
                name="accountHolderName"
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
                name="accountNumber"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl><Input placeholder="e.g. 1234567890" {...field} /></FormControl>
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
                    <FormControl><Input placeholder="e.g. SBIN0001234" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="upiId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>UPI ID</FormLabel>
                    <FormControl><Input placeholder="e.g. johndoe@upi" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="qrCodeFile"
                render={() => (
                <FormItem>
                    <FormLabel>QR Code Image (Optional)</FormLabel>
                    <div className="flex items-center gap-4">
                      <div className="relative w-24 h-24 border rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
                        {preview ? (
                          <>
                            <Image src={preview} alt="QR Preview" width={96} height={96} className="object-contain" />
                            <Button type="button" variant="ghost" size="icon" onClick={clearImage} className="absolute top-0 right-0 h-6 w-6 bg-background/50 hover:bg-background/80">
                               <X className="h-4 w-4 text-destructive"/>
                            </Button>
                          </>
                        ) : (
                          <UploadCloud className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <FormControl>
                        <Input
                          id="qrCodeFile"
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleFileChange}
                          className="max-w-xs"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Account"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
