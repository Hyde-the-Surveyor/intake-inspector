import type { CharClass } from './types';

// 上から順に判定し、最初に当てはまったものを採用する（仕様 6-3）
export function classify(value: string): CharClass {
  if (value === '') return 'empty';
  if (/^[0-9]+$/.test(value)) return 'digits';
  if (/^[0-9A-Za-z]+$/.test(value)) return 'alnum';
  if (/^[\x20-\x7E]+$/.test(value)) return 'ascii';
  if (/[０-９]/.test(value)) return 'fullwidth_digit';
  return 'non_ascii';
}

export const CHAR_CLASS_LABELS: Record<CharClass, string> = {
  empty: '空欄',
  digits: '半角数字',
  alnum: '半角英数',
  ascii: '半角（記号・空白を含む）',
  fullwidth_digit: '全角数字を含む',
  non_ascii: '全角・その他',
};
