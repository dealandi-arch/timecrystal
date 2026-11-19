'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import TimeCrystalRPG from './TimeCrystalRPG';
import GroupRankView from '../profile/GroupRankView';
import { getPath, pathLevelIds, pathLevels } from './paths';
import { LEVELS } from './levels';

// Plays one path from level 1 to its boss, and shows that path's World Rank below.
export default function PathPlayer({ pathId }: { pathId: string }) {
  const path = getPath(pathId)!;
  const play = useMemo(
    () => ({
      levels: pathLevels(pathId),
      chapters: path.chapters,
      pathName: path.name,
      pathIcon: path.icon,
      finale: { title: `${path.name} complete`, text: `${path.villain} is beaten. Try another path, or beat your times for the World Rank.` },
    }),
    [pathId, path]
  );
  const rankLevels = useMemo(
    () =>
      pathLevelIds(pathId).map((id, i) => ({
        id,
        name: `${i + 1}. ${path.style ? path.chapters[i].title : LEVELS.find((l) => l.id === id)?.name ?? `Level ${id}`}`,
      })),
    [pathId, path]
  );
  return (
    <>
      {path.style ? <TimeCrystalRPG mode="custom" custom={play} /> : <p><Link href="/play">Play the Normal Path</Link> or <Link href="/story">Story mode</Link>.</p>}
      <h2 id="rank">World records · {path.name}</h2>
      <p>
        The fastest time on every level of this path, and the overall standings. <Link href="/paths">Other paths</Link>
      </p>
      <GroupRankView api={`/api/leaderboard/path?path=${pathId}`} levels={rankLevels} label="levels" emptyText="No one has cleared a level on this path yet. Be the first." />
    </>
  );
}
