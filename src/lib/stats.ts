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
}

const sum = (xs: number[], from: number, to: number) =>
  xs.slice(from, to).reduce((acc, x) => acc + x, 0);

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
