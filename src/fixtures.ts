import type { LevelDatum } from './types';
import { createDeterministicCandles } from './chartUtils';

export const demoCandles = createDeterministicCandles();

export const demoLevels: readonly LevelDatum[] = [
  {
    kind: 'sr-pair',
    id: 'weekly-value-area',
    support: 101.2,
    resistance: 106.8,
    label: 'Weekly value area',
  },
  {
    kind: 'single',
    id: 'pivot',
    price: 104.35,
    label: 'Pivot · 104.35',
    color: '#f5b942',
  },
  {
    kind: 'single',
    id: 'prior-close',
    price: 102.82,
    label: 'Prior close · 102.82',
    color: '#8b95a7',
  },
  {
    kind: 'gex',
    id: 'gex-108',
    price: 108,
    magnitude: 9_600_000,
    maxMagnitude: 10_000_000,
    label: 'Call wall',
  },
  {
    kind: 'gex',
    id: 'gex-105',
    price: 105,
    magnitude: 6_900_000,
    maxMagnitude: 10_000_000,
  },
  {
    kind: 'gex',
    id: 'gex-100',
    price: 100,
    magnitude: -8_100_000,
    maxMagnitude: 10_000_000,
    label: 'Put wall',
  },
  {
    kind: 'dex',
    id: 'dex-106',
    price: 106,
    magnitude: 5_200_000,
    maxMagnitude: 10_000_000,
  },
  {
    kind: 'dex',
    id: 'dex-102',
    price: 102,
    magnitude: -4_300_000,
    maxMagnitude: 10_000_000,
  },
];
