'use client';

import GroupRankView from './GroupRankView';
import { LEVELS_3D } from '../rpg/levels3d';

const MAPS = LEVELS_3D.map((l) => ({ id: l.id, name: l.name.replace('3D · ', '') }));

export default function Rank3D() {
  return <GroupRankView api="/api/leaderboard/3d" levels={MAPS} label="maps" emptyText="No one has cleared a 3D map yet. Be the first." />;
}
