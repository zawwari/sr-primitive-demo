import type {
  CandlestickData,
  IChartApi,
  ISeriesApi,
  SeriesType,
  Time,
} from 'lightweight-charts';

export type ChartTheme = 'light' | 'dark';

export interface MobileChartOptions {
  enabled?: boolean;
  breakpoint?: number;
  screenshotAlt?: string;
}

/** A single horizontal level (e.g. pivot, VWAP, prior close). */
export interface SingleLevel {
  kind: 'single';
  id: string;
  price: number;
  label: string;
  color?: string;
}

/**
 * A support/resistance pair drawn as ONE object — a shaded band between
 * the two prices plus edge lines/labels — rather than two independent
 * horizontal lines that merely happen to sit near each other.
 */
export interface SupportResistancePair {
  kind: 'sr-pair';
  id: string;
  support: number;
  resistance: number;
  label?: string;
  supportColor?: string;
  resistanceColor?: string;
  fillOpacity?: number;
}

/**
 * A single GEX/DEX strike-level entry rendered in the conventional
 * options-flow visual language: a horizontal bar whose length encodes
 * magnitude, colored by sign (positive gamma/delta vs negative).
 */
export interface GexDexLevel {
  kind: 'gex' | 'dex';
  id: string;
  price: number;
  magnitude: number;
  maxMagnitude: number;
  label?: string;
}

export type LevelDatum = SingleLevel | SupportResistancePair | GexDexLevel;

export interface LevelsChartConfig {
  levels: readonly LevelDatum[];
  candles?: readonly CandlestickData<Time>[];
  theme?: ChartTheme;
  mobile?: MobileChartOptions;
}

export interface MountedChart {
  update(config: LevelsChartConfig): void;
  destroy(): void;
  openMobileChart(): Promise<void>;
  closeMobileChart(): Promise<void>;
  chart: IChartApi;
  mainSeries: ISeriesApi<SeriesType>;
}
