import type { AbilityId } from './save';

export const ABILITIES: { id: AbilityId; name: string; description: string }[] = [
  {
    id: 'navigate',
    name: 'Navigate',
    description: 'Reveals a live arrow pointing at the time crystal for the rest of this level.'
  },
  {
    id: 'killAll',
    name: 'Kill All',
    description: 'Instantly defeats every enemy in this level. Cannot be used on the boss level.'
  },
  {
    id: 'invisibility',
    name: 'Invisibility',
    description: 'Enemies can no longer see or hurt you for the rest of this level.'
  },
  {
    id: 'iceAge',
    name: 'Ice Age',
    description: 'Freezes every enemy solid and reveals the time crystal’s location, even in secret rooms.'
  }
];
