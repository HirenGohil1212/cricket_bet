
import type {Metadata, Viewport} from 'next';
import { PT_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/context/auth-context-provider';
import { cn } from '@/lib/utils';
import { PwaInstallProvider } from '@/context/pwa-install-context';
import { InstallPwaDialog } from '@/components/install-pwa-dialog';


const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-playfair-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'UPI11',
  description: 'Predict scores and win!',
   icons: {
    icon: '/favicon.ico',
    apple: '/UPI11 ICONE.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#C8A850',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
          <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={cn("font-body antialiased", ptSans.variable, playfairDisplay.variable)}>
        <AuthProvider>
            <PwaInstallProvider>
                {children}
                <InstallPwaDialog />
            </PwaInstallProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
