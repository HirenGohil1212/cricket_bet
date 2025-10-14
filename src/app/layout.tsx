
import type {Metadata, Viewport} from 'next';
import { PT_Sans, Poppins } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { PwaInstallProvider } from '@/context/pwa-install-context';
import { InstallPwaDialog } from '@/components/install-pwa-dialog';


const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'UPI11',
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
