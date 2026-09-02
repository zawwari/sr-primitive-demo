import type {
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  SeriesAttachedParameter,
  Time,
} from 'lightweight-charts';
import type { SupportResistancePair } from '../types';

/**
 * Renders a support/resistance pair as a single paired object:
 * a shaded band between the two prices, with the support edge and
 * resistance edge drawn as part of the same primitive (shared state,
 * one hit-test region, one label) rather than as two separate
 * horizontal-line series that merely sit near each other.
 */
export class SRPairPrimitive implements ISeriesPrimitive<Time> {
  private _paneView: SRPairPaneView;
  private _data: SupportResistancePair;
  private _chart: SeriesAttachedParameter<Time>['chart'] | null = null;
  private _series: SeriesAttachedParameter<Time>['series'] | null = null;

  constructor(data: SupportResistancePair) {
    this._data = data;
    this._paneView = new SRPairPaneView(this);
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this._chart = param.chart;
    this._series = param.series;
  }

  detached(): void {
    this._chart = null;
    this._series = null;
  }

  updateData(data: SupportResistancePair): void {
    this._data = data;
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this._paneView];
  }

  get data(): SupportResistancePair {
    return this._data;
  }

  get series() {
    return this._series;
  }
}

class SRPairPaneView implements IPrimitivePaneView {
  constructor(private readonly _source: SRPairPrimitive) {}

  renderer(): IPrimitivePaneRenderer {
    return new SRPairPaneRenderer(this._source);
  }
}

class SRPairPaneRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly _source: SRPairPrimitive) {}

  draw(target: any): void {
    target.useBitmapCoordinateSpace((scope: any) => {
      const series = this._source.series;
      if (!series) return;
      const { support, resistance, label, supportColor, resistanceColor, fillOpacity } =
        this._source.data;

      const yTop = series.priceToCoordinate(resistance);
      const yBottom = series.priceToCoordinate(support);
      if (yTop === null || yBottom === null) return;

      const ctx: CanvasRenderingContext2D = scope.context;
      const ratio = scope.verticalPixelRatio;
      const width = scope.bitmapSize.width;

      const top = Math.min(yTop, yBottom) * ratio;
      const bottom = Math.max(yTop, yBottom) * ratio;

      // One shaded band = the "single object" — not two independent lines.
      ctx.save();
      ctx.fillStyle = withAlpha(supportColor ?? '#26a69a', fillOpacity ?? 0.12);
      ctx.fillRect(0, top, width, bottom - top);

      // Edges belong to the same object: drawn from shared geometry.
      ctx.lineWidth = 1;
      ctx.strokeStyle = resistanceColor ?? '#ef5350';
      ctx.setLineDash([4, 3]);
      strokeHLine(ctx, top, width, scope.horizontalPixelRatio);

      ctx.strokeStyle = supportColor ?? '#26a69a';
      strokeHLine(ctx, bottom, width, scope.horizontalPixelRatio);
      ctx.restore();

      if (label) {
        ctx.save();
        ctx.font = `${12 * ratio}px sans-serif`;
        ctx.fillStyle = '#787b86';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 8 * ratio, (top + bottom) / 2);
        ctx.restore();
      }
    });
  }
}

function strokeHLine(ctx: CanvasRenderingContext2D, y: number, width: number, ratio: number) {
  ctx.beginPath();
  ctx.moveTo(0, Math.round(y) + 0.5);
  ctx.lineTo(width, Math.round(y) + 0.5);
  ctx.lineWidth = ratio;
  ctx.stroke();
}

function withAlpha(hex: string, alpha: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
