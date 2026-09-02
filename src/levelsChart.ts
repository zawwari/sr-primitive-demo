import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type { LevelsChartConfig, LevelDatum, MountedChart } from './types';
import { SRPairPrimitive } from './primitives/SRPairPrimitive';
import { SingleLevelPrimitive } from './primitives/SingleLevelPrimitive';
import { GexDexPrimitive } from './primitives/GexDexPrimitive';

type AnyPrimitive = SRPairPrimitive | SingleLevelPrimitive | GexDexPrimitive;

/**
 * Framework-agnostic entry point. Mounts a levels chart into `el` and
 * returns a handle with `update()` / `destroy()`. No framework
 * dependency lives in this module — React (or anything else) is a thin
 * wrapper around this contract.
 */
export function mount(el: HTMLElement, config: LevelsChartConfig): MountedChart {
  const dark = config.theme === 'dark';

  const chart = createChart(el, {
    layout: {
      background: { type: ColorType.Solid, color: dark ? '#0f1117' : '#ffffff' },
      textColor: dark ? '#d1d4dc' : '#131722',
    },
    grid: {
      vertLines: { color: dark ? '#1e222d' : '#f0f3fa' },
      horzLines: { color: dark ? '#1e222d' : '#f0f3fa' },
    },
    autoSize: true,
  });

  const mainSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
  });

  mainSeries.setData(sampleCandles());

  const primitives: AnyPrimitive[] = [];

  function attachLevels(levels: LevelDatum[]) {
    // Clear existing primitives before re-applying.
    for (const p of primitives) {
      mainSeries.detachPrimitive(p as any);
    }
    primitives.length = 0;

    for (const level of levels) {
      let primitive: AnyPrimitive;
      switch (level.kind) {
        case 'sr-pair':
          primitive = new SRPairPrimitive(level);
          break;
        case 'single':
          primitive = new SingleLevelPrimitive(level);
          break;
        case 'gex':
        case 'dex':
          primitive = new GexDexPrimitive(level);
          break;
      }
      mainSeries.attachPrimitive(primitive as any);
      primitives.push(primitive);
    }
  }

  attachLevels(config.levels);
  chart.timeScale().fitContent();

  return {
    chart,
    mainSeries,
    update(next: LevelsChartConfig) {
      attachLevels(next.levels);
    },
    destroy() {
      for (const p of primitives) {
        mainSeries.detachPrimitive(p as any);
      }
      primitives.length = 0;
      chart.remove();
    },
  };
}

/** Small fixed sample series so the demo is self-contained. */
function sampleCandles() {
  const base = 100;
  const data = [];
  let price = base;
  const start = Math.floor(Date.UTC(2026, 0, 1) / 1000);
  for (let i = 0; i < 90; i++) {
    const open = price;
    const drift = (Math.sin(i / 7) + (Math.random() - 0.5)) * 1.5;
    const close = open + drift;
    const high = Math.max(open, close) + Math.random() * 1.2;
    const low = Math.min(open, close) - Math.random() * 1.2;
    price = close;
    data.push({
      time: (start + i * 86400) as any,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
    });
  }
  return data;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
