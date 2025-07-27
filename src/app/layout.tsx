
import type {Metadata, Viewport} from 'next';
import { PT_Sans, Poppins } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/context/auth-context';
import { cn } from '@/lib/utils';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ScoreCast',
  description: 'Predict scores and win!',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#32CD32',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("font-body antialiased", ptSans.variable, poppins.variable)}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
