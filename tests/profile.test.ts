import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decode } from '../src/lib/decode';
import { parse } from '../src/lib/parse';
import { profileColumns } from '../src/lib/profile';
import type { ColumnProfile, WarningCode } from '../src/lib/types';

const csvPath = join(__dirname, '..', 'public', 'sample', 'sample_seizo_shiji.csv');

function loadSampleProfiles(): { profiles: ColumnProfile[]; detected: string } {
  const buf = readFileSync(csvPath);
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const { text, detected } = decode(arrayBuffer, 'auto');
  const { rows } = parse(text);
  return { profiles: profileColumns(rows, true), detected };
}

const { profiles, detected } = loadSampleProfiles();

function column(name: string): ColumnProfile {
  const col = profiles.find((p) => p.name === name);
  if (!col) throw new Error(`列が見つかりません: ${name}`);
  return col;
}

function codes(col: ColumnProfile): WarningCode[] {
  return col.warnings.map((w) => w.code);
}

describe('profile（同梱サンプル・仕様 10-1）', () => {
  it('文字コードが Shift_JIS と検出される', () => {
    expect(detected).toBe('shift_jis');
  });

  it('6 列 × 400 データ行が読み込まれる', () => {
    expect(profiles).toHaveLength(6);
    expect(profiles[0].total).toBe(400);
  });

  it('製造指示ID: LEN_MIXED(info) と LEN_MINORITY(warn)', () => {
    const col = column('製造指示ID');
    expect(codes(col)).toEqual(['LEN_MIXED', 'LEN_MINORITY']);
    const minority = col.warnings.find((w) => w.code === 'LEN_MINORITY');
    expect(minority?.level).toBe('warn');
    expect(col.warnings.find((w) => w.code === 'LEN_MIXED')?.level).toBe('info');
  });

  it('製造指示ID: 長さ分布が 6:60 / 7:330 / 10:10', () => {
    const col = column('製造指示ID');
    expect(col.lengthDist).toEqual([
      { length: 6, count: 60 },
      { length: 7, count: 330 },
      { length: 10, count: 10 },
    ]);
  });

  it('製造指示ID: 長さ 10 グループの先頭 3 文字は「200」10 件が上位 1 位', () => {
    const col = column('製造指示ID');
    const group = col.prefixByLength.find((g) => g.length === 10);
    expect(group?.prefixes[0]).toEqual({ prefix: '200', count: 10 });
  });

  it('部品名: LEN_MIXED(info) のみ', () => {
    expect(codes(column('部品名'))).toEqual(['LEN_MIXED']);
  });

  it('図面番号: LEN_MIXED / CLASS_MIXED / LEADING_ZERO（すべて info）', () => {
    const col = column('図面番号');
    expect(codes(col)).toEqual(['LEN_MIXED', 'CLASS_MIXED', 'LEADING_ZERO']);
    expect(col.warnings.every((w) => w.level === 'info')).toBe(true);
  });

  it('数量: LEN_MIXED / CLASS_MIXED / FULLWIDTH_DIGIT(warn) 2 件', () => {
    const col = column('数量');
    expect(codes(col)).toEqual(['LEN_MIXED', 'CLASS_MIXED', 'FULLWIDTH_DIGIT']);
    const fullwidth = col.warnings.find((w) => w.code === 'FULLWIDTH_DIGIT');
    expect(fullwidth?.level).toBe('warn');
    expect(fullwidth?.message).toContain('2 件');
    expect(col.classDist.find((c) => c.cls === 'fullwidth_digit')?.count).toBe(2);
  });

  it('納期: MISSING(info) 6 件', () => {
    const col = column('納期');
    expect(codes(col)).toEqual(['MISSING']);
    expect(col.empty).toBe(6);
    expect(col.warnings[0].level).toBe('info');
  });

  it('得意先: WHITESPACE(warn) 3 件 と LEN_MIXED(info)', () => {
    const col = column('得意先');
    expect(codes(col).sort()).toEqual(['LEN_MIXED', 'WHITESPACE'].sort());
    const ws = col.warnings.find((w) => w.code === 'WHITESPACE');
    expect(ws?.level).toBe('warn');
    expect(col.trimIssues).toBe(3);
  });

  it('注意（warn）の合計が 3 件', () => {
    const warnCount = profiles
      .flatMap((p) => p.warnings)
      .filter((w) => w.level === 'warn').length;
    expect(warnCount).toBe(3);
  });

  it('値が変換されない（先頭の 0・全角がそのまま）', () => {
    const zuban = column('図面番号');
    expect(zuban.samples.some((s) => s.startsWith('00'))).toBe(true);
    expect(zuban.leadingZero).toBeGreaterThan(0);
  });
});
