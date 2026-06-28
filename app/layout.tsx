import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Time Crystal',
  description: 'A new Next.js website for the Time Crystal game project.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
