
import { HomePageClient } from "@/app/home-page-client";
import { UserProfileForm } from "@/components/profile/user-profile-form";
import { getContent } from "@/app/actions/content.actions";
import type { ContentSettings } from "@/lib/types";


export default async function ProfilePage() {
    const content: ContentSettings | null = await getContent();

    return (
        <HomePageClient content={content}>
            <div className="space-y-8">
                <UserProfileForm />
            </div>
        </HomePageClient>
    );
}
