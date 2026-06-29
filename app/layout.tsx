import type { Metadata } from 'next';
import './globals.css';
import { ProfileProvider } from '../components/profile/ProfileContext';

export const metadata: Metadata = {
  title: 'Time Crystal',
  description: 'A new Next.js website for the Time Crystal game project.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ProfileProvider>{children}</ProfileProvider>
      </body>
    </html>
  );
}
