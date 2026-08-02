import type { Metadata } from 'next';
import { Merriweather, Nunito } from 'next/font/google';
import Providers from '@/components/Providers';
import './globals.css';

const headingFont = Merriweather({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-heading',
  display: 'swap',
});

const bodyFont = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Internal Bulk Email Sender',
  description: 'Internal tool for validating and sending bulk email campaigns via Zoho Mail.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}