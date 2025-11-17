
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Gift } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export function ReferralCard() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  
  const referralCode = userProfile?.referralCode || "LOADING..."; 

  const handleCopy = () => {
    if (userProfile?.referralCode) {
      navigator.clipboard.writeText(userProfile.referralCode);
      toast({
        title: "Copied to clipboard!",
        description: "Your referral code is ready to be shared.",
      });
    }
  };

  return (
    <Card className="bg-gradient-to-br from-accent/10 to-accent/20 border-accent/20">
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="p-3 bg-accent rounded-full">
            <Gift className="h-6 w-6 text-accent-foreground" />
        </div>
        <div>
            <CardTitle className="font-headline text-lg text-accent">Refer & Earn</CardTitle>
            <CardDescription className="text-sm">Get a bonus for each friend!</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">Share your code. When your friend signs up, makes a deposit, and places their first bet, you'll both get a bonus!</p>
        <div className="flex items-center space-x-2">
          <Input readOnly value={referralCode} className="font-mono bg-background text-accent border-accent/30" />
          <Button variant="ghost" size="icon" onClick={handleCopy} disabled={!userProfile?.referralCode} className="text-accent hover:text-accent/80">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
