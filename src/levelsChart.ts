import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type {
  ChartTheme,
  GexDexLevel,
  LevelsChartConfig,
  LevelDatum,
  MountedChart,
} from './types';
import { SRPairPrimitive } from './primitives/SRPairPrimitive';
import { SingleLevelPrimitive } from './primitives/SingleLevelPrimitive';
import { GexDexPrimitive } from './primitives/GexDexPrimitive';
import { createDeterministicCandles, normalizeConfig } from './chartUtils';
import {
  createMobileChartController,
  type MobileChartController,
} from './mobileChart';

type AnyPrimitive = SRPairPrimitive | SingleLevelPrimitive | GexDexPrimitive;

export function mount(el: HTMLElement, config: LevelsChartConfig): MountedChart {
  const fallbackCandles = createDeterministicCandles();
  let current = normalizeConfig(config, fallbackCandles);
  const host = document.createElement('div');
  const chartContainer = document.createElement('div');
  let destroyed = false;
  let mobileController: MobileChartController;
  let mobileOptionsKey = '';

  Object.assign(host.style, {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '260px',
    overflow: 'hidden',
    background: themeColors(current.theme).background,
  });
  Object.assign(chartContainer.style, {
    width: '100%',
    height: '100%',
  });
  host.append(chartContainer);
  el.append(host);

  const chart = createChart(chartContainer, {
    layout: {
      background: { type: ColorType.Solid, color: themeColors(current.theme).background },
      textColor: themeColors(current.theme).text,
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    grid: {
      vertLines: { color: themeColors(current.theme).grid },
      horzLines: { color: themeColors(current.theme).grid },
    },
    rightPriceScale: { borderColor: themeColors(current.theme).border },
    timeScale: { borderColor: themeColors(current.theme).border, timeVisible: true },
    crosshair: {
      vertLine: { color: themeColors(current.theme).crosshair },
      horzLine: { color: themeColors(current.theme).crosshair },
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

  mainSeries.setData(current.candles);

  const primitives = new Map<string, AnyPrimitive>();

  function attach(primitive: AnyPrimitive): void {
    mainSeries.attachPrimitive(primitive);
    primitives.set(primitive.key, primitive);
  }

  function reconcileLevels(levels: readonly LevelDatum[], theme: ChartTheme): void {
    const retainedKeys = new Set<string>();
    const exposureGroups: Record<GexDexLevel['kind'], GexDexLevel[]> = {
      gex: [],
      dex: [],
    };

    for (const level of levels) {
      switch (level.kind) {
        case 'sr-pair': {
          const key = `sr-pair:${level.id}`;
          retainedKeys.add(key);
          const existing = primitives.get(key);
          if (existing instanceof SRPairPrimitive) {
            existing.updateData(level, theme);
          } else {
            attach(new SRPairPrimitive(level, theme));
          }
          break;
        }
        case 'single': {
          const key = `single:${level.id}`;
          retainedKeys.add(key);
          const existing = primitives.get(key);
          if (existing instanceof SingleLevelPrimitive) {
            existing.updateData(level, theme);
          } else {
            attach(new SingleLevelPrimitive(level, theme));
          }
          break;
        }
        case 'gex':
        case 'dex':
          exposureGroups[level.kind].push(level);
          break;
      }
    }

    for (const kind of ['gex', 'dex'] as const) {
      const groupedLevels = exposureGroups[kind];
      const key = `exposure:${kind}`;
      if (groupedLevels.length === 0) continue;
      retainedKeys.add(key);
      const existing = primitives.get(key);
      if (existing instanceof GexDexPrimitive && existing.kind === kind) {
        existing.updateData(groupedLevels, theme);
      } else {
        attach(new GexDexPrimitive(kind, groupedLevels, theme));
      }
    }

    for (const [key, primitive] of primitives) {
      if (retainedKeys.has(key)) continue;
      mainSeries.detachPrimitive(primitive);
      primitives.delete(key);
    }
  }

  function applyTheme(theme: ChartTheme): void {
    const colors = themeColors(theme);
    host.style.background = colors.background;
    chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border },
      crosshair: {
        vertLine: { color: colors.crosshair },
        horzLine: { color: colors.crosshair },
      },
    });
  }

  function configureMobile(): void {
    const nextKey = JSON.stringify(current.mobile);
    if (nextKey === mobileOptionsKey) return;
    mobileController?.destroy();
    mobileController = createMobileChartController(
      host,
      chartContainer,
      chart,
      current.mobile,
    );
    mobileOptionsKey = nextKey;
  }

  reconcileLevels(current.levels, current.theme);
  configureMobile();
  chart.timeScale().fitContent();

  return {
    chart,
    mainSeries,
    update(next: LevelsChartConfig) {
      if (destroyed) return;
      current = normalizeConfig(next, current.candles);
      mainSeries.setData(current.candles);
      applyTheme(current.theme);
      reconcileLevels(current.levels, current.theme);
      configureMobile();
      mobileController.refreshScreenshot();
    },
    async openMobileChart() {
      if (!destroyed) await mobileController.open();
    },
    async closeMobileChart() {
      if (!destroyed) await mobileController.close();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      mobileController.destroy();
      for (const primitive of primitives.values()) {
        mainSeries.detachPrimitive(primitive);
      }
      primitives.clear();
      chart.remove();
      host.remove();
    },
  };
}

function themeColors(theme: ChartTheme) {
  const dark = theme === 'dark';
  return {
    background: dark ? '#0b0f17' : '#ffffff',
    text: dark ? '#a9b1c3' : '#596174',
    grid: dark ? '#171d29' : '#edf0f5',
    border: dark ? '#263043' : '#d8dde7',
    crosshair: dark ? '#65718a' : '#8791a5',
  };
}
