import { BIRTHS_5Y, INITIAL_1950, MALE_BIRTH_SHARE, MORTALITY } from './data';
import { BIN_COUNT, type PyramidSeries, type PyramidSnapshot, type Sex } from './types';

export const START_YEAR = 1950;
export const END_YEAR = 2070;
export const STEP = 5;

/** 年齢別・年次別の死亡率(人/年)。Gompertz+背景死亡率 */
export function mortalityRate(age: number, year: number, sex: Sex): number {
  const t = Math.max(0, year - START_YEAR);
  const level = Math.max(
    MORTALITY.minLevel,
    MORTALITY.baseLevel * Math.exp(-MORTALITY.levelDecay * t),
  );
  const background = Math.max(
    MORTALITY.minBackground,
    MORTALITY.background * Math.exp(-MORTALITY.backgroundDecay * t),
  );
  const factor = sex === 'male' ? MORTALITY.maleFactor : MORTALITY.femaleFactor;
  return (level * Math.exp(MORTALITY.slope * age) + background) * factor;
}

/** 5歳階級 bin から次の階級へ5年間で生き残る確率 */
export function fiveYearSurvival(bin: number, year: number, sex: Sex): number {
  const midAge = bin * 5 + 2.5;
  return Math.exp(-5 * mortalityRate(midAge, year + 2.5, sex));
}

/** 出生から0-4歳階級として観測されるまでの生残率 */
export function infantSurvival(year: number): number {
  const t = Math.max(0, year - START_YEAR);
  const loss = Math.max(
    MORTALITY.minInfant,
    MORTALITY.infant1950 * Math.exp(-MORTALITY.infantDecay * t),
  );
  return 1 - loss;
}

function advance(prev: PyramidSnapshot): PyramidSnapshot {
  const year = prev.year + STEP;
  const births = BIRTHS_5Y[prev.year];
  if (births === undefined) {
    throw new Error(`${prev.year}年からの5年間の出生数が未定義`);
  }
  const next: PyramidSnapshot = {
    year,
    male: new Array<number>(BIN_COUNT).fill(0),
    female: new Array<number>(BIN_COUNT).fill(0),
  };
  for (const sex of ['male', 'female'] as const) {
    const source = prev[sex];
    const target = next[sex];
    for (let bin = 0; bin < BIN_COUNT - 1; bin++) {
      target[bin + 1] = source[bin]! * fiveYearSurvival(bin, prev.year, sex);
    }
    // 100歳以上は打ち切り階級として滞留分を合算する
    target[BIN_COUNT - 1]! +=
      source[BIN_COUNT - 1]! * fiveYearSurvival(BIN_COUNT - 1, prev.year, sex);
    const share = sex === 'male' ? MALE_BIRTH_SHARE : 1 - MALE_BIRTH_SHARE;
    target[0] = births * share * infantSurvival(prev.year);
  }
  return next;
}

/** 1950年の初期人口から2070年までコーホート要因法で前進計算する */
export function projectSeries(): PyramidSeries {
  let current: PyramidSnapshot = {
    year: START_YEAR,
    male: [...INITIAL_1950.male],
    female: [...INITIAL_1950.female],
  };
  const snapshots: PyramidSnapshot[] = [current];
  while (current.year < END_YEAR) {
    current = advance(current);
    snapshots.push(current);
  }
  return { startYear: START_YEAR, endYear: END_YEAR, step: STEP, snapshots };
}

/**
 * 任意の実数年のピラミッドを前後の時点から線形補間する。
 * アニメーションの滑らかさのためで、範囲外は端へ丸める。
 */
export function interpolateSnapshot(series: PyramidSeries, year: number): PyramidSnapshot {
  const clamped = Math.min(series.endYear, Math.max(series.startYear, year));
  const pos = (clamped - series.startYear) / series.step;
  const lower = Math.floor(pos);
  const upper = Math.min(series.snapshots.length - 1, lower + 1);
  const t = pos - lower;
  const a = series.snapshots[lower]!;
  const b = series.snapshots[upper]!;
  if (t === 0) return { year: clamped, male: [...a.male], female: [...a.female] };
  const mix = (xs: number[], ys: number[]) => xs.map((x, i) => x + (ys[i]! - x) * t);
  return { year: clamped, male: mix(a.male, b.male), female: mix(a.female, b.female) };
}

/**
 * クリックされた階級から出生コーホートを特定する。
 * 戻り値はコーホートの出生期間の開始年(5年幅)。
 */
export function cohortStartOf(year: number, bin: number): number {
  return year - (bin + 1) * STEP;
}

/** あるコーホートが指定年に属する階級。範囲外(未出生・100+超え前)は null */
export function binOfCohort(cohortStart: number, year: number): number | null {
  const bin = Math.floor((year - cohortStart) / STEP) - 1;
  if (bin < 0) return null;
  return Math.min(bin, BIN_COUNT - 1);
}
