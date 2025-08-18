
import { HomePageClient } from "@/app/home-page-client";
import { UserProfileForm } from "@/components/profile/user-profile-form";
import { getContent } from "@/app/actions/content.actions";
import type { AppSettings, ContentSettings } from "@/lib/types";
import { getAppSettings } from "@/app/actions/settings.actions";


export default async function ProfilePage() {
    const [content, appSettings] = await Promise.all([
      getContent(),
      getAppSettings()
    ]);

    return (
        <HomePageClient content={content} appSettings={appSettings}>
            <div className="space-y-8">
                <UserProfileForm />
            </div>
        </HomePageClient>
    );
}
