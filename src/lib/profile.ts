import { classify } from './classify';
import { buildWarnings } from './rules';
import type { CharClass, ColumnProfile } from './types';

const PREFIX_LENGTH = 3;     // 先頭の文字数（v0.1 は 3 文字固定）
const PREFIX_TOP = 5;        // 長さグループごとに表示する上位件数
const SAMPLE_COUNT = 5;

// 長さは Unicode のコードポイント数で数える（加工前の値のまま）
function codePointLength(value: string): number {
  return [...value].length;
}

function codePointPrefix(value: string): string {
  return [...value].slice(0, PREFIX_LENGTH).join('');
}

export function profileColumns(rows: string[][], hasHeader: boolean): ColumnProfile[] {
  if (rows.length === 0) return [];

  const columnCount = rows[0].length;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const profiles: ColumnProfile[] = [];
  for (let index = 0; index < columnCount; index++) {
    const name = hasHeader ? (rows[0][index] ?? '') : `列${index + 1}`;
    const values = dataRows.map((row) => row[index] ?? '');

    let empty = 0;
    let whitespaceOnly = 0;
    let trimIssues = 0;
    let leadingZero = 0;
    const distinctValues = new Set<string>();
    const lengthCounts = new Map<number, number>();
    const classCounts = new Map<CharClass, number>();
    const prefixCounts = new Map<number, Map<string, number>>();
    const samples: string[] = [];

    for (const value of values) {
      if (value === '') {
        empty++;
        continue;
      }
      if (value.trim() === '') whitespaceOnly++;
      if (value !== value.trim()) trimIssues++;
      if (/^0[0-9]/.test(value)) leadingZero++;

      distinctValues.add(value);
      if (samples.length < SAMPLE_COUNT) samples.push(value);

      const length = codePointLength(value);
      lengthCounts.set(length, (lengthCounts.get(length) ?? 0) + 1);

      const cls = classify(value);
      classCounts.set(cls, (classCounts.get(cls) ?? 0) + 1);

      let prefixes = prefixCounts.get(length);
      if (!prefixes) {
        prefixes = new Map();
        prefixCounts.set(length, prefixes);
      }
      const prefix = codePointPrefix(value);
      prefixes.set(prefix, (prefixes.get(prefix) ?? 0) + 1);
    }

    const lengthDist = [...lengthCounts.entries()]
      .map(([length, count]) => ({ length, count }))
      .sort((a, b) => a.length - b.length);

    const classDist = [...classCounts.entries()]
      .map(([cls, count]) => ({ cls, count }))
      .sort((a, b) => b.count - a.count);

    const prefixByLength = [...prefixCounts.entries()]
      .sort(([a], [b]) => a - b)
      .map(([length, counts]) => {
        const sorted = [...counts.entries()]
          .map(([prefix, count]) => ({ prefix, count }))
          .sort((a, b) => b.count - a.count);
        const top = sorted.slice(0, PREFIX_TOP);
        const others = sorted.slice(PREFIX_TOP).reduce((sum, p) => sum + p.count, 0);
        return { length, prefixes: top, others };
      });

    const base = {
      index,
      name,
      total: values.length,
      empty,
      whitespaceOnly,
      trimIssues,
      leadingZero,
      distinct: distinctValues.size,
      lengthDist,
      classDist,
      prefixByLength,
      samples,
    };
    profiles.push({ ...base, warnings: buildWarnings(base) });
  }
  return profiles;
}
