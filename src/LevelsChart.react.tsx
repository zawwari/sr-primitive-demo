import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { mount } from './levelsChart';
import type { LevelsChartConfig, MountedChart } from './types';

export interface LevelsChartProps {
  config: LevelsChartConfig;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  onReady?: (chart: MountedChart) => void;
}

export function LevelsChart({
  config,
  className,
  style,
  ariaLabel = 'Market levels chart',
  onReady,
}: LevelsChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<MountedChart | null>(null);
  const initialConfigRef = useRef(config);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!containerRef.current) return;
    const handle = mount(containerRef.current, initialConfigRef.current);
    handleRef.current = handle;
    onReadyRef.current?.(handle);

    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    handleRef.current?.update(config);
  }, [config]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="region"
      aria-label={ariaLabel}
      style={{ width: '100%', height: '100%', ...style }}
    />
  );
}
