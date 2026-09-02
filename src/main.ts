import { mount } from './levelsChart';
import { demoCandles, demoLevels } from './fixtures';
import type { ChartTheme, LevelDatum } from './types';
import './styles.css';

const chartElement = requiredElement<HTMLDivElement>('chart');
const themeButton = requiredElement<HTMLButtonElement>('theme-toggle');
const scenarioButton = requiredElement<HTMLButtonElement>('scenario-toggle');
const familyButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-family]'),
);
const enabledFamilies = new Set<LevelDatum['kind']>([
  'sr-pair',
  'single',
  'gex',
  'dex',
]);
let theme: ChartTheme = 'dark';
let shiftedScenario = false;

const handle = mount(chartElement, chartConfig());

for (const button of familyButtons) {
  button.addEventListener('click', () => {
    const family = button.dataset.family as LevelDatum['kind'];
    if (enabledFamilies.has(family)) {
      enabledFamilies.delete(family);
    } else {
      enabledFamilies.add(family);
    }
    button.setAttribute('aria-pressed', String(enabledFamilies.has(family)));
    handle.update(chartConfig());
  });
}

themeButton.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = theme;
  themeButton.setAttribute('aria-label', `Use ${theme === 'dark' ? 'light' : 'dark'} theme`);
  themeButton.firstElementChild!.textContent = theme === 'dark' ? '☀' : '☾';
  handle.update(chartConfig());
});

scenarioButton.addEventListener('click', () => {
  shiftedScenario = !shiftedScenario;
  scenarioButton.textContent = shiftedScenario ? 'Reset scenario' : 'Shift scenario';
  scenarioButton.setAttribute('aria-pressed', String(shiftedScenario));
  handle.update(chartConfig());
});

window.addEventListener('beforeunload', () => handle.destroy(), { once: true });

function chartConfig() {
  return {
    candles: demoCandles,
    levels: activeLevels(),
    theme,
    mobile: {
      enabled: true,
      breakpoint: 720,
      screenshotAlt: 'AAPL levels chart preview. Tap to open the full interactive chart.',
    },
  } as const;
}

function activeLevels(): LevelDatum[] {
  return demoLevels
    .filter(({ kind }) => enabledFamilies.has(kind))
    .map((level) => {
      if (!shiftedScenario) return level;
      if (level.kind === 'sr-pair') {
        return {
          ...level,
          support: level.support - 1.15,
          resistance: level.resistance + 1.4,
          label: 'Expanded weekly range',
        };
      }
      if (level.kind === 'gex') {
        return { ...level, magnitude: level.magnitude * 0.82 };
      }
      return level;
    });
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required element #${id}.`);
  return element as T;
}
