
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
    <p>To install this web app on your device, tap the button below and then choose <span className="font-bold">Add to Home Screen</span>.</p>
    <div className="flex justify-center items-center gap-2 text-muted-foreground p-2 rounded-lg bg-muted">
       <div className="border rounded-md p-2 bg-background">
        <ArrowUpSquare className="h-8 w-8" />
       </div>
       <span>&larr; Tap the 'Share' icon</span>
    </div>
  </div>
);

const DefaultInstructions = () => (
    <div className="text-center">
      For the best experience, install our app on your device. It's fast, uses less data, and gives you one-tap access from your home screen.
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
              <DefaultInstructions />
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Not Now</AlertDialogCancel>
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
