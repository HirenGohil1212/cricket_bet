
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

interface InstallPwaDialogProps {
  isOpen: boolean;
  isIos: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: () => void;
}

const IosInstructions = () => (
  <div className="text-center text-sm space-y-4">
    <p>To install the app on your iOS device, please follow these steps:</p>
    <ol className="text-left list-decimal list-inside space-y-2">
      <li>Tap the <span className="font-bold">Share</span> button in the Safari toolbar.</li>
      <li>Scroll down and tap on <span className="font-bold">Add to Home Screen</span>.</li>
      <li>Confirm by tapping <span className="font-bold">Add</span> in the top right.</li>
    </ol>
     <div className="flex justify-center items-center gap-2 text-muted-foreground">
        <ArrowUpSquare className="h-8 w-8 border rounded-md p-1" />
        <span>&larr; Tap this icon</span>
     </div>
  </div>
);


export function InstallPwaDialog({ isOpen, onOpenChange, onInstall, isIos }: InstallPwaDialogProps) {

  const handleInstall = () => {
    onInstall();
    onOpenChange(false);
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
             <Image src="/icons/icon-192x192.png" alt="App Logo" width={80} height={80} className="rounded-2xl" />
          </div>
          <AlertDialogTitle className="text-center">Install Guess & Win App</AlertDialogTitle>
          <AlertDialogDescription asChild>
             {isIos ? (
              <IosInstructions />
            ) : (
              <div className="text-center">
                For a better experience, install our app on your device. It's fast, uses less data, and gives you easy one-tap access from your home screen.
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel>Not Now</AlertDialogCancel>
           {!isIos && (
              <AlertDialogAction onClick={handleInstall} asChild>
                <Button>Install</Button>
              </AlertDialogAction>
           )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
