import type { PyramidSnapshot } from './types';

export interface SnapshotStats {
  /** 総人口(千人) */
  total: number;
  /** 年少人口 0-14歳の割合 */
  youngShare: number;
  /** 生産年齢人口 15-64歳の割合 */
  workingShare: number;
  /** 老年人口 65歳以上の割合 */
  elderlyShare: number;
  /** 老年人口指数(老年人口/生産年齢人口) */
  agedDependency: number;
  /** 従属人口指数((年少+老年)/生産年齢人口) */
  totalDependency: number;
  /** 中位年齢(歳) */
  medianAge: number;
}

const sum = (xs: number[], from: number, to: number) =>
  xs.slice(from, to).reduce((acc, x) => acc + x, 0);

/**
 * 中位年齢を5歳階級から線形補間で求める。
 * 累積人口が総人口の半分に達する階級の中を比例配分する。
 * 100歳以上の打ち切り階級も幅5歳として扱う(母集団が極小のため影響は軽微)。
 */
export function medianAge(snapshot: PyramidSnapshot): number {
  const both = snapshot.male.map((m, i) => m + snapshot.female[i]!);
  const total = both.reduce((acc, x) => acc + x, 0);
  if (total <= 0) return 0;
  const half = total / 2;
  let cumulative = 0;
  for (let bin = 0; bin < both.length; bin++) {
    const inBin = both[bin]!;
    if (cumulative + inBin >= half) {
      const within = inBin === 0 ? 0 : (half - cumulative) / inBin;
      return bin * 5 + within * 5;
    }
    cumulative += inBin;
  }
  return both.length * 5;
}

export function snapshotStats(snapshot: PyramidSnapshot): SnapshotStats {
  const both = snapshot.male.map((m, i) => m + snapshot.female[i]!);
  const young = sum(both, 0, 3);
  const working = sum(both, 3, 13);
  const elderly = sum(both, 13, both.length);
  const total = young + working + elderly;
  return {
    total,
    youngShare: young / total,
    workingShare: working / total,
    elderlyShare: elderly / total,
    agedDependency: elderly / working,
    totalDependency: (young + elderly) / working,
    medianAge: medianAge(snapshot),
  };
}

/** 千人単位の値を「8,420万人」のような表記にする */
export function formatPopulation(thousands: number): string {
  const man = Math.round(thousands / 10);
  if (man >= 10000) {
    const oku = Math.floor(man / 10000);
    const rest = man % 10000;
    return rest === 0 ? `${oku}億人` : `${oku}億${rest.toLocaleString('ja-JP')}万人`;
  }
  return `${man.toLocaleString('ja-JP')}万人`;
}

export function formatShare(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

/** 中位年齢を「48.2歳」のように小数1桁で表記する */
export function formatAge(age: number): string {
  return `${age.toFixed(1)}歳`;
}
