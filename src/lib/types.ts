/** 5歳階級のインデックス。0が0-4歳、20が100歳以上 */
export const BIN_COUNT = 21;

/** ある年の人口ピラミッド。値は千人単位、添字は5歳階級 */
export interface PyramidSnapshot {
  year: number;
  male: number[];
  female: number[];
}

/** 5年刻みの推移全体 */
export interface PyramidSeries {
  startYear: number;
  endYear: number;
  step: number;
  snapshots: PyramidSnapshot[];
}

export type Sex = 'male' | 'female';
