import { describe, expect, it } from 'vitest';
import { formatAge, formatPopulation, formatShare, medianAge, snapshotStats } from './stats';
import { BIN_COUNT, type PyramidSnapshot } from './types';

function uniformSnapshot(value: number): PyramidSnapshot {
  return {
    year: 2000,
    male: new Array<number>(BIN_COUNT).fill(value),
    female: new Array<number>(BIN_COUNT).fill(value),
  };
}

describe('snapshotStats', () => {
  it('三区分の割合は合計1になる', () => {
    const stats = snapshotStats(uniformSnapshot(100));
    expect(stats.youngShare + stats.workingShare + stats.elderlyShare).toBeCloseTo(1, 9);
  });

  it('一様な分布では区分の幅に比例する', () => {
    const stats = snapshotStats(uniformSnapshot(100));
    expect(stats.total).toBe(100 * BIN_COUNT * 2);
    expect(stats.youngShare).toBeCloseTo(3 / 21, 9);
    expect(stats.workingShare).toBeCloseTo(10 / 21, 9);
    expect(stats.elderlyShare).toBeCloseTo(8 / 21, 9);
    expect(stats.agedDependency).toBeCloseTo(8 / 10, 9);
  });

  it('老年人口だけの分布で高齢化率が1になる', () => {
    const snap = uniformSnapshot(0);
    snap.male[15] = 100;
    snap.female[16] = 100;
    const stats = snapshotStats(snap);
    expect(stats.elderlyShare).toBe(1);
    expect(stats.youngShare).toBe(0);
  });

  it('従属人口指数は(年少+老年)/生産年齢', () => {
    const stats = snapshotStats(uniformSnapshot(100));
    expect(stats.totalDependency).toBeCloseTo(11 / 10, 9);
  });
});

describe('medianAge', () => {
  it('一様分布の中位年齢はおよそ中央(52.5歳)', () => {
    // 21階級が一様 → 累積50%は11番目の階級(50-54歳)の入口
    expect(medianAge(uniformSnapshot(100))).toBeCloseTo(52.5, 6);
  });

  it('階級内を線形補間する', () => {
    const snap: PyramidSnapshot = {
      year: 2000,
      male: new Array<number>(BIN_COUNT).fill(0),
      female: new Array<number>(BIN_COUNT).fill(0),
    };
    // 0-4歳に80・5-9歳に20。半分(50)は最初の階級の途中
    snap.male[0] = 40;
    snap.female[0] = 40;
    snap.male[1] = 10;
    snap.female[1] = 10;
    // half=50, 0番目に80 → within=50/80=0.625 → 0*5+0.625*5=3.125
    expect(medianAge(snap)).toBeCloseTo(3.125, 6);
  });

  it('人口ゼロでは0歳', () => {
    expect(medianAge(uniformSnapshot(0))).toBe(0);
  });
});

describe('表記(中位年齢)', () => {
  it('小数1桁の歳表記', () => {
    expect(formatAge(48.27)).toBe('48.3歳');
    expect(formatAge(0)).toBe('0.0歳');
  });
});

describe('表記', () => {
  it('千人単位を万人表記へ丸める', () => {
    expect(formatPopulation(84200)).toBe('8,420万人');
    expect(formatPopulation(4)).toBe('0万人');
  });

  it('1億人以上は億と万を併記する', () => {
    expect(formatPopulation(126000)).toBe('1億2,600万人');
    expect(formatPopulation(100000)).toBe('1億人');
  });

  it('割合は小数1桁のパーセント', () => {
    expect(formatShare(0.2864)).toBe('28.6%');
    expect(formatShare(0)).toBe('0.0%');
  });
});
