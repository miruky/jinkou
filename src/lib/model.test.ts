import { describe, expect, it } from 'vitest';
import {
  END_YEAR,
  START_YEAR,
  binOfCohort,
  cohortStartOf,
  fiveYearSurvival,
  interpolateSnapshot,
  projectSeries,
} from './model';
import { snapshotStats } from './stats';
import { BIRTHS_5Y } from './data';

const series = projectSeries();
const byYear = new Map(series.snapshots.map((s) => [s.year, s]));

describe('projectSeries', () => {
  it('1950年から2070年まで5年刻みの25時点を返す', () => {
    expect(series.snapshots).toHaveLength(25);
    expect(series.snapshots[0]!.year).toBe(START_YEAR);
    expect(series.snapshots[24]!.year).toBe(END_YEAR);
  });

  it('総人口の推移が実勢の概形と整合する', () => {
    const total = (year: number) => snapshotStats(byYear.get(year)!).total;
    expect(total(1990)).toBeGreaterThan(113000);
    expect(total(1990)).toBeLessThan(130000);
    expect(total(2020)).toBeGreaterThan(113000);
    expect(total(2020)).toBeLessThan(132000);
    expect(total(2070)).toBeGreaterThan(70000);
    expect(total(2070)).toBeLessThan(105000);
  });

  it('総人口のピークは2000年代に来て、その後は減少が続く', () => {
    const totals = series.snapshots.map((s) => ({ year: s.year, total: snapshotStats(s).total }));
    const peak = totals.reduce((a, b) => (b.total > a.total ? b : a));
    expect(peak.year).toBeGreaterThanOrEqual(1995);
    expect(peak.year).toBeLessThanOrEqual(2025);
    const after = totals.filter((t) => t.year >= 2030);
    for (let i = 1; i < after.length; i++) {
      expect(after[i]!.total).toBeLessThan(after[i - 1]!.total);
    }
  });

  it('2020年の高齢化率が3割弱になる', () => {
    const stats = snapshotStats(byYear.get(2020)!);
    expect(stats.elderlyShare).toBeGreaterThan(0.23);
    expect(stats.elderlyShare).toBeLessThan(0.33);
  });

  it('コーホートは死亡でしか減らない(加齢で増えない)', () => {
    for (let i = 1; i < series.snapshots.length; i++) {
      const prev = series.snapshots[i - 1]!;
      const next = series.snapshots[i]!;
      for (const sex of ['male', 'female'] as const) {
        for (let bin = 0; bin < 19; bin++) {
          expect(next[sex][bin + 1]).toBeLessThanOrEqual(prev[sex][bin]! + 1e-9);
        }
      }
    }
  });

  it('各時点の0-4歳は当該期間の出生数を超えない', () => {
    for (let i = 1; i < series.snapshots.length; i++) {
      const snap = series.snapshots[i]!;
      const births = BIRTHS_5Y[snap.year - 5]!;
      expect(snap.male[0]! + snap.female[0]!).toBeLessThanOrEqual(births);
    }
  });
});

describe('fiveYearSurvival', () => {
  it('高齢ほど生残率が下がる', () => {
    expect(fiveYearSurvival(4, 2000, 'male')).toBeGreaterThan(fiveYearSurvival(14, 2000, 'male'));
    expect(fiveYearSurvival(14, 2000, 'male')).toBeGreaterThan(fiveYearSurvival(19, 2000, 'male'));
  });

  it('死亡率は時代とともに改善し、女性の方が生き残りやすい', () => {
    expect(fiveYearSurvival(14, 2020, 'male')).toBeGreaterThan(fiveYearSurvival(14, 1950, 'male'));
    expect(fiveYearSurvival(14, 2000, 'female')).toBeGreaterThan(
      fiveYearSurvival(14, 2000, 'male'),
    );
  });
});

describe('interpolateSnapshot', () => {
  it('時点上の年はその時点をそのまま返す', () => {
    const snap = interpolateSnapshot(series, 2000);
    expect(snap.male).toEqual(byYear.get(2000)!.male);
  });

  it('中間年は前後の平均になる', () => {
    const mid = interpolateSnapshot(series, 1972.5);
    const a = byYear.get(1970)!;
    const b = byYear.get(1975)!;
    expect(mid.male[0]).toBeCloseTo((a.male[0]! + b.male[0]!) / 2, 6);
  });

  it('範囲外は端に丸める', () => {
    expect(interpolateSnapshot(series, 1900).year).toBe(START_YEAR);
    expect(interpolateSnapshot(series, 2200).year).toBe(END_YEAR);
  });
});

describe('コーホートの追跡', () => {
  it('クリック位置から出生期間を逆算できる', () => {
    expect(cohortStartOf(1950, 0)).toBe(1945);
    expect(cohortStartOf(2020, 14)).toBe(1945);
  });

  it('出生期間から任意の年の階級を求められる', () => {
    expect(binOfCohort(1945, 1950)).toBe(0);
    expect(binOfCohort(1945, 2020)).toBe(14);
    expect(binOfCohort(1945, 1945)).toBeNull();
    expect(binOfCohort(1945, 2070)).toBe(20);
  });
});
