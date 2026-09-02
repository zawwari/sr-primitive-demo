import { beforeEach, describe, expect, it, vi } from 'vitest';
import { demoCandles, demoLevels } from './fixtures';

const chartMocks = vi.hoisted(() => {
  const requestUpdate = vi.fn();
  const series = {
    setData: vi.fn(),
    attachPrimitive: vi.fn((primitive: { attached?: (parameters: object) => void }) => {
      primitive.attached?.({ series, chart, requestUpdate });
    }),
    detachPrimitive: vi.fn((primitive: { detached?: () => void }) => {
      primitive.detached?.();
    }),
    priceToCoordinate: vi.fn(() => 100),
  };
  const chart = {
    addSeries: vi.fn(() => series),
    applyOptions: vi.fn(),
    remove: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
  };
  return { chart, requestUpdate, series };
});

vi.mock('lightweight-charts', () => ({
  CandlestickSeries: {},
  ColorType: { Solid: 'solid' },
  createChart: vi.fn(() => chartMocks.chart),
}));

import { mount } from './levelsChart';

describe('levels chart lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.document = {
      createElement: () => createFakeElement(),
    } as unknown as Document;
  });

  it('updates stable primitives in place and detaches removed families', () => {
    const root = createFakeElement();
    const handle = mount(root as unknown as HTMLElement, {
      candles: demoCandles,
      levels: demoLevels,
      mobile: { enabled: false },
    });

    expect(chartMocks.series.attachPrimitive).toHaveBeenCalledTimes(5);

    handle.update({
      candles: demoCandles,
      levels: demoLevels.map((level) =>
        level.kind === 'single' ? { ...level, price: level.price + 1 } : level),
      theme: 'light',
      mobile: { enabled: false },
    });

    expect(chartMocks.series.attachPrimitive).toHaveBeenCalledTimes(5);
    expect(chartMocks.series.detachPrimitive).not.toHaveBeenCalled();
    expect(chartMocks.requestUpdate).toHaveBeenCalledTimes(5);
    expect(chartMocks.chart.applyOptions).toHaveBeenCalledOnce();

    handle.update({
      candles: demoCandles,
      levels: [],
      mobile: { enabled: false },
    });

    expect(chartMocks.series.detachPrimitive).toHaveBeenCalledTimes(5);
  });

  it('destroys safely when called more than once', () => {
    const root = createFakeElement();
    const handle = mount(root as unknown as HTMLElement, {
      candles: demoCandles,
      levels: demoLevels.slice(0, 2),
      mobile: { enabled: false },
    });

    handle.destroy();
    handle.destroy();
    handle.update({
      candles: demoCandles,
      levels: [],
      mobile: { enabled: false },
    });

    expect(chartMocks.chart.remove).toHaveBeenCalledOnce();
    expect(root.children).toHaveLength(0);
  });
});

interface FakeElement {
  children: FakeElement[];
  parent: FakeElement | null;
  style: Record<string, string>;
  append(...children: FakeElement[]): void;
  remove(): void;
}

function createFakeElement(): FakeElement {
  const element: FakeElement = {
    children: [],
    parent: null,
    style: {},
    append(...children: FakeElement[]) {
      for (const child of children) {
        child.parent = element;
        element.children.push(child);
      }
    },
    remove() {
      if (!element.parent) return;
      element.parent.children = element.parent.children.filter(
        (child: FakeElement) => child !== element,
      );
      element.parent = null;
    },
  };
  return element;
}
