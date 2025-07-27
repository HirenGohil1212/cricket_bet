
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

interface InstallPwaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: () => void;
}

export function InstallPwaDialog({ isOpen, onOpenChange, onInstall }: InstallPwaDialogProps) {

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
          <AlertDialogDescription className="text-center">
            For a better experience, install our app on your device. It's fast, uses less data, and you'll get notifications for new matches!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel>Not Now</AlertDialogCancel>
          <AlertDialogAction onClick={handleInstall} asChild>
            <Button>Install</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
