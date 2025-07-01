
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BankDetailsForm } from "@/components/admin/bank-details-form";
import { getBankDetails } from "@/app/actions/settings.actions";

export default async function BankDetailsPage() {
    const bankAccounts = await getBankDetails();
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Bank Account Details</CardTitle>
                <CardDescription>
                    Manage the bank accounts and UPI details for receiving payments. You can add up to 5 accounts.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <BankDetailsForm initialData={bankAccounts} />
            </CardContent>
        </Card>
    );
}
