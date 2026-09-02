# Signal Canvas — market levels primitives

A polished, framework-agnostic TypeScript demonstration of market levels drawn directly on a chart canvas. It includes single price levels, a support/resistance pair represented by one object, GEX/DEX exposure profiles, deterministic fixtures, incremental updates, and a mobile preview-to-fullscreen flow.

## Library experience, stated plainly

This repository uses **TradingView `lightweight-charts`**, not the proprietary **TradingView Charting Library / Advanced Charts** and not the embed widget.

No TradingView Charting Library files are included. Advanced Charts is licensed software and cannot be redistributed in a public sample. This project demonstrates relevant canvas primitive design and lifecycle work without claiming API compatibility with Advanced Charts.

## What the demo proves

- Levels render as custom `ISeriesPrimitive` implementations, not stock studies or extra series.
- Support and resistance share one primitive, renderer pass, shaded region, label, autoscale range, and hit region.
- Single levels use crisp HiDPI dashed lines and compact labels.
- GEX is a filled exposure profile; DEX is outlined. Positive and negative values diverge from a shared zero baseline and bar length encodes normalized magnitude.
- Updates reconcile primitives by stable identity instead of detaching and rebuilding everything.
- Theme, candles, level visibility, and scenario data update through one typed contract.
- Small screens show a static chart screenshot. Tapping opens the live chart fullscreen, requests landscape orientation where supported, provides a portrait hint otherwise, and exposes an obvious exit.
- `destroy()` removes primitives, the chart, fullscreen behavior, media listeners, keyboard listeners, and generated DOM. Repeated teardown is safe.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. Use the overlay chips to toggle level families, switch themes, and apply the alternate market scenario.

## Quality commands

```bash
npm run typecheck
npm run test
npm run build
npm run check
```

The tests cover deterministic fixture generation, contract defaults and validation, invalid ranges, exposure scaling, keyed primitive reuse, family removal, and idempotent teardown.

## Framework-agnostic API

The public implementation is `src/levelsChart.ts`; `src/index.ts` collects its exports.

```ts
import { mount } from './src';

const chart = mount(container, {
  candles,
  levels: [
    {
      kind: 'sr-pair',
      id: 'weekly-range',
      support: 101.2,
      resistance: 106.8,
      label: 'Weekly value area',
    },
    {
      kind: 'gex',
      id: 'call-wall',
      price: 108,
      magnitude: 9_600_000,
      maxMagnitude: 10_000_000,
      label: 'Call wall',
    },
  ],
  theme: 'dark',
});

chart.update(nextConfig);
chart.destroy();
```

`mount()` returns the underlying chart and candlestick series for deliberate advanced use, plus `update()`, `destroy()`, `openMobileChart()`, and `closeMobileChart()`.

## React wrapper

`src/LevelsChart.react.tsx` is intentionally thin. It owns the DOM ref and React lifecycle while all chart behavior remains in the framework-neutral module.

```tsx
<LevelsChart
  config={{ candles, levels, theme: 'dark' }}
  ariaLabel="AAPL market levels"
  onReady={(chart) => console.log(chart)}
/>
```

There is no Angular implementation and no framework logic in the core.

## Typed contract

`src/types.ts` defines a discriminated union:

- `single` for pivots, VWAP, prior close, and similar horizontal references.
- `sr-pair` for a support/resistance region represented as one semantic object.
- `gex` and `dex` for signed exposure at a strike.

The mount boundary rejects empty IDs, duplicate IDs within a family, non-finite values, reversed S/R ranges, non-positive exposure scales, and missing candle data. Opacity is safely clamped.

Deterministic sample candles and levels live in `src/fixtures.ts`, keeping portfolio screenshots and test behavior repeatable.

## Rendering architecture

Each primitive follows the lightweight-charts plugin lifecycle:

1. The chart attaches a primitive to the candlestick series.
2. The primitive stores the series and redraw callback.
3. A pane view provides a canvas renderer.
4. The renderer converts prices to coordinates and draws in bitmap space for HiDPI output.
5. Updates mutate retained primitive data and request a redraw.
6. Removed IDs are detached; teardown removes all remaining resources.

The exposure renderer groups each GEX/DEX family into one overlay primitive, ensuring every strike uses the same baseline and visual scale.

## Mobile behavior

At widths up to 720px, the module captures the live chart with `takeScreenshot()` and presents that image as an accessible button. Opening it:

- restores the interactive chart;
- uses the Fullscreen API when available, with fixed-position fallback;
- requests landscape orientation when the browser permits orientation locking;
- shows a rotate hint in portrait;
- supports an explicit exit and the Escape key;
- restores focus to the preview after exit.

Orientation locking is intentionally best-effort because iOS Safari and some non-installed browser contexts do not expose it.

## Main files

- `src/types.ts` — public data and lifecycle contracts.
- `src/chartUtils.ts` — validation, normalization, deterministic candles, formatting, and exposure geometry.
- `src/levelsChart.ts` — chart mounting, keyed reconciliation, updates, and teardown.
- `src/mobileChart.ts` — screenshot, fullscreen, orientation, focus, and cleanup behavior.
- `src/primitives/SRPairPrimitive.ts` — paired S/R region.
- `src/primitives/SingleLevelPrimitive.ts` — standalone horizontal level.
- `src/primitives/GexDexPrimitive.ts` — grouped exposure profile.
- `src/LevelsChart.react.tsx` — thin React lifecycle wrapper.
- `src/main.ts` and `src/styles.css` — public portfolio showcase.

## License boundary

The application code in this repository is provided under the MIT license declared in `package.json`. TradingView owns `lightweight-charts` and distributes it under its own Apache 2.0 license. TradingView Charting Library / Advanced Charts is not included or represented as part of this repository.
