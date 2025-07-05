import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons";

export function WhatsAppSupportButton() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative flex h-28 w-28 items-center justify-center">
        {/* Orbiting Text */}
        <div className="absolute inset-0 animate-orbit">
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full"
          >
            <defs>
              <path
                id="orbit-path"
                fill="transparent"
                d="M 50, 50 m -42, 0 a 42,42 0 1,1 82,0 a 42,42 0 1,1 -82,0"
              />
            </defs>
            <text
              className="fill-primary font-headline text-[10px] font-bold tracking-wider"
            >
              <textPath xlinkHref="#orbit-path" startOffset="25%" textAnchor="middle">
                24 X 7 SUPPORT
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
          <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon className="h-8 w-8 text-white" />
          </a>
        </Button>
      </div>
    </div>
  );
}
