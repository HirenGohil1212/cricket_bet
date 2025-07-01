import { MatchTabs } from "@/components/matches/match-tabs";
import { HomePageClient } from "@/app/home-page-client";

export default function Home() {
  return (
    <HomePageClient>
      <MatchTabs />
    </HomePageClient>
  );
}
