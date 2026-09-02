import type {
  AutoscaleInfo,
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  PrimitiveHoveredItem,
  SeriesAttachedParameter,
  Time,
} from 'lightweight-charts';
import type { ChartTheme, SingleLevel } from '../types';

const HIT_TOLERANCE = 5;
const LABEL_OFFSET = 10;

export class SingleLevelPrimitive implements ISeriesPrimitive<Time> {
  readonly key: string;
  private readonly paneView: SingleLevelPaneView;
  private _data: SingleLevel;
  private theme: ChartTheme;
  private seriesApi: SeriesAttachedParameter<Time>['series'] | null = null;
  private requestUpdate: (() => void) | null = null;
  private yCoordinate: number | null = null;

  constructor(data: SingleLevel, theme: ChartTheme) {
    this.key = `single:${data.id}`;
    this._data = data;
    this.theme = theme;
    this.paneView = new SingleLevelPaneView(this);
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this.seriesApi = param.series;
    this.requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this.seriesApi = null;
    this.requestUpdate = null;
    this.yCoordinate = null;
  }

  updateData(data: SingleLevel, theme: ChartTheme): void {
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
        minValue: this._data.price,
        maxValue: this._data.price,
      },
    };
  }

  hitTest(_x: number, y: number): PrimitiveHoveredItem | null {
    if (this.yCoordinate === null || Math.abs(y - this.yCoordinate) > HIT_TOLERANCE) {
      return null;
    }

    return {
      cursorStyle: 'pointer',
      externalId: this.key,
      hitTestPriority: 1,
      distance: Math.abs(y - this.yCoordinate),
      zOrder: 'normal',
    };
  }

  get data(): SingleLevel {
    return this._data;
  }

  get series() {
    return this.seriesApi;
  }

  get lineColor(): string {
    return this._data.color ?? (this.theme === 'dark' ? '#a9b1c3' : '#596174');
  }

  get labelBackground(): string {
    return this.theme === 'dark' ? 'rgba(15, 20, 31, 0.9)' : 'rgba(255, 255, 255, 0.92)';
  }

  setRenderedCoordinate(y: number): void {
    this.yCoordinate = y;
  }
}

class SingleLevelPaneView implements IPrimitivePaneView {
  constructor(private readonly _source: SingleLevelPrimitive) {}
  renderer(): IPrimitivePaneRenderer {
    return new SingleLevelPaneRenderer(this._source);
  }
}

class SingleLevelPaneRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly _source: SingleLevelPrimitive) {}

  draw(target: Parameters<IPrimitivePaneRenderer['draw']>[0]): void {
    target.useBitmapCoordinateSpace((scope) => {
      const series = this._source.series;
      if (!series) return;
      const { price, label, color } = this._source.data;
      const y = series.priceToCoordinate(price);
      if (y === null) return;
      this._source.setRenderedCoordinate(y);

      const ctx: CanvasRenderingContext2D = scope.context;
      const verticalRatio = scope.verticalPixelRatio;
      const horizontalRatio = scope.horizontalPixelRatio;
      const width = scope.bitmapSize.width;
      const lineY = Math.round(y * verticalRatio) + 0.5;
      const lineColor = color ?? this._source.lineColor;

      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.setLineDash([5 * horizontalRatio, 4 * horizontalRatio]);
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(width, lineY);
      ctx.lineWidth = verticalRatio;
      ctx.stroke();

      if (label) {
        ctx.font = `600 ${11 * verticalRatio}px Inter, system-ui, sans-serif`;
        const textWidth = ctx.measureText(label).width;
        const x = LABEL_OFFSET * horizontalRatio;
        const textY = y * verticalRatio - 7 * verticalRatio;
        ctx.fillStyle = this._source.labelBackground;
        ctx.fillRect(
          x - 4 * horizontalRatio,
          textY - 12 * verticalRatio,
          textWidth + 8 * horizontalRatio,
          16 * verticalRatio,
        );
        ctx.fillStyle = this._source.lineColor;
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, textY - 4 * verticalRatio);
      }
      ctx.restore();
    });
  }
}
