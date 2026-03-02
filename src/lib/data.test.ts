import { describe, expect, it } from 'vitest';
import { AGE_LABELS, BIRTHS_5Y, INITIAL_1950 } from './data';
import { BIN_COUNT } from './types';

describe('入力データ', () => {
  it('5歳階級は0-4から100+まで21階級', () => {
    expect(AGE_LABELS).toHaveLength(BIN_COUNT);
    expect(AGE_LABELS[0]).toBe('0-4');
    expect(AGE_LABELS[20]).toBe('100+');
  });

  it('1950年の初期人口は男女とも21階級で、合計が83百万人前後', () => {
    expect(INITIAL_1950.male).toHaveLength(BIN_COUNT);
    expect(INITIAL_1950.female).toHaveLength(BIN_COUNT);
    const total = [...INITIAL_1950.male, ...INITIAL_1950.female].reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(82000);
    expect(total).toBeLessThan(86000);
  });

  it('出生数は1950年から2065年まで5年刻みで揃っている', () => {
    const years = Object.keys(BIRTHS_5Y)
      .map(Number)
      .sort((a, b) => a - b);
    expect(years[0]).toBe(1950);
    expect(years[years.length - 1]).toBe(2065);
    years.forEach((y, i) => {
      if (i > 0) expect(y - years[i - 1]!).toBe(5);
    });
  });

  it('出生数の起伏が実勢の概形を持つ(第二次ベビーブームと少子化)', () => {
    expect(BIRTHS_5Y[1970]).toBeGreaterThan(BIRTHS_5Y[1965]!);
    expect(BIRTHS_5Y[1970]).toBeGreaterThan(BIRTHS_5Y[1975]!);
    expect(BIRTHS_5Y[2020]).toBeLessThan(BIRTHS_5Y[1950]! / 2);
    for (const value of Object.values(BIRTHS_5Y)) {
      expect(value).toBeGreaterThan(1500);
      expect(value).toBeLessThan(11000);
    }
  });
});
