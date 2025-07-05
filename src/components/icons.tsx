import type { Sport } from "@/lib/types";

const CricketIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5,15.5L18,18L15,21L12.5,18.5L10,21L7.5,18.5L5,21L2,18L4.5,15.5L2,13L5,10L7.5,12.5L10,10L12.5,12.5L15,10L18,13L15.5,15.5M18,6A3,3 0 0,1 15,9A3,3 0 0,1 12,6A3,3 0 0,1 15,3A3,3 0 0,1 18,6Z" />
  </svg>
);

const BadmintonIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
        <path d="M14.7,8.3L16.1,9.7L12,13.8L11.3,13.1L5.9,18.5L2,14.6L7.4,9.2L6.7,8.5L10.8,4.4L12.2,5.8L14.7,8.3M17.5,3C18.3,3 19.1,3.3 19.7,3.9C20.9,5.1 20.9,7 19.7,8.2L18.3,9.6L14.1,5.5L15.5,4.1C16.1,3.5 16.8,3.2 17.5,3Z" />
    </svg>
);

const FootballIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M8.3,4.5L12,12L4.5,8.3C5.5,6.1,6.7,5,8.3,4.5M15.7,4.5C17.3,5,18.5,6.1,19.5,8.3L12,12L15.7,4.5M4.5,15.7C5.5,17.9,6.7,19,8.3,19.5L12,12L4.5,15.7M19.5,15.7C18.5,17.9,17.3,19,15.7,19.5L12,12L19.5,15.7Z" />
    </svg>
);

const TennisIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.5,5A1.5,1.5 0 0,0 18,6.5A1.5,1.5 0 0,0 19.5,8A1.5,1.5 0 0,0 21,6.5A1.5,1.5 0 0,0 19.5,5M3.28,21L12.8,11.5C13.5,12.1,14.5,12.1,15.2,11.5L16.2,10.5C16.8,9.8,16.8,8.8,16.2,8.1L15.2,7.1C14.5,6.5,13.5,6.5,12.8,7.1L3.28,16.7L2,18L6,22L7.3,20.7L3.28,21Z" />
    </svg>
);

const TableTennisIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19,15.5V13H21.5L19,15.5M19,5.5L21.5,8H19V5.5M17.5,16.5L13.88,12.88L15.63,11.13L19.25,14.75L17.5,16.5M6,9A4,4 0 0,0 2,13V21H10V13A4,4 0 0,0 6,9M4,13A2,2 0 0,1 6,11A2,2 0 0,1 8,13V19H4V13Z" />
  </svg>
);

export const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.75 13.96c.25.13.43.2.5.33.07.13.07.55.07.68 0 .13-.1.38-.88 1.16-.78.78-1.38.9-2.25.9-.88 0-1.58-.15-2.25-.45-.67-.3-1.28-.73-1.85-1.28-.58-.55-1.03-1.18-1.3-1.85-.28-.67-.43-1.37-.43-2.25 0-.88.13-1.48.9-2.25.78-.78 1.18-.9 1.95-.9.13 0 .38 0 .5.08.13.07.28.13.33.43.05.3.15.68.18.8.03.13.03.28-.05.38-.08.1-.2.15-.33.28-.13.13-.23.23-.3.3-.08.08-.15.18-.05.33.43.78 1.13 1.48 1.9 1.9.15.1.25.08.33-.05.08-.08.18-.18.3-.3.08-.08.13-.15.28-.15s.3.05.38.18c.07.1.43.5.8.98zM12 2a10 10 0 0 0-10 10c0 1.77.46 3.45 1.25 4.94L2 22l5.06-1.25c1.5.8 3.18 1.25 4.94 1.25a10 10 0 0 0 0-20z" />
  </svg>
);

export const SportIcon = ({ sport, className }: { sport: Sport, className?: string }) => {
  const icons: Record<Sport, React.ElementType> = {
    "Cricket": CricketIcon,
    "Football": FootballIcon,
    "Tennis": TennisIcon,
    "Table Tennis": TableTennisIcon,
    "Badminton": BadmintonIcon,
  };

  const IconComponent = icons[sport];

  return <IconComponent className={className} />;
};
