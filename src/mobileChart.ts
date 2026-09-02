import type { IChartApi } from 'lightweight-charts';
import type { MobileChartOptions } from './types';

const EXIT_LABEL = 'Exit full chart';
const EXPLORE_LABEL = 'Tap to explore chart';
const FRAME_DELAY = 2;

interface ResolvedMobileOptions extends Required<MobileChartOptions> {}

export interface MobileChartController {
  refreshScreenshot(): void;
  open(): Promise<void>;
  close(): Promise<void>;
  destroy(): void;
}

export function createMobileChartController(
  host: HTMLElement,
  liveChart: HTMLElement,
  chart: IChartApi,
  options: ResolvedMobileOptions,
): MobileChartController {
  if (!options.enabled) {
    return {
      refreshScreenshot() {},
      async open() {},
      async close() {},
      destroy() {},
    };
  }

  const media = window.matchMedia(`(max-width: ${options.breakpoint}px)`);
  const portrait = window.matchMedia('(orientation: portrait)');
  const snapshotButton = document.createElement('button');
  const snapshot = document.createElement('img');
  const exploreLabel = document.createElement('span');
  const exitButton = document.createElement('button');
  const rotateHint = document.createElement('div');
  let expanded = false;
  let destroyed = false;
  let screenshotFrame: number | null = null;
  let originalBodyOverflow = '';

  configureSnapshotButton(snapshotButton, snapshot, exploreLabel, options.screenshotAlt);
  configureExitButton(exitButton);
  configureRotateHint(rotateHint);
  host.append(snapshotButton, exitButton, rotateHint);

  const refreshScreenshot = () => {
    if (destroyed || !media.matches || expanded) return;
    if (screenshotFrame !== null) cancelAnimationFrame(screenshotFrame);
    scheduleAfterFrames(FRAME_DELAY, () => {
      if (destroyed || expanded || !media.matches) return;
      snapshot.src = chart.takeScreenshot().toDataURL('image/png');
      snapshotButton.hidden = false;
      liveChart.style.visibility = 'hidden';
      liveChart.style.pointerEvents = 'none';
    }, (frame) => {
      screenshotFrame = frame;
    });
  };

  const applyCollapsedState = () => {
    expanded = false;
    exitButton.hidden = true;
    rotateHint.hidden = true;
    host.style.position = 'relative';
    host.style.inset = '';
    host.style.zIndex = '';
    host.style.width = '100%';
    host.style.height = '100%';
    document.body.style.overflow = originalBodyOverflow;
    liveChart.style.visibility = '';
    liveChart.style.pointerEvents = '';

    if (media.matches) {
      refreshScreenshot();
    } else {
      snapshotButton.hidden = true;
    }
  };

  const open = async () => {
    if (destroyed || expanded) return;
    expanded = true;
    originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    snapshotButton.hidden = true;
    liveChart.style.visibility = '';
    liveChart.style.pointerEvents = '';
    exitButton.hidden = false;
    host.style.position = 'fixed';
    host.style.inset = '0';
    host.style.zIndex = '10000';
    host.style.width = '100vw';
    host.style.height = '100dvh';
    rotateHint.hidden = !portrait.matches;

    try {
      await host.requestFullscreen?.();
    } catch {
      // Fixed positioning remains a fully functional fullscreen fallback.
    }

    try {
      await screen.orientation?.lock('landscape');
    } catch {
      rotateHint.hidden = !portrait.matches;
    }
  };

  const close = async () => {
    if (!expanded) return;
    screen.orientation?.unlock();

    if (document.fullscreenElement === host) {
      try {
        await document.exitFullscreen();
      } catch {
        // The fixed-position fallback is restored below.
      }
    }

    applyCollapsedState();
    snapshotButton.focus();
  };

  const handleMediaChange = () => {
    if (expanded) return;
    if (media.matches) {
      refreshScreenshot();
    } else {
      snapshotButton.hidden = true;
      liveChart.style.visibility = '';
      liveChart.style.pointerEvents = '';
    }
  };
  const handleOrientationChange = () => {
    if (expanded) rotateHint.hidden = !portrait.matches;
  };
  const handleFullscreenChange = () => {
    if (expanded && document.fullscreenElement !== host) applyCollapsedState();
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (expanded && event.key === 'Escape') void close();
  };

  snapshotButton.addEventListener('click', () => void open());
  exitButton.addEventListener('click', () => void close());
  media.addEventListener('change', handleMediaChange);
  portrait.addEventListener('change', handleOrientationChange);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('keydown', handleKeyDown);
  handleMediaChange();

  return {
    refreshScreenshot,
    open,
    close,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (screenshotFrame !== null) cancelAnimationFrame(screenshotFrame);
      media.removeEventListener('change', handleMediaChange);
      portrait.removeEventListener('change', handleOrientationChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
      if (expanded) {
        screen.orientation?.unlock();
        document.body.style.overflow = originalBodyOverflow;
      }
      liveChart.style.visibility = '';
      liveChart.style.pointerEvents = '';
      snapshotButton.remove();
      exitButton.remove();
      rotateHint.remove();
    },
  };
}

function configureSnapshotButton(
  button: HTMLButtonElement,
  image: HTMLImageElement,
  label: HTMLSpanElement,
  alt: string,
): void {
  button.type = 'button';
  button.hidden = true;
  button.setAttribute('aria-label', alt);
  Object.assign(button.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    padding: '0',
    border: '0',
    overflow: 'hidden',
    cursor: 'pointer',
    background: '#0f141f',
    zIndex: '3',
  });
  image.alt = alt;
  Object.assign(image.style, {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  });
  label.textContent = EXPLORE_LABEL;
  Object.assign(label.style, {
    position: 'absolute',
    right: '14px',
    bottom: '14px',
    padding: '8px 12px',
    borderRadius: '999px',
    color: '#ffffff',
    background: 'rgba(15, 20, 31, 0.86)',
    font: '600 12px Inter, system-ui, sans-serif',
    boxShadow: '0 5px 18px rgba(0, 0, 0, 0.28)',
  });
  button.append(image, label);
}

function configureExitButton(button: HTMLButtonElement): void {
  button.type = 'button';
  button.hidden = true;
  button.textContent = `×  ${EXIT_LABEL}`;
  button.setAttribute('aria-label', EXIT_LABEL);
  Object.assign(button.style, {
    position: 'absolute',
    top: 'max(12px, env(safe-area-inset-top))',
    left: 'max(12px, env(safe-area-inset-left))',
    zIndex: '5',
    padding: '10px 14px',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '10px',
    color: '#ffffff',
    background: 'rgba(15, 20, 31, 0.92)',
    cursor: 'pointer',
    font: '700 12px Inter, system-ui, sans-serif',
  });
}

function configureRotateHint(hint: HTMLDivElement): void {
  hint.hidden = true;
  hint.textContent = 'Rotate your device for the widest chart view';
  hint.setAttribute('role', 'status');
  Object.assign(hint.style, {
    position: 'absolute',
    left: '50%',
    bottom: 'max(16px, env(safe-area-inset-bottom))',
    zIndex: '5',
    transform: 'translateX(-50%)',
    padding: '9px 13px',
    borderRadius: '9px',
    color: '#ffffff',
    background: 'rgba(15, 20, 31, 0.86)',
    font: '600 11px Inter, system-ui, sans-serif',
    whiteSpace: 'nowrap',
  });
}

function scheduleAfterFrames(
  remainingFrames: number,
  callback: () => void,
  onFrame: (frame: number) => void,
): void {
  const frame = requestAnimationFrame(() => {
    if (remainingFrames <= 1) {
      callback();
      return;
    }
    scheduleAfterFrames(remainingFrames - 1, callback, onFrame);
  });
  onFrame(frame);
}
