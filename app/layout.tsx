import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ProfileProvider } from '../components/profile/ProfileContext';
import { CollectionProvider } from '../components/profile/CollectionContext';
import { ProgressionProvider } from '../components/profile/ProgressionContext';
import UpdateLog from '../components/UpdateLog';
import NotificationPopup from '../components/NotificationPopup';
import ChallengeWatcher from '../components/pvp/ChallengeWatcher';

const font = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Time Crystal',
  description: 'Time Crystal: a pixel-art adventure across shattered timelines. Collect heroes, climb the world rankings and build your own levels.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.className}>
      <body>
        <ProfileProvider>
          <CollectionProvider>
            <ProgressionProvider>
              {children}
              <UpdateLog />
              <NotificationPopup />
              <ChallengeWatcher />
            </ProgressionProvider>
          </CollectionProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
