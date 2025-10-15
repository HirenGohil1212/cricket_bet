
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="relative w-full h-24 bg-green-700 text-white">
      <Image
        src="/footer-bg.png"
        alt="Footer Background"
        layout="fill"
        objectFit="cover"
        objectPosition="center"
        quality={100}
      />
      <div className="relative z-10 flex items-center justify-center h-full">
        <p className="text-xs text-white/80">© Copyright 2025. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
