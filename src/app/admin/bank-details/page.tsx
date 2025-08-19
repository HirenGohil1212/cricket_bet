
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BankAccountList } from "@/components/admin/bank-account-list";
import { getBankDetails } from "@/app/actions/settings.actions";
import { AddBankAccountForm } from "@/components/admin/add-bank-account-form";
import { Separator } from "@/components/ui/separator";

export default async function BankDetailsPage() {
    const bankAccounts = await getBankDetails();
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Add New Bank Account</CardTitle>
                    <CardDescription>
                        Add a new bank account or UPI detail for receiving payments.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AddBankAccountForm />
                </CardContent>
            </Card>

            <Separator />
            
            <Card>
                <CardHeader>
                    <CardTitle>Saved Bank Accounts</CardTitle>
                    <CardDescription>
                       Manage your existing bank accounts.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <BankAccountList initialBankAccounts={bankAccounts} />
                </CardContent>
            </Card>
        </div>
    );
}
