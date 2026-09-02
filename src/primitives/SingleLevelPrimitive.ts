import type {
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  SeriesAttachedParameter,
  Time,
} from 'lightweight-charts';
import type { SingleLevel } from '../types';

export class SingleLevelPrimitive implements ISeriesPrimitive<Time> {
  private _paneView: SingleLevelPaneView;
  private _data: SingleLevel;
  private _series: SeriesAttachedParameter<Time>['series'] | null = null;

  constructor(data: SingleLevel) {
    this._data = data;
    this._paneView = new SingleLevelPaneView(this);
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this._series = param.series;
  }

  detached(): void {
    this._series = null;
  }

  updateData(data: SingleLevel): void {
    this._data = data;
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this._paneView];
  }

  get data(): SingleLevel {
    return this._data;
  }

  get series() {
    return this._series;
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

  draw(target: any): void {
    target.useBitmapCoordinateSpace((scope: any) => {
      const series = this._source.series;
      if (!series) return;
      const { price, label, color } = this._source.data;
      const y = series.priceToCoordinate(price);
      if (y === null) return;

      const ctx: CanvasRenderingContext2D = scope.context;
      const ratio = scope.verticalPixelRatio;
      const width = scope.bitmapSize.width;

      ctx.save();
      ctx.strokeStyle = color ?? '#787b86';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y * ratio) + 0.5);
      ctx.lineTo(width, Math.round(y * ratio) + 0.5);
      ctx.lineWidth = ratio;
      ctx.stroke();

      if (label) {
        ctx.font = `${11 * ratio}px sans-serif`;
        ctx.fillStyle = color ?? '#787b86';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, 8 * ratio, y * ratio - 2);
      }
      ctx.restore();
    });
  }
}
