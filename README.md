# S/R Pair Primitive — lightweight-charts demo

A small, self-contained proof of concept for building levels on the chart
canvas as **custom primitives**, not stock studies — the pattern required
for a TradingView Charting Library levels rework.

This repo intentionally uses **`lightweight-charts`** (open source, MIT),
not TradingView's Charting Library, since the Charting Library may not be
redistributed in a public repo under its license. The primitive/renderer
model — `attached()` / `detached()` / `paneViews()` / a `draw()` callback
against a bitmap coordinate space — is the same shape in both libraries,
so this demonstrates the approach directly rather than by analogy.

## What's here

- **`src/primitives/SRPairPrimitive.ts`** — the core piece: a
  support/resistance pair rendered as **one paired object** (a shaded
  band + two edges + a shared label), not two independent horizontal
  lines. Support and resistance share one primitive instance, one data
  model, one hit region.
- **`src/primitives/SingleLevelPrimitive.ts`** — a single dashed level
  (pivot, VWAP, prior close, etc).
- **`src/primitives/GexDexPrimitive.ts`** — a GEX/DEX strike rendered as
  a right-anchored, magnitude-scaled, sign-colored bar — the visual
  convention traders already read from options-flow tools.
- **`src/levelsChart.ts`** — the framework-agnostic core:
  `mount(el, config) → { update, destroy }`. No framework dependency
  lives here.
- **`src/LevelsChart.react.tsx`** — a thin React wrapper around
  `mount()`, for illustration of how the framework layer would sit on
  top of the core module.
- **`src/main.ts`** — demo wiring: one S/R pair, one single level, two
  GEX bars, one DEX bar, with a live `update()` call after 3s to show
  the primitives re-rendering on data change.

## Run it

```bash
npm install
npm run dev       # local dev server
npm run build     # production build (verified working)
npm run typecheck # strict TypeScript, no errors
```

## Mapping to the actual job

| Job requirement | Where it's shown here |
|---|---|
| Levels as custom primitives, not studies | All three primitive classes implement the primitive interface directly against the canvas |
| S/R pair as one object, not two lines | `SRPairPrimitive` — single class, single data model, single renderer pass |
| GEX/DEX conventional visual language | `GexDexPrimitive` — magnitude-scaled, sign-colored bars |
| Framework-agnostic core + thin React wrapper | `levelsChart.ts` (no framework import) + `LevelsChart.react.tsx` (lifecycle glue only) |
| Typed contract | `src/types.ts` — discriminated union over level kinds |

What's **not** in this repo, since it's a scoped demo rather than the
full deliverable: the Charting Library integration itself (needs the
actual library, which can't be committed here), the mobile
screenshot-to-landscape flow, and fixtures/contract wiring against a
real backend — all of which the actual engagement would be built
against your existing typed contract rather than one invented for a
demo.
