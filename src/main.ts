import './style.css';
import {
  END_YEAR,
  START_YEAR,
  binOfCohort,
  barRect,
  cohortStartOf,
  formatAge,
  formatPopulation,
  formatShare,
  interpolateSnapshot,
  projectSeries,
  renderPyramid,
  renderReference,
  rowTitle,
  snapshotStats,
} from './lib';

const series = projectSeries();

const pyramidHost = document.getElementById('pyramid')!;
const slider = document.getElementById('year-slider') as HTMLInputElement;
const yearOutput = document.getElementById('year-output')!;
const playButton = document.getElementById('play-button')!;
const speedSelect = document.getElementById('speed-select') as HTMLSelectElement;
const cohortStatus = document.getElementById('cohort-status')!;
const cohortClear = document.getElementById('cohort-clear') as HTMLButtonElement;

const statEls = {
  total: document.getElementById('stat-total')!,
  young: document.getElementById('stat-young')!,
  working: document.getElementById('stat-working')!,
  elderly: document.getElementById('stat-elderly')!,
  dependency: document.getElementById('stat-dependency')!,
  totalDependency: document.getElementById('stat-total-dependency')!,
  median: document.getElementById('stat-median')!,
};

let year = START_YEAR;
let playing = false;
let cohortStart: number | null = null;
let refYear: number | null = null;

const refSelect = document.getElementById('ref-select') as HTMLSelectElement;

pyramidHost.innerHTML = renderPyramid(interpolateSnapshot(series, year));
const svg = pyramidHost.querySelector('svg')!;
const referenceGroup = svg.querySelector('.jinkou-reference')!;
const yearText = svg.querySelector('.jinkou-year')!;
const rows = [...svg.querySelectorAll<SVGGElement>('.jinkou-row')];
const bars = new Map(
  [...svg.querySelectorAll<SVGRectElement>('.jinkou-bar')].map((rect) => [
    `${rect.dataset.sex} ${rect.dataset.bin}`,
    rect,
  ]),
);

/** 表示中の年のピラミッドへDOMを差分更新する(全再描画はしない) */
function update(): void {
  const snapshot = interpolateSnapshot(series, year);
  for (const sex of ['male', 'female'] as const) {
    snapshot[sex].forEach((value, bin) => {
      const rect = bars.get(`${sex} ${bin}`)!;
      const geo = barRect(value, sex);
      rect.setAttribute('x', geo.x.toFixed(2));
      rect.setAttribute('width', geo.width.toFixed(2));
    });
  }
  const cohortBin = cohortStart != null ? binOfCohort(cohortStart, snapshot.year) : null;
  rows.forEach((row, bin) => {
    row.classList.toggle('is-cohort', bin === cohortBin);
    row.querySelector('title')!.textContent = rowTitle(snapshot, bin);
  });
  const displayYear = Math.round(snapshot.year);
  yearText.textContent = `${displayYear}年`;
  yearOutput.textContent = `${displayYear}年`;
  svg.setAttribute('aria-label', `${displayYear}年の人口ピラミッド`);
  slider.value = String(snapshot.year);

  const stats = snapshotStats(snapshot);
  statEls.total.textContent = formatPopulation(stats.total);
  statEls.young.textContent = formatShare(stats.youngShare);
  statEls.working.textContent = formatShare(stats.workingShare);
  statEls.elderly.textContent = formatShare(stats.elderlyShare);
  statEls.dependency.textContent = stats.agedDependency.toFixed(2);
  statEls.totalDependency.textContent = stats.totalDependency.toFixed(2);
  statEls.median.textContent = formatAge(stats.medianAge);
}

function writeHash(): void {
  const parts = [`y=${Math.round(year)}`];
  if (cohortStart != null) parts.push(`c=${cohortStart}`);
  if (refYear != null) parts.push(`r=${refYear}`);
  history.replaceState(null, '', `#${parts.join('&')}`);
}

// ---- 比較する参照年 ----

function setReference(value: number | null): void {
  refYear = value;
  referenceGroup.innerHTML =
    value == null ? '' : renderReference(interpolateSnapshot(series, value));
  writeHash();
}

refSelect.addEventListener('change', () => {
  setReference(refSelect.value === '' ? null : Number(refSelect.value));
});

// ---- 再生 ----

let frameId = 0;
let tweenId = 0;
let lastTime = 0;

function stopTween(): void {
  cancelAnimationFrame(tweenId);
  tweenId = 0;
}

function tick(time: number): void {
  if (!playing) return;
  const dt = Math.min(0.1, (time - lastTime) / 1000);
  lastTime = time;
  year += dt * Number(speedSelect.value);
  if (year >= END_YEAR) {
    year = END_YEAR;
    setPlaying(false);
  }
  update();
  if (playing) frameId = requestAnimationFrame(tick);
}

function setPlaying(next: boolean): void {
  playing = next;
  playButton.classList.toggle('is-playing', next);
  playButton.setAttribute('aria-label', next ? '一時停止' : '再生');
  if (next) {
    stopTween();
    if (year >= END_YEAR) year = START_YEAR;
    lastTime = performance.now();
    frameId = requestAnimationFrame(tick);
  } else {
    cancelAnimationFrame(frameId);
    writeHash();
  }
}

playButton.addEventListener('click', () => setPlaying(!playing));

slider.addEventListener('input', () => {
  setPlaying(false);
  stopTween();
  year = Number(slider.value);
  update();
});

slider.addEventListener('change', writeHash);

const clampYear = (v: number) => Math.min(END_YEAR, Math.max(START_YEAR, v));

/** 即座に指定年へ移動する(矢印キーなど1年送り向け) */
function goToYear(next: number): void {
  setPlaying(false);
  stopTween();
  year = clampYear(next);
  update();
  writeHash();
}

/** 指定年へ滑らかに送る(主要年ジャンプ向け)。reduced-motionでは即時 */
function animateToYear(target: number): void {
  setPlaying(false);
  stopTween();
  const goal = clampYear(target);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    year = goal;
    update();
    writeHash();
    return;
  }
  const from = year;
  const start = performance.now();
  const duration = 650;
  const step = (now: number): void => {
    const k = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - k, 3);
    year = from + (goal - from) * eased;
    update();
    if (k < 1) {
      tweenId = requestAnimationFrame(step);
    } else {
      tweenId = 0;
      year = goal;
      update();
      writeHash();
    }
  };
  tweenId = requestAnimationFrame(step);
}

document.querySelectorAll<HTMLButtonElement>('.year-jumps [data-year]').forEach((button) => {
  button.addEventListener('click', () => animateToYear(Number(button.dataset.year)));
});

// 矢印キーで1年ずつ、スペースで再生/一時停止(入力欄では無効)
document.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault();
    goToYear(Math.round(year) + (e.key === 'ArrowRight' ? 1 : -1));
  } else if (e.key === ' ' && tag !== 'BUTTON') {
    e.preventDefault();
    setPlaying(!playing);
  }
});

// ---- コーホート追跡 ----

function setCohort(start: number | null): void {
  cohortStart = start;
  cohortClear.hidden = start == null;
  cohortStatus.textContent =
    start == null ? '' : `${start}年から${start + 5}年に生まれた世代を追跡中`;
  update();
  writeHash();
}

svg.addEventListener('click', (e) => {
  const row = (e.target as Element).closest<SVGGElement>('.jinkou-row');
  if (!row) return;
  const bin = Number(row.dataset.bin);
  const start = cohortStartOf(Math.round(year), bin);
  setCohort(cohortStart === start ? null : start);
});

svg.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const row = (e.target as Element).closest<SVGGElement>('.jinkou-row');
  if (!row) return;
  e.preventDefault();
  const start = cohortStartOf(Math.round(year), Number(row.dataset.bin));
  setCohort(cohortStart === start ? null : start);
});

cohortClear.addEventListener('click', () => setCohort(null));

// ---- 配色テーマ ----

const THEME_KEY = 'jinkou-theme';
const themeToggle = document.getElementById('theme-toggle')!;

function applyTheme(theme: string | null): void {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

themeToggle.addEventListener('click', () => {
  const current =
    document.documentElement.getAttribute('data-theme') ??
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

applyTheme(localStorage.getItem(THEME_KEY));

// ---- URLハッシュ復元(#y=2020&c=1945&r=1950) ----

const params = new URLSearchParams(location.hash.slice(1));
const hashYear = Number(params.get('y'));
if (Number.isFinite(hashYear) && hashYear >= START_YEAR && hashYear <= END_YEAR) {
  year = hashYear;
}
const hashCohort = Number(params.get('c'));
if (params.has('c') && Number.isFinite(hashCohort)) {
  cohortStart = hashCohort;
  cohortClear.hidden = false;
  cohortStatus.textContent = `${hashCohort}年から${hashCohort + 5}年に生まれた世代を追跡中`;
}
const hashRef = Number(params.get('r'));
if (params.has('r') && Number.isFinite(hashRef) && hashRef >= START_YEAR && hashRef <= END_YEAR) {
  refYear = hashRef;
  refSelect.value = String(hashRef);
  referenceGroup.innerHTML = renderReference(interpolateSnapshot(series, hashRef));
}

update();
