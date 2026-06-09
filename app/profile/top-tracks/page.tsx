import TopTracks from '@/app/components/TopTracks';
import { getMostListened } from '@/serverActions';
import { UserTopTracks } from '@/types';
import Link from 'next/link';

const TopTracksPage = async () => {
  const mostListenedTracks = await getMostListened('tracks');

  if (!mostListenedTracks?.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Unable to load your top tracks right now.</p>
          <Link href="/profile" className="text-primary hover:underline text-sm">
            ← Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopTracks mostListenedTracks={mostListenedTracks.data as UserTopTracks} />
    </div>
  );
};

export default TopTracksPage;
