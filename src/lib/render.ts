import { AGE_LABELS } from './data';
import { binOfCohort } from './model';
import type { PyramidSnapshot, Sex } from './types';

// 片側の軸の上限(千人)。全時点で固定し、年をまたいだ比較を成立させる。
export const AXIS_MAX = 6000;

// viewBox 0 0 920 600 を前提としたレイアウト定数
export const LAYOUT = {
  width: 920,
  height: 600,
  plotTop: 48,
  plotBottom: 552,
  centerLeft: 428,
  centerRight: 492,
  sideWidth: 368,
  rowHeight: 24,
  barHeight: 18,
};

/** 階級の値からバーの x 座標と幅を求める(main.tsのフレーム更新と共用) */
export function barRect(value: number, sex: Sex): { x: number; width: number } {
  const width = (Math.max(0, value) / AXIS_MAX) * LAYOUT.sideWidth;
  return sex === 'male'
    ? { x: LAYOUT.centerLeft - width, width }
    : { x: LAYOUT.centerRight, width };
}

export function rowY(bin: number): number {
  return (
    LAYOUT.plotBottom - (bin + 1) * LAYOUT.rowHeight + (LAYOUT.rowHeight - LAYOUT.barHeight) / 2
  );
}

/** 行のtitle文言。フレーム更新でも使う */
export function rowTitle(snapshot: PyramidSnapshot, bin: number): string {
  const male = Math.round(snapshot.male[bin]! / 10);
  const female = Math.round(snapshot.female[bin]! / 10);
  return `${AGE_LABELS[bin]}歳 男性${male.toLocaleString('ja-JP')}万人 女性${female.toLocaleString('ja-JP')}万人`;
}

function grid(): string {
  const parts: string[] = [];
  for (const tick of [2000, 4000, 6000]) {
    const dx = (tick / AXIS_MAX) * LAYOUT.sideWidth;
    const label = `${tick / 10}万`;
    for (const x of [LAYOUT.centerLeft - dx, LAYOUT.centerRight + dx]) {
      parts.push(
        `<line class="jinkou-grid-line" x1="${x}" y1="${LAYOUT.plotTop}" x2="${x}" y2="${LAYOUT.plotBottom}"/>`,
        `<text class="jinkou-grid-label" x="${x}" y="${LAYOUT.plotBottom + 18}" text-anchor="middle">${label}</text>`,
      );
    }
  }
  parts.push(
    `<line class="jinkou-grid-line jinkou-grid-zero" x1="${LAYOUT.centerLeft}" y1="${LAYOUT.plotTop}" x2="${LAYOUT.centerLeft}" y2="${LAYOUT.plotBottom}"/>`,
    `<line class="jinkou-grid-line jinkou-grid-zero" x1="${LAYOUT.centerRight}" y1="${LAYOUT.plotTop}" x2="${LAYOUT.centerRight}" y2="${LAYOUT.plotBottom}"/>`,
  );
  return parts.join('');
}

export interface RenderOptions {
  /** 強調する出生コーホートの開始年。nullなら強調なし */
  cohortStart?: number | null;
}

/** 人口ピラミッド1時点分のSVG文字列を生成する純関数 */
export function renderPyramid(snapshot: PyramidSnapshot, options: RenderOptions = {}): string {
  const cohortBin =
    options.cohortStart != null ? binOfCohort(options.cohortStart, snapshot.year) : null;
  const rows: string[] = [];
  for (let bin = 0; bin < AGE_LABELS.length; bin++) {
    const y = rowY(bin);
    const m = barRect(snapshot.male[bin]!, 'male');
    const f = barRect(snapshot.female[bin]!, 'female');
    const cohort = bin === cohortBin ? ' is-cohort' : '';
    rows.push(
      `<g class="jinkou-row${cohort}" data-bin="${bin}" tabindex="0" role="button" ` +
        `aria-label="${AGE_LABELS[bin]}歳の階級を選択">` +
        `<title>${rowTitle(snapshot, bin)}</title>` +
        `<rect class="jinkou-row-hit" x="0" y="${y - 3}" width="${LAYOUT.width}" height="${LAYOUT.rowHeight}"/>` +
        `<rect class="jinkou-bar jinkou-bar-male" data-bin="${bin}" data-sex="male" ` +
        `x="${m.x.toFixed(2)}" y="${y}" width="${m.width.toFixed(2)}" height="${LAYOUT.barHeight}" rx="2"/>` +
        `<rect class="jinkou-bar jinkou-bar-female" data-bin="${bin}" data-sex="female" ` +
        `x="${f.x.toFixed(2)}" y="${y}" width="${f.width.toFixed(2)}" height="${LAYOUT.barHeight}" rx="2"/>` +
        `<text class="jinkou-age" x="${(LAYOUT.centerLeft + LAYOUT.centerRight) / 2}" ` +
        `y="${y + LAYOUT.barHeight - 5}" text-anchor="middle">${AGE_LABELS[bin]}</text>` +
        `</g>`,
    );
  }
  return (
    `<svg class="jinkou-pyramid" xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="0 0 ${LAYOUT.width} ${LAYOUT.height}" role="img" ` +
    `aria-label="${snapshot.year}年の人口ピラミッド">` +
    `<g class="jinkou-gridlines">${grid()}</g>` +
    `<text class="jinkou-year" x="64" y="36">${Math.round(snapshot.year)}年</text>` +
    `<g class="jinkou-legend-mark" aria-hidden="true">` +
    `<rect class="jinkou-bar-male" x="700" y="22" width="18" height="10" rx="2"/>` +
    `<text x="724" y="32">男性</text>` +
    `<rect class="jinkou-bar-female" x="784" y="22" width="18" height="10" rx="2"/>` +
    `<text x="808" y="32">女性</text>` +
    `</g>` +
    `<g class="jinkou-rows">${rows.join('')}</g>` +
    `<g class="jinkou-reference" aria-hidden="true"></g>` +
    `</svg>`
  );
}

/**
 * 比較用の参照年を、各階級の到達幅を示す輪郭(塗りなし)として描く。
 * 現在の年の棒に重ねると、年をまたいだ各階級の増減が一目で分かる。
 * 人口が無視できる(描画幅が1px未満の)階級は省く。
 */
export function renderReference(snapshot: PyramidSnapshot): string {
  const parts: string[] = [];
  for (let bin = 0; bin < AGE_LABELS.length; bin++) {
    const y = rowY(bin);
    for (const sex of ['male', 'female'] as const) {
      const r = barRect(snapshot[sex][bin]!, sex);
      if (r.width < 1) continue;
      parts.push(
        `<rect class="jinkou-ref-bar" x="${r.x.toFixed(2)}" y="${y}" ` +
          `width="${r.width.toFixed(2)}" height="${LAYOUT.barHeight}"/>`,
      );
    }
  }
  return parts.join('');
}
