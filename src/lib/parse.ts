import Papa from 'papaparse';

export interface ParseResult {
  rows: string[][];            // 全行。列数は全行の最大値にそろえ、足りないセルは "" で埋める
  mismatchedRowCount: number;  // 列数が 1 行目（見出し）と一致しない行の数
}

export function parse(text: string): ParseResult {
  const result = Papa.parse<string[]>(text, {
    header: false,
    dynamicTyping: false,
    skipEmptyLines: 'greedy',
  });
  const raw = result.data;
  if (raw.length === 0) {
    return { rows: [], mismatchedRowCount: 0 };
  }

  const maxCols = raw.reduce((max, row) => Math.max(max, row.length), 0);
  const headerCols = raw[0].length;
  let mismatchedRowCount = 0;
  const rows = raw.map((row, i) => {
    if (i > 0 && row.length !== headerCols) mismatchedRowCount++;
    if (row.length === maxCols) return row;
    const padded = row.slice();
    while (padded.length < maxCols) padded.push('');
    return padded;
  });
  return { rows, mismatchedRowCount };
}
