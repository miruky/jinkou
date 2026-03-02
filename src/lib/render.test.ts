import { describe, expect, it } from 'vitest';
import { AXIS_MAX, LAYOUT, barRect, renderPyramid, rowTitle } from './render';
import { interpolateSnapshot, projectSeries } from './model';

const series = projectSeries();
const snap2020 = interpolateSnapshot(series, 2020);
const svg = renderPyramid(snap2020);

describe('renderPyramid', () => {
  it('スケーラブルなSVG(viewBox指定・幅高さ非固定)を返す', () => {
    expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 920 600"/);
    expect(svg).not.toMatch(/^<svg [^>]*width=/);
    expect(svg).toContain('aria-label="2020年の人口ピラミッド"');
  });

  it('21階級の行と男女42本のバーを描く', () => {
    expect(svg.match(/class="jinkou-row[" ]/g)).toHaveLength(21);
    expect(svg.match(/class="jinkou-bar jinkou-bar-male"/g)).toHaveLength(21);
    expect(svg.match(/class="jinkou-bar jinkou-bar-female"/g)).toHaveLength(21);
  });

  it('行ごとに人数のtitleが付く', () => {
    expect(svg).toContain(`<title>${rowTitle(snap2020, 0)}</title>`);
    expect(rowTitle(snap2020, 14)).toMatch(/^70-74歳 男性[\d,]+万人 女性[\d,]+万人$/);
  });

  it('左右対称の目盛りを描く', () => {
    expect(svg.match(/>600万</g)).toHaveLength(2);
    expect(svg.match(/>200万</g)).toHaveLength(2);
  });

  it('コーホート指定で該当階級が強調される', () => {
    const highlighted = renderPyramid(snap2020, { cohortStart: 1945 });
    expect(highlighted).toContain('class="jinkou-row is-cohort" data-bin="14"');
    expect(highlighted.match(/is-cohort/g)).toHaveLength(1);
  });

  it('バーの幅は軸上限に対する比例で、男女が中心軸から伸びる', () => {
    const male = barRect(AXIS_MAX / 2, 'male');
    expect(male.width).toBeCloseTo(LAYOUT.sideWidth / 2, 6);
    expect(male.x).toBeCloseTo(LAYOUT.centerLeft - LAYOUT.sideWidth / 2, 6);
    const female = barRect(AXIS_MAX, 'female');
    expect(female.x).toBe(LAYOUT.centerRight);
    expect(female.width).toBeCloseTo(LAYOUT.sideWidth, 6);
    expect(barRect(-10, 'female').width).toBe(0);
  });

  it('全時点でバーが軸上限を超えない', () => {
    for (const snapshot of series.snapshots) {
      for (const v of [...snapshot.male, ...snapshot.female]) {
        expect(v).toBeLessThanOrEqual(AXIS_MAX);
      }
    }
  });
});
