
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons";
import type { AppSettings } from "@/lib/types";

interface WhatsAppSupportButtonProps {
  appSettings?: AppSettings | null;
}

export function WhatsAppSupportButton({ appSettings }: WhatsAppSupportButtonProps) {
  const whatsappNumber = appSettings?.whatsappNumber || "1234567890"; // Fallback number

  if (!whatsappNumber) {
    return null; // Should not happen with the fallback, but good for safety
  }

  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <div className="relative flex h-28 w-28 items-center justify-center">
        {/* Orbiting Text */}
        <div className="absolute inset-0 animate-orbit">
          <svg
            viewBox="0 0 120 120" // Increased viewBox for more space
            className="h-full w-full text-primary"
          >
            <defs>
              <path
                id="orbit-path"
                fill="transparent"
                // Path centered in the new viewBox with a larger radius
                d="M 60, 60 m -50, 0 a 50, 50, 0, 1, 1, 100, 0 a 50, 50, 0, 1, 1, -100, 0"
              />
            </defs>
            <text
              fill="currentColor" // Use currentColor for fill
              // Apply theme color via text-* class and adjust font
              className="font-headline text-[11px] font-bold tracking-wider"
            >
              <textPath href="#orbit-path"> {/* Use modern href attribute */}
                24 X 7 SUPPORT • 24 X 7 SUPPORT •
              </textPath>
            </text>
          </svg>
        </div>

        {/* Center Button */}
        <Button
          asChild
          className="absolute h-16 w-16 rounded-full bg-[#25D366] hover:bg-[#128C7E] shadow-lg"
          aria-label="WhatsApp Support"
        >
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon className="h-8 w-8 text-white" />
          </a>
        </Button>
      </div>
    </div>
  );
}
