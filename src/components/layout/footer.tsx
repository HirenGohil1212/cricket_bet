
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="relative w-full py-4 bg-primary">
      <div className="relative z-10 container mx-auto px-4 flex flex-col items-center justify-center h-full space-y-2">
        <div className="flex items-center justify-center gap-4">
          <Image src="/gt.png" alt="gt logo" width={40} height={40} className="object-contain" />
          <Image src="/gamecare.png" alt="Gamecare logo" width={40} height={40} className="object-contain" />
          <Image src="/18plus.png" alt="18+ logo" width={40} height={40} className="object-contain" />
          <Image src="/ssl.png" alt="SSL Secure logo" width={80} height={40} className="object-contain" />
        </div>
        <p className="text-xs font-bold text-primary-foreground">© Copyright 2025. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
