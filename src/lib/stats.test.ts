import { describe, expect, it } from 'vitest';
import { formatPopulation, formatShare, snapshotStats } from './stats';
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
