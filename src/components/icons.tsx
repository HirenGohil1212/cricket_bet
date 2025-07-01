import type { Sport } from "@/lib/types";

const CricketIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 13.5l-5 5" />
    <path d="M13 18l-1.5-1.5" />
    <path d="M12 15l-1.5-1.5" />
    <path d="M14 8l-8 8" />
    <path d="M12.5 3.5c-2 2-2 5.5 0 7.5s5.5 2 7.5 0l-5-5z" />
  </svg>
);

const BadmintonIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 9.5L5 19" />
    <path d="M15 13l-4 4" />
    <path d="M8 12l4 4" />
    <path d="M17 11l-4 4" />
    <path d="M21 7l-4 4" />
    <path d="M12 22a2.5 2.5 0 0 1-4-3l7-7a2.5 2.5 0 0 1 3.5 3.5L12 22z" />
  </svg>
);

const FootballIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2L12 22" />
    <path d="M2 12L22 12" />
    <path d="M5.636 5.636l12.728 12.728" />
    <path d="M18.364 5.636l-12.728 12.728" />
  </svg>
);

const TennisIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M4.222 19.778A9.95 9.95 0 0 0 12 22a9.95 9.95 0 0 0 7.778-2.222" />
    <path d="M19.778 4.222A9.95 9.95 0 0 0 12 2a9.95 9.95 0 0 0-7.778 2.222" />
  </svg>
);

const TableTennisIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 13.5l-5 5" />
    <path d="M13 18l-1.5-1.5" />
    <path d="M12 15l-1.5-1.5" />
    <path d="M9 12l-1.5-1.5" />
    <circle cx="7.5" cy="7.5" r="4.5" />
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
