import { mount } from './levelsChart';
import type { LevelDatum } from './types';

const el = document.getElementById('chart')!;

const levels: LevelDatum[] = [
  {
    kind: 'sr-pair',
    id: 'sr-1',
    support: 96,
    resistance: 103,
    label: 'Weekly S/R',
  },
  {
    kind: 'single',
    id: 'pivot',
    price: 100,
    label: 'Pivot',
    color: '#f0b90b',
  },
  { kind: 'gex', id: 'gex-105', price: 105, magnitude: 8_500_000, maxMagnitude: 10_000_000 },
  { kind: 'gex', id: 'gex-95', price: 95, magnitude: -6_200_000, maxMagnitude: 10_000_000 },
  { kind: 'dex', id: 'dex-102', price: 102, magnitude: 3_100_000, maxMagnitude: 10_000_000 },
];

const handle = mount(el, { levels, theme: 'dark' });

// Demonstrates the update() path — swap the S/R pair after 3s.
setTimeout(() => {
  handle.update({
    levels: levels.map((l) =>
      l.kind === 'sr-pair' ? { ...l, support: 94, resistance: 105 } : l
    ),
    theme: 'dark',
  });
}, 3000);
