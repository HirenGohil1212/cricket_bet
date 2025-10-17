
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import Image from "next/image";
import { ArrowUpSquare } from "lucide-react";
import { usePwaInstall } from "@/context/pwa-install-context";

const IosInstructions = () => (
  <div className="text-center text-sm space-y-4">
    <p>To install the app, open the site in Safari, tap the 'Share' button, then scroll down and select 'Add to Home Screen'.</p>
    <div className="flex justify-center items-center gap-2 text-muted-foreground p-2 rounded-lg bg-muted">
       <div className="border rounded-md p-2 bg-background">
        <ArrowUpSquare className="h-10 w-10" />
       </div>
       <span className="font-semibold text-lg">&larr; Tap the 'Share' icon</span>
    </div>
  </div>
);

const DefaultInstructions = () => (
    <div className="text-center text-sm">
      For the best experience, install our app on your device. It's fast, uses less data, and gives you one-tap access from your home screen.
    </div>
);

export function InstallPwaDialog() {
  const { isDialogOpen, setIsDialogOpen, isIos } = usePwaInstall();
  
  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
             <Image src="/UPI11 ICONE.png" alt="App Logo" width={80} height={80} className="rounded-2xl" />
          </div>
          <AlertDialogTitle className="text-center">Install UPI11 App</AlertDialogTitle>
          <AlertDialogDescription asChild>
             {isIos ? (
              <IosInstructions />
            ) : (
              <DefaultInstructions />
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
