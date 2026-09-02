import { useEffect, useRef } from 'react';
import { mount } from './levelsChart';
import type { LevelsChartConfig } from './types';

/**
 * Thin React wrapper. All chart logic lives in `mount()` — this
 * component only owns the lifecycle glue (mount on effect, update on
 * config change, destroy on unmount).
 */
export function LevelsChart({ config }: { config: LevelsChartConfig }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<ReturnType<typeof mount> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    handleRef.current = mount(containerRef.current, config);
    return () => {
      handleRef.current?.destroy();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handleRef.current?.update(config);
  }, [config]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
