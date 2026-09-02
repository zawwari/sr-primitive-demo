import type {
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  SeriesAttachedParameter,
  Time,
} from 'lightweight-charts';
import type { GexDexLevel } from '../types';

const BAR_MAX_WIDTH = 90; // px, right-anchored strip

/**
 * Renders one GEX or DEX strike as a right-anchored horizontal bar,
 * length proportional to magnitude, green/red by sign — the visual
 * convention traders already read from options-flow tools.
 */
export class GexDexPrimitive implements ISeriesPrimitive<Time> {
  private _paneView: GexDexPaneView;
  private _data: GexDexLevel;
  private _series: SeriesAttachedParameter<Time>['series'] | null = null;

  constructor(data: GexDexLevel) {
    this._data = data;
    this._paneView = new GexDexPaneView(this);
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this._series = param.series;
  }

  detached(): void {
    this._series = null;
  }

  updateData(data: GexDexLevel): void {
    this._data = data;
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this._paneView];
  }

  get data(): GexDexLevel {
    return this._data;
  }

  get series() {
    return this._series;
  }
}

class GexDexPaneView implements IPrimitivePaneView {
  constructor(private readonly _source: GexDexPrimitive) {}
  renderer(): IPrimitivePaneRenderer {
    return new GexDexPaneRenderer(this._source);
  }
}

class GexDexPaneRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly _source: GexDexPrimitive) {}

  draw(target: any): void {
    target.useBitmapCoordinateSpace((scope: any) => {
      const series = this._source.series;
      if (!series) return;
      const { price, magnitude, maxMagnitude, kind } = this._source.data;
      const y = series.priceToCoordinate(price);
      if (y === null || maxMagnitude === 0) return;

      const ctx: CanvasRenderingContext2D = scope.context;
      const ratio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;
      const chartWidth = scope.bitmapSize.width;

      const barWidth = (Math.abs(magnitude) / maxMagnitude) * BAR_MAX_WIDTH * ratio;
      const isPositive = magnitude >= 0;
      const barHeight = 4 * vRatio;
      const yPos = y * vRatio - barHeight / 2;
      const xEnd = chartWidth - 4 * ratio;
      const xStart = xEnd - barWidth;

      ctx.save();
      ctx.fillStyle = isPositive
        ? kind === 'gex'
          ? 'rgba(38, 166, 154, 0.75)' // positive gamma: teal
          : 'rgba(38, 166, 154, 0.55)' // positive delta: lighter teal
        : kind === 'gex'
          ? 'rgba(239, 83, 80, 0.75)' // negative gamma: red
          : 'rgba(239, 83, 80, 0.55)'; // negative delta: lighter red
      ctx.fillRect(xStart, yPos, barWidth, barHeight);
      ctx.restore();
    });
  }
}
