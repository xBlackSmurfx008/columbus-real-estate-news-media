'use client';

import { DM_Sans, Playfair_Display, Space_Grotesk } from 'next/font/google';
import '../globals.css';
import '../cren-v2.css';
import { AdminAuthWrapper } from '@/components/admin/admin-auth-wrapper';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased bg-white">
        <AdminAuthWrapper>
          {children}
        </AdminAuthWrapper>
      </body>
    </html>
  );
}
