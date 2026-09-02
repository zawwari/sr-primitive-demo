import { describe, expect, it } from 'vitest';
import {
  colorWithAlpha,
  createDeterministicCandles,
  exposureBarWidth,
  formatExposure,
  normalizeConfig,
} from './chartUtils';
import { demoLevels } from './fixtures';

describe('chart utilities', () => {
  it('creates repeatable valid candle fixtures', () => {
    const first = createDeterministicCandles();
    const second = createDeterministicCandles();

    expect(first).toEqual(second);
    expect(first).toHaveLength(120);
    expect(first.every(({ high, low, open, close }) =>
      high >= Math.max(open, close) && low <= Math.min(open, close))).toBe(true);
  });

  it('normalizes defaults and clamps pair opacity', () => {
    const candles = createDeterministicCandles();
    const normalized = normalizeConfig({
      candles,
      levels: [{
        kind: 'sr-pair',
        id: ' range ',
        support: 100,
        resistance: 110,
        fillOpacity: 3,
      }],
    });

    expect(normalized.theme).toBe('dark');
    expect(normalized.mobile.enabled).toBe(true);
    expect(normalized.levels[0]).toMatchObject({ id: 'range', fillOpacity: 1 });
  });

  it.each([
    {
      name: 'duplicate family ids',
      levels: [demoLevels[0], demoLevels[0]],
      message: 'Duplicate level id',
    },
    {
      name: 'reversed support and resistance',
      levels: [{ kind: 'sr-pair', id: 'bad-range', support: 110, resistance: 100 }],
      message: 'Support must be below resistance',
    },
    {
      name: 'invalid exposure scale',
      levels: [{ kind: 'gex', id: 'bad-gex', price: 100, magnitude: 2, maxMagnitude: 0 }],
      message: 'must be greater than zero',
    },
  ] as const)('rejects $name', ({ levels, message }) => {
    expect(() => normalizeConfig({
      candles: createDeterministicCandles(),
      levels,
    })).toThrow(message);
  });

  it('scales and caps exposure bars', () => {
    expect(exposureBarWidth(5, 10, 100)).toBe(50);
    expect(exposureBarWidth(-20, 10, 100)).toBe(100);
    expect(exposureBarWidth(5, 0, 100)).toBe(0);
    expect(formatExposure(9_600_000)).toBe('9.6M');
  });

  it('adds alpha to six-digit hex colors and preserves other CSS colors', () => {
    expect(colorWithAlpha('#2fc7a1', 0.25)).toBe('rgba(47, 199, 161, 0.25)');
    expect(colorWithAlpha('currentColor', 0.25)).toBe('currentColor');
  });
});
