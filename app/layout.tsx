import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ProfileProvider } from '../components/profile/ProfileContext';

const font = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Time Crystal',
  description: 'A new Next.js website for the Time Crystal game project.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.className}>
      <body>
        <ProfileProvider>{children}</ProfileProvider>
      </body>
    </html>
  );
}
