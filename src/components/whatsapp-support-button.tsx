import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons";
import type { AppSettings } from "@/lib/types";

interface WhatsAppSupportButtonProps {
  appSettings?: AppSettings | null;
}

export function WhatsAppSupportButton({ appSettings }: WhatsAppSupportButtonProps) {
  const whatsappNumber = appSettings?.whatsappNumber || "1234567890";

  if (!whatsappNumber) {
    return null;
  }

  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;

  return (
    <div className="fixed bottom-24 right-4 z-40 sm:bottom-28 sm:right-8">
      <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center">
        {/* Orbiting Text */}
        <div className="absolute inset-0 animate-orbit">
          <svg
            viewBox="0 0 120 120"
            className="h-full w-full text-primary opacity-80"
          >
            <defs>
              <path
                id="orbit-path"
                fill="transparent"
                d="M 60, 60 m -45, 0 a 45, 45, 0, 1, 1, 90, 0 a 45, 45, 0, 1, 1, -90, 0"
              />
            </defs>
            <text
              fill="currentColor"
              className="font-headline text-[10px] sm:text-[11px] font-black tracking-widest"
            >
              <textPath href="#orbit-path">
                24 X 7 SUPPORT • 24 X 7 SUPPORT •
              </textPath>
            </text>
          </svg>
        </div>

        {/* Center Button */}
        <Button
          asChild
          className="absolute h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[#25D366] hover:bg-[#128C7E] shadow-[0_4px_20px_rgba(37,211,102,0.4)] transition-transform active:scale-90"
          aria-label="WhatsApp Support"
        >
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </a>
        </Button>
      </div>
    </div>
  );
}
