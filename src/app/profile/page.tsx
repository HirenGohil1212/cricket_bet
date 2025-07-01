
import { HomePageClient } from "@/app/home-page-client";
import { UserProfileForm } from "@/components/profile/user-profile-form";


export default function ProfilePage() {
    return (
        <HomePageClient>
            <div className="space-y-8">
                <UserProfileForm />
            </div>
        </HomePageClient>
    );
}
