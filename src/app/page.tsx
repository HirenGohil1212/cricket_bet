import { MatchTabs } from "@/components/matches/match-tabs";
import { HomePageClient } from "@/app/home-page-client";
import { getContent } from "@/app/actions/content.actions";
import type { ContentSettings } from "@/lib/types";

export default async function Home() {
  const content: ContentSettings | null = await getContent();
  
  return (
    <HomePageClient content={content}>
      <MatchTabs />
    </HomePageClient>
  );
}
