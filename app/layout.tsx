import './globals.css';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Fraunces, JetBrains_Mono } from 'next/font/google';

import BottomNav from '@/app/components/BottomNav';
import EmailVerificationBanner from '@/app/components/EmailVerificationBanner';
import Header from '@/app/components/Header';
import { AppMain } from '@/app/components/AppMain';
import { Providers } from '@/providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  axes: ['opsz'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Harmony - Find Love Through Music',
  description: 'Connect with people who share your passion for music. Match based on your music taste and discover your perfect concert companion.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${jetbrainsMono.variable} antialiased`}>
        <Providers>
          <Header />
          <EmailVerificationBanner />
          <AppMain>{children}</AppMain>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
