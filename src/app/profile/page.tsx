
import { HomePageClient } from "@/app/home-page-client";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserProfileForm } from "@/components/profile/user-profile-form";
import { auth } from "@/lib/firebase";
import { getUserBankAccount } from "../actions/user.actions";


export default function ProfilePage() {
    return (
        <HomePageClient>
            <div className="space-y-8">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                   <ProfileFormSection />
                </Suspense>
            </div>
        </HomePageClient>
    );
}

async function ProfileFormSection() {
    // We get the user on the server to avoid a flash of unauthenticated content
    const user = auth.currentUser;
    const bankAccount = user ? await getUserBankAccount(user.uid) : null;
    
    return <UserProfileForm initialData={bankAccount} />
}
