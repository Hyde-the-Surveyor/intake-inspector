import { CHAR_CLASS_LABELS } from './classify';
import { LEN_MAX_GROUPS, MISSING_UP_POINTS } from './rules';
import type { ColumnProfile, Level } from './types';

// 前回と今回の列プロファイルを比べる（v0.2）。
// 比べるのは形（ColumnProfile）だけで、行と行の突き合わせはしない。CSV も読み直さない。

export type DiffCode =
  | 'COL_ADDED'     // 今回だけにある列
  | 'COL_REMOVED'   // 前回だけにある列
  | 'COL_MOVED'     // 列の位置が変わった
  | 'NEW_LENGTH'    // 前回なかった長さの値が出た
  | 'NEW_CLASS'     // 前回なかった文字種の値が出た
  | 'MISSING_UP';   // 空欄の割合が増えた

export interface Finding {
  code: DiffCode;
  level: Level;
  message: string;  // 画面にそのまま出す説明文。見出しは DIFF_TITLES
}

export interface ColumnDiff {
  name: string;
  prevIndex: number | null;   // 前回の列番号（0始まり）。なければ null
  currIndex: number | null;
  prev: ColumnProfile | null;
  curr: ColumnProfile | null;
  findings: Finding[];
}

export interface FileDiff {
  prevRows: number;
  currRows: number;
  columns: ColumnDiff[];      // 今回の列順。前回だけの列は最後に付ける
}

export interface CompareOptions {
  // 'name'：見出しの名前で対応（既定）。'position'：列の位置で対応（見出しなしのとき）。COL_MOVED は判定しない
  matchBy?: 'name' | 'position';
}

export const DIFF_TITLES: Record<DiffCode, string> = {
  COL_ADDED: '列が増えています',
  COL_REMOVED: '列がなくなっています',
  COL_MOVED: '列の位置が変わっています',
  NEW_LENGTH: '前回はなかった長さの値があります',
  NEW_CLASS: '前回はなかった種類の文字があります',
  MISSING_UP: '空欄が増えています',
};

function emptyShare(p: ColumnProfile): number {
  return p.total === 0 ? 0 : p.empty / p.total;
}

function formatPercent(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

function columnFindings(
  prev: ColumnProfile | null,
  curr: ColumnProfile | null,
  checkMoved: boolean,
): Finding[] {
  if (!prev && curr) {
    return [{ code: 'COL_ADDED', level: 'warn', message: '前回のファイルにはない列です。' }];
  }
  if (prev && !curr) {
    return [{
      code: 'COL_REMOVED',
      level: 'warn',
      message: '前回のファイルにあった列が、今回はありません。列の位置で取り込んでいる場合、ほかの列がずれて読まれる原因になります。',
    }];
  }
  if (!prev || !curr) return [];

  const findings: Finding[] = [];

  if (checkMoved && prev.index !== curr.index) {
    findings.push({
      code: 'COL_MOVED',
      level: 'info',
      message: `前回は ${prev.index + 1} 列目、今回は ${curr.index + 1} 列目です。列の位置で取り込んでいる場合、値がずれて読まれます。`,
    });
  }

  // 長さがそろっている列（コードなど）だけを見る。自由記述の列は対象外
  const prevGroups = prev.lengthDist.length;
  if (prevGroups >= 1 && prevGroups <= LEN_MAX_GROUPS) {
    const prevLengths = new Set(prev.lengthDist.map((d) => d.length));
    const prevLabel = prev.lengthDist.map((d) => d.length).join('、');
    for (const d of curr.lengthDist) {
      if (prevLengths.has(d.length)) continue;
      const top = curr.prefixByLength.find((g) => g.length === d.length)?.prefixes[0];
      const prefixPart = top
        ? `先頭の3文字は「${top.prefix}」が最も多く ${top.count} 件です。`
        : '';
      findings.push({
        code: 'NEW_LENGTH',
        level: 'warn',
        message: `前回は ${prevLabel} 文字の値だけでしたが、今回は ${d.length} 文字の値が ${d.count} 件あります。${prefixPart}採番の変更や、先頭に何かが付いていないか確認してください。`,
      });
    }
  }

  const prevClasses = new Set(prev.classDist.map((c) => c.cls));
  for (const c of curr.classDist) {
    if (c.cls === 'empty' || prevClasses.has(c.cls)) continue;
    findings.push({
      code: 'NEW_CLASS',
      level: 'warn',
      message: `今回、${CHAR_CLASS_LABELS[c.cls]} の値が ${c.count} 件あります。前回のファイルにはありませんでした。`,
    });
  }

  const prevShare = emptyShare(prev);
  const currShare = emptyShare(curr);
  // 0.15 - 0.10 のような浮動小数の誤差で取りこぼさないよう、わずかに余裕を持たせて比べる
  if (currShare - prevShare + 1e-9 >= MISSING_UP_POINTS) {
    findings.push({
      code: 'MISSING_UP',
      level: 'warn',
      message: `空欄の割合が ${formatPercent(prevShare)} → ${formatPercent(currShare)} に増えました（今回 ${curr.empty} 件）。`,
    });
  }

  return findings;
}

export function compare(
  prev: ColumnProfile[],
  curr: ColumnProfile[],
  options: CompareOptions = {},
): FileDiff {
  const matchBy = options.matchBy ?? 'name';
  const usedPrev = new Set<number>();
  const pairs: { prev: ColumnProfile | null; curr: ColumnProfile | null }[] = [];

  if (matchBy === 'position') {
    curr.forEach((c, i) => {
      const p = prev[i] ?? null;
      if (p) usedPrev.add(i);
      pairs.push({ prev: p, curr: c });
    });
  } else {
    // 同じ名前の列が複数あるときは、出てきた順に 1 対 1 で対応させる
    const queues = new Map<string, number[]>();
    prev.forEach((p, i) => {
      const q = queues.get(p.name);
      if (q) q.push(i);
      else queues.set(p.name, [i]);
    });
    for (const c of curr) {
      const i = queues.get(c.name)?.shift();
      if (i === undefined) {
        pairs.push({ prev: null, curr: c });
      } else {
        usedPrev.add(i);
        pairs.push({ prev: prev[i], curr: c });
      }
    }
  }

  prev.forEach((p, i) => {
    if (!usedPrev.has(i)) pairs.push({ prev: p, curr: null });
  });

  const checkMoved = matchBy === 'name';
  const columns: ColumnDiff[] = pairs.map(({ prev: p, curr: c }) => ({
    name: (c ?? p)!.name,
    prevIndex: p ? p.index : null,
    currIndex: c ? c.index : null,
    prev: p,
    curr: c,
    findings: columnFindings(p, c, checkMoved),
  }));

  return {
    prevRows: prev[0]?.total ?? 0,
    currRows: curr[0]?.total ?? 0,
    columns,
  };
}
