import type {
  AutoscaleInfo,
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  PrimitiveHoveredItem,
  SeriesAttachedParameter,
  Time,
} from 'lightweight-charts';
import type { ChartTheme, GexDexLevel } from '../types';
import {
  EXPOSURE_PROFILE_WIDTH,
  exposureBarWidth,
  formatExposure,
} from '../chartUtils';

const PROFILE_MARGIN = 14;
const GEX_BAR_HEIGHT = 8;
const DEX_BAR_HEIGHT = 5;

interface HitRegion {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Renders a complete GEX or DEX family as one right-edge exposure
 * profile. Positive and negative magnitudes diverge from a shared
 * baseline, so sign and relative concentration are readable at a glance.
 */
export class GexDexPrimitive implements ISeriesPrimitive<Time> {
  readonly key: string;
  private readonly paneView: GexDexPaneView;
  private levels: readonly GexDexLevel[];
  private theme: ChartTheme;
  private seriesApi: SeriesAttachedParameter<Time>['series'] | null = null;
  private requestUpdate: (() => void) | null = null;
  private hitRegions: HitRegion[] = [];

  constructor(
    readonly kind: GexDexLevel['kind'],
    levels: readonly GexDexLevel[],
    theme: ChartTheme,
  ) {
    this.key = `exposure:${kind}`;
    this.levels = levels;
    this.theme = theme;
    this.paneView = new GexDexPaneView(this);
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this.seriesApi = param.series;
    this.requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this.seriesApi = null;
    this.requestUpdate = null;
    this.hitRegions = [];
  }

  updateData(levels: readonly GexDexLevel[], theme: ChartTheme): void {
    this.levels = levels;
    this.theme = theme;
    this.requestUpdate?.();
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this.paneView];
  }

  autoscaleInfo(): AutoscaleInfo | null {
    if (this.levels.length === 0) return null;
    const prices = this.levels.map(({ price }) => price);
    return {
      priceRange: {
        minValue: Math.min(...prices),
        maxValue: Math.max(...prices),
      },
    };
  }

  hitTest(x: number, y: number): PrimitiveHoveredItem | null {
    const region = this.hitRegions.find(
      ({ left, right, top, bottom }) => x >= left && x <= right && y >= top && y <= bottom,
    );
    return region
      ? {
          cursorStyle: 'pointer',
          externalId: `${this.key}:${region.id}`,
          hitTestPriority: 0,
          distance: 0,
          zOrder: 'normal',
        }
      : null;
  }

  get data(): readonly GexDexLevel[] {
    return this.levels;
  }

  get series() {
    return this.seriesApi;
  }

  get colors() {
    if (this.kind === 'gex') {
      return { positive: '#2fc7a1', negative: '#f06469' };
    }
    return { positive: '#6da7ff', negative: '#f5a65b' };
  }

  get textColor(): string {
    return this.theme === 'dark' ? '#d8deea' : '#394156';
  }

  get baselineColor(): string {
    return this.theme === 'dark'
      ? 'rgba(139, 149, 167, 0.38)'
      : 'rgba(89, 97, 116, 0.34)';
  }

  setHitRegions(regions: HitRegion[]): void {
    this.hitRegions = regions;
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

  draw(target: Parameters<IPrimitivePaneRenderer['draw']>[0]): void {
    target.useBitmapCoordinateSpace((scope) => {
      const series = this._source.series;
      if (!series) return;

      const ctx: CanvasRenderingContext2D = scope.context;
      const horizontalRatio = scope.horizontalPixelRatio;
      const verticalRatio = scope.verticalPixelRatio;
      const chartWidth = scope.bitmapSize.width;
      const profileWidth = Math.min(
        EXPOSURE_PROFILE_WIDTH * horizontalRatio,
        chartWidth * 0.34,
      );
      const centerX = chartWidth - PROFILE_MARGIN * horizontalRatio - profileWidth / 2;
      const halfWidth = profileWidth / 2;
      const barHeight =
        (this._source.kind === 'gex' ? GEX_BAR_HEIGHT : DEX_BAR_HEIGHT) * verticalRatio;
      const hitRegions: HitRegion[] = [];

      ctx.save();
      ctx.strokeStyle = this._source.baselineColor;
      ctx.lineWidth = horizontalRatio;
      ctx.beginPath();
      ctx.moveTo(Math.round(centerX) + 0.5, 0);
      ctx.lineTo(Math.round(centerX) + 0.5, scope.bitmapSize.height);
      ctx.stroke();

      for (const level of this._source.data) {
        const coordinate = series.priceToCoordinate(level.price);
        if (coordinate === null) continue;
        const width = exposureBarWidth(
          level.magnitude,
          level.maxMagnitude,
          halfWidth / horizontalRatio,
        ) * horizontalRatio;
        const isPositive = level.magnitude >= 0;
        const left = isPositive ? centerX : centerX - width;
        const top = coordinate * verticalRatio - barHeight / 2;
        const color = isPositive
          ? this._source.colors.positive
          : this._source.colors.negative;

        if (this._source.kind === 'gex') {
          ctx.fillStyle = color;
          ctx.fillRect(left, top, width, barHeight);
        } else {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5 * verticalRatio;
          ctx.strokeRect(left, top, width, barHeight);
        }

        hitRegions.push({
          id: level.id,
          left: left / horizontalRatio,
          right: (left + width) / horizontalRatio,
          top: top / verticalRatio,
          bottom: (top + barHeight) / verticalRatio,
        });

        if (level.label) {
          const label = `${level.label} ${formatExposure(level.magnitude)}`;
          ctx.font = `600 ${10 * verticalRatio}px Inter, system-ui, sans-serif`;
          ctx.fillStyle = this._source.textColor;
          ctx.textBaseline = 'bottom';
          ctx.textAlign = 'right';
          ctx.fillText(
            label,
            chartWidth - PROFILE_MARGIN * horizontalRatio,
            top - 3 * verticalRatio,
          );
        }
      }

      ctx.font = `700 ${9 * verticalRatio}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = this._source.textColor;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(
        this._source.kind.toUpperCase(),
        chartWidth - PROFILE_MARGIN * horizontalRatio,
        (this._source.kind === 'gex' ? 12 : 27) * verticalRatio,
      );
      ctx.restore();
      this._source.setHitRegions(hitRegions);
    });
  }
}
