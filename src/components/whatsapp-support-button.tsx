import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons";

export function WhatsAppSupportButton() {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center">
      {/* SVG for curved text */}
      <div className="w-24 h-8 pointer-events-none">
        <svg
          viewBox="0 0 100 33"
          className="w-full h-full text-primary font-headline font-bold"
          style={{ fontSize: '14px' }}
        >
          <path
            id="curve"
            fill="transparent"
            d="M 0 33 A 50 50 0 0 1 100 33"
          />
          <text textAnchor="middle">
            <textPath href="#curve" startOffset="50%">
              24 X 7
            </textPath>
          </text>
        </svg>
      </div>
      {/* The button */}
      <Button
        asChild
        className="h-16 w-16 rounded-full bg-[#25D366] hover:bg-[#128C7E] shadow-lg flex items-center justify-center mt-[-4px]"
        aria-label="WhatsApp Support"
      >
        <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon className="h-8 w-8 text-white" />
        </a>
      </Button>
    </div>
  );
}
