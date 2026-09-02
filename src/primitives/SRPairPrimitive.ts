import type {
  AutoscaleInfo,
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  PrimitiveHoveredItem,
  SeriesAttachedParameter,
  Time,
} from 'lightweight-charts';
import type { ChartTheme, SupportResistancePair } from '../types';
import { colorWithAlpha } from '../chartUtils';

const EDGE_DASH = 6;
const EDGE_GAP = 4;

/**
 * Renders a support/resistance pair as a single paired object:
 * a shaded band between the two prices, with the support edge and
 * resistance edge drawn as part of the same primitive (shared state,
 * one hit-test region, one label) rather than as two separate
 * horizontal-line series that merely sit near each other.
 */
export class SRPairPrimitive implements ISeriesPrimitive<Time> {
  readonly key: string;
  private readonly paneView: SRPairPaneView;
  private _data: SupportResistancePair;
  private theme: ChartTheme;
  private seriesApi: SeriesAttachedParameter<Time>['series'] | null = null;
  private requestUpdate: (() => void) | null = null;
  private renderedBand: { top: number; bottom: number } | null = null;

  constructor(data: SupportResistancePair, theme: ChartTheme) {
    this.key = `sr-pair:${data.id}`;
    this._data = data;
    this.theme = theme;
    this.paneView = new SRPairPaneView(this);
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this.seriesApi = param.series;
    this.requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this.seriesApi = null;
    this.requestUpdate = null;
    this.renderedBand = null;
  }

  updateData(data: SupportResistancePair, theme: ChartTheme): void {
    this._data = data;
    this.theme = theme;
    this.requestUpdate?.();
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this.paneView];
  }

  autoscaleInfo(): AutoscaleInfo {
    return {
      priceRange: {
        minValue: this._data.support,
        maxValue: this._data.resistance,
      },
    };
  }

  hitTest(_x: number, y: number): PrimitiveHoveredItem | null {
    if (!this.renderedBand || y < this.renderedBand.top || y > this.renderedBand.bottom) {
      return null;
    }

    return {
      cursorStyle: 'crosshair',
      externalId: this.key,
      hitTestPriority: 0,
      distance: 0,
      zOrder: 'normal',
    };
  }

  get data(): SupportResistancePair {
    return this._data;
  }

  get series() {
    return this.seriesApi;
  }

  get textColor(): string {
    return this.theme === 'dark' ? '#f3f5f8' : '#202635';
  }

  get labelBackground(): string {
    return this.theme === 'dark' ? 'rgba(15, 20, 31, 0.88)' : 'rgba(255, 255, 255, 0.9)';
  }

  setRenderedBand(top: number, bottom: number): void {
    this.renderedBand = { top, bottom };
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

  draw(target: Parameters<IPrimitivePaneRenderer['draw']>[0]): void {
    target.useBitmapCoordinateSpace((scope) => {
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
      this._source.setRenderedBand(Math.min(yTop, yBottom), Math.max(yTop, yBottom));

      ctx.save();
      const supportLineColor = supportColor ?? '#2fc7a1';
      const resistanceLineColor = resistanceColor ?? '#f06469';
      ctx.fillStyle = colorWithAlpha(supportLineColor, fillOpacity ?? 0.12);
      ctx.fillRect(0, top, width, bottom - top);

      ctx.strokeStyle = resistanceLineColor;
      ctx.setLineDash([
        EDGE_DASH * scope.horizontalPixelRatio,
        EDGE_GAP * scope.horizontalPixelRatio,
      ]);
      strokeHLine(ctx, top, width, scope.verticalPixelRatio);

      ctx.strokeStyle = supportLineColor;
      strokeHLine(ctx, bottom, width, scope.verticalPixelRatio);
      ctx.restore();

      if (label) {
        ctx.save();
        ctx.font = `600 ${11 * ratio}px Inter, system-ui, sans-serif`;
        const horizontalRatio = scope.horizontalPixelRatio;
        const textWidth = ctx.measureText(label).width;
        const x = 12 * horizontalRatio;
        const center = (top + bottom) / 2;
        ctx.fillStyle = this._source.labelBackground;
        ctx.fillRect(
          x - 5 * horizontalRatio,
          center - 10 * ratio,
          textWidth + 10 * horizontalRatio,
          20 * ratio,
        );
        ctx.fillStyle = this._source.textColor;
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, center);
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
