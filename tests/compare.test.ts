import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compare } from '../src/lib/compare';
import type { ColumnDiff, DiffCode } from '../src/lib/compare';
import { decode } from '../src/lib/decode';
import { parse } from '../src/lib/parse';
import { profileColumns } from '../src/lib/profile';
import type { ColumnProfile } from '../src/lib/types';

const sampleDir = join(__dirname, '..', 'public', 'sample');

function loadProfiles(file: string): ColumnProfile[] {
  const buf = readFileSync(join(sampleDir, file));
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const { text } = decode(arrayBuffer, 'auto');
  const { rows } = parse(text);
  return profileColumns(rows, true);
}

const prevProfiles = loadProfiles('sample_seizo_shiji_prev.csv');
const currProfiles = loadProfiles('sample_seizo_shiji.csv');
const diff = compare(prevProfiles, currProfiles);

function column(name: string): ColumnDiff {
  const col = diff.columns.find((c) => c.name === name);
  if (!col) throw new Error(`列が見つかりません: ${name}`);
  return col;
}

function codes(col: ColumnDiff): DiffCode[] {
  return col.findings.map((f) => f.code);
}

describe('compare（同梱サンプル 前回 → 今回・v0.2 受け入れ条件）', () => {
  it('行数 400 → 400', () => {
    expect(diff.prevRows).toBe(400);
    expect(diff.currRows).toBe(400);
  });

  it('6 列すべて名前で対応し、COL_* は 0 件', () => {
    expect(diff.columns).toHaveLength(6);
    for (const c of diff.columns) {
      expect(c.prev).not.toBeNull();
      expect(c.curr).not.toBeNull();
      expect(c.prevIndex).toBe(c.currIndex);
    }
    const colCodes = diff.columns.flatMap(codes).filter((c) => c.startsWith('COL_'));
    expect(colCodes).toEqual([]);
  });

  it('製造指示ID: NEW_LENGTH(warn) 10 文字が 10 件、前回は 6・7、先頭 3 文字 1 位は「200」10 件', () => {
    const col = column('製造指示ID');
    expect(codes(col)).toEqual(['NEW_LENGTH']);
    const f = col.findings[0];
    expect(f.level).toBe('warn');
    expect(col.prev?.lengthDist.map((d) => d.length)).toEqual([6, 7]);
    expect(f.message).toBe(
      '前回は 6、7 文字の値だけでしたが、今回は 10 文字の値が 10 件あります。先頭の3文字は「200」が最も多く 10 件です。採番の変更や、先頭に何かが付いていないか確認してください。',
    );
    const group = col.curr?.prefixByLength.find((g) => g.length === 10);
    expect(group?.prefixes[0]).toEqual({ prefix: '200', count: 10 });
  });

  it('数量: NEW_CLASS(warn) 全角数字が 2 件', () => {
    const col = column('数量');
    expect(codes(col)).toEqual(['NEW_CLASS']);
    expect(col.findings[0].level).toBe('warn');
    expect(col.findings[0].message).toBe(
      '今回、全角数字を含む の値が 2 件あります。前回のファイルにはありませんでした。',
    );
  });

  it.each(['部品名', '図面番号', '納期', '得意先'])('%s: 変化なし', (name) => {
    expect(column(name).findings).toEqual([]);
  });

  it('注意（warn）の合計が 2 件', () => {
    const warn = diff.columns.flatMap((c) => c.findings).filter((f) => f.level === 'warn');
    expect(warn).toHaveLength(2);
  });

  it('同じファイル同士を比べると変化は 0 件', () => {
    const same = compare(currProfiles, currProfiles);
    expect(same.columns.flatMap((c) => c.findings)).toEqual([]);
    const samePrev = compare(prevProfiles, prevProfiles);
    expect(samePrev.columns.flatMap((c) => c.findings)).toEqual([]);
  });
});

// 手書きの最小プロファイル
function col(index: number, name: string, opts: Partial<ColumnProfile> = {}): ColumnProfile {
  return {
    index,
    name,
    total: 100,
    empty: 0,
    whitespaceOnly: 0,
    trimIssues: 0,
    leadingZero: 0,
    distinct: 100,
    lengthDist: [{ length: 5, count: 100 }],
    classDist: [{ cls: 'digits', count: 100 }],
    prefixByLength: [{ length: 5, prefixes: [{ prefix: '123', count: 100 }], others: 0 }],
    samples: [],
    warnings: [],
    ...opts,
  };
}

describe('compare（手書きプロファイル）', () => {
  it('COL_ADDED / COL_REMOVED（warn）。前回だけの列は最後に付く', () => {
    const d = compare([col(0, 'A'), col(1, 'B')], [col(0, 'A'), col(1, 'C')]);
    expect(d.columns.map((c) => c.name)).toEqual(['A', 'C', 'B']);
    const c = d.columns[1];
    expect(codes(c)).toEqual(['COL_ADDED']);
    expect(c.findings[0].level).toBe('warn');
    expect(c.prevIndex).toBeNull();
    const b = d.columns[2];
    expect(codes(b)).toEqual(['COL_REMOVED']);
    expect(b.findings[0].level).toBe('warn');
    expect(b.currIndex).toBeNull();
  });

  it('COL_MOVED（info）', () => {
    const d = compare([col(0, 'A'), col(1, 'B')], [col(0, 'B'), col(1, 'A')]);
    const b = d.columns[0];
    expect(b.name).toBe('B');
    expect(codes(b)).toEqual(['COL_MOVED']);
    expect(b.findings[0].level).toBe('info');
    expect(b.findings[0].message).toBe(
      '前回は 2 列目、今回は 1 列目です。列の位置で取り込んでいる場合、値がずれて読まれます。',
    );
  });

  it('位置で対応させるときは COL_MOVED を出さない', () => {
    const d = compare([col(0, '列1'), col(1, '列2')], [col(0, '列1'), col(1, '列2'), col(2, '列3')], {
      matchBy: 'position',
    });
    expect(d.columns.map(codes)).toEqual([[], [], ['COL_ADDED']]);
  });

  it('名前は完全一致（前後の空白も区別する）', () => {
    const d = compare([col(0, 'A')], [col(0, 'A ')]);
    expect(d.columns.map(codes)).toEqual([['COL_ADDED'], ['COL_REMOVED']]);
  });

  it('同じ名前の列は出てきた順に 1 対 1 で対応させる', () => {
    const d = compare([col(0, 'X'), col(1, 'X')], [col(0, 'X'), col(1, 'Y'), col(2, 'X')]);
    expect(d.columns.map((c) => [c.name, c.prevIndex, c.currIndex])).toEqual([
      ['X', 0, 0],
      ['Y', null, 1],
      ['X', 1, 2],
    ]);
  });

  it('MISSING_UP（warn）：5 ポイント以上増えたら出る', () => {
    const d = compare([col(0, 'A', { empty: 10 })], [col(0, 'A', { empty: 15 })]);
    expect(codes(d.columns[0])).toEqual(['MISSING_UP']);
    expect(d.columns[0].findings[0].level).toBe('warn');
    expect(d.columns[0].findings[0].message).toBe(
      '空欄の割合が 10.0% → 15.0% に増えました（今回 15 件）。',
    );
  });

  it('MISSING_UP：増加が 5 ポイント未満なら出ない', () => {
    const d = compare([col(0, 'A', { empty: 10 })], [col(0, 'A', { empty: 14 })]);
    expect(codes(d.columns[0])).toEqual([]);
  });

  it('NEW_LENGTH は前回の長さが LEN_MAX_GROUPS を超える列では出さない', () => {
    const many = [1, 2, 3, 4, 5, 6].map((length) => ({ length, count: 10 }));
    const d = compare(
      [col(0, 'A', { lengthDist: many })],
      [col(0, 'A', { lengthDist: [...many, { length: 20, count: 1 }] })],
    );
    expect(codes(d.columns[0])).toEqual([]);
  });

  it('NEW_LENGTH / NEW_CLASS は新しく出たものごとに 1 件', () => {
    const d = compare(
      [col(0, 'A')],
      [col(0, 'A', {
        lengthDist: [{ length: 5, count: 90 }, { length: 6, count: 5 }, { length: 8, count: 5 }],
        classDist: [
          { cls: 'digits', count: 90 },
          { cls: 'alnum', count: 5 },
          { cls: 'non_ascii', count: 5 },
        ],
      })],
    );
    expect(codes(d.columns[0])).toEqual(['NEW_LENGTH', 'NEW_LENGTH', 'NEW_CLASS', 'NEW_CLASS']);
  });
});
