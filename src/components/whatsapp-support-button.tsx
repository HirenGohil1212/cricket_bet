import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons";

export function WhatsAppSupportButton() {
  return (
    <Button
      asChild
      className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-[#25D366] hover:bg-[#128C7E] shadow-lg z-50 flex items-center justify-center"
      aria-label="WhatsApp Support"
    >
      <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer">
        <WhatsAppIcon className="h-8 w-8 text-white" />
      </a>
    </Button>
  );
}
