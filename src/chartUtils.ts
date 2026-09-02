import type {
  CandlestickData,
  Time,
  UTCTimestamp,
} from 'lightweight-charts';
import type {
  ChartTheme,
  GexDexLevel,
  LevelDatum,
  LevelsChartConfig,
  SupportResistancePair,
} from './types';

export const DEFAULT_MOBILE_BREAKPOINT = 720;
export const EXPOSURE_PROFILE_WIDTH = 128;

export interface NormalizedLevelsChartConfig {
  levels: LevelDatum[];
  candles: CandlestickData<Time>[];
  theme: ChartTheme;
  mobile: {
    enabled: boolean;
    breakpoint: number;
    screenshotAlt: string;
  };
}

export function normalizeConfig(
  config: LevelsChartConfig,
  fallbackCandles: readonly CandlestickData<Time>[] = [],
): NormalizedLevelsChartConfig {
  const ids = new Set<string>();
  const levels = config.levels.map((level) => normalizeLevel(level, ids));
  const candles = [...(config.candles ?? fallbackCandles)];

  if (candles.length === 0) {
    throw new TypeError('At least one candle is required.');
  }

  return {
    levels,
    candles,
    theme: config.theme ?? 'dark',
    mobile: {
      enabled: config.mobile?.enabled ?? true,
      breakpoint: positiveNumber(
        config.mobile?.breakpoint ?? DEFAULT_MOBILE_BREAKPOINT,
        'mobile.breakpoint',
      ),
      screenshotAlt:
        config.mobile?.screenshotAlt ??
        'Static market chart preview. Activate to open the interactive chart.',
    },
  };
}

export function exposureBarWidth(
  magnitude: number,
  maxMagnitude: number,
  availableWidth = EXPOSURE_PROFILE_WIDTH,
): number {
  if (!Number.isFinite(magnitude) || !Number.isFinite(maxMagnitude) || maxMagnitude <= 0) {
    return 0;
  }

  return Math.min(Math.abs(magnitude) / maxMagnitude, 1) * Math.max(availableWidth, 0);
}

export function formatExposure(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function colorWithAlpha(color: string, alpha: number): string {
  const normalized = color.trim();
  const hex = normalized.match(/^#([\da-f]{6})$/i)?.[1];
  if (!hex) {
    return normalized;
  }

  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${clamp(alpha, 0, 1)})`;
}

export function createDeterministicCandles(): CandlestickData<Time>[] {
  const dayInSeconds = 86_400;
  const start = Math.floor(Date.UTC(2025, 9, 1) / 1_000);
  let previousClose = 102.4;

  return Array.from({ length: 120 }, (_, index) => {
    const trend = index * 0.035;
    const cycle = Math.sin(index / 5.8) * 2.6 + Math.cos(index / 13) * 1.2;
    const close = roundToCents(101.5 + trend + cycle);
    const open = roundToCents(previousClose + Math.sin(index * 1.7) * 0.45);
    const high = roundToCents(Math.max(open, close) + 0.55 + (index % 5) * 0.09);
    const low = roundToCents(Math.min(open, close) - 0.48 - (index % 4) * 0.08);
    previousClose = close;

    return {
      time: (start + index * dayInSeconds) as UTCTimestamp,
      open,
      high,
      low,
      close,
    };
  });
}

function normalizeLevel(level: LevelDatum, ids: Set<string>): LevelDatum {
  const id = level.id.trim();
  if (!id) {
    throw new TypeError('Every level requires a non-empty id.');
  }

  const identity = `${level.kind}:${id}`;
  if (ids.has(identity)) {
    throw new TypeError(`Duplicate level id "${id}" in ${level.kind}.`);
  }
  ids.add(identity);

  switch (level.kind) {
    case 'single':
      return { ...level, id, price: finiteNumber(level.price, `${id}.price`) };
    case 'sr-pair':
      return normalizePair(level, id);
    case 'gex':
    case 'dex':
      return normalizeExposure(level, id);
  }
}

function normalizePair(level: SupportResistancePair, id: string): SupportResistancePair {
  const support = finiteNumber(level.support, `${id}.support`);
  const resistance = finiteNumber(level.resistance, `${id}.resistance`);
  if (support >= resistance) {
    throw new RangeError(`Support must be below resistance for "${id}".`);
  }

  return {
    ...level,
    id,
    support,
    resistance,
    fillOpacity:
      level.fillOpacity === undefined ? undefined : clamp(level.fillOpacity, 0, 1),
  };
}

function normalizeExposure(level: GexDexLevel, id: string): GexDexLevel {
  return {
    ...level,
    id,
    price: finiteNumber(level.price, `${id}.price`),
    magnitude: finiteNumber(level.magnitude, `${id}.magnitude`),
    maxMagnitude: positiveNumber(level.maxMagnitude, `${id}.maxMagnitude`),
  };
}

function finiteNumber(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${field} must be a finite number.`);
  }
  return value;
}

function positiveNumber(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${field} must be greater than zero.`);
  }
  return value;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}
