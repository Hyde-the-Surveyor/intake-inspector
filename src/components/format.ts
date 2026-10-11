import type { Level } from '../lib/types';

export function formatCount(n: number): string {
  return n.toLocaleString('ja-JP');
}

export function formatShare(count: number, total: number): string {
  if (total === 0) return '0.0%';
  return `${((count / total) * 100).toFixed(1)}%`;
}

export const ENCODING_LABELS: Record<'utf-8' | 'shift_jis', string> = {
  'utf-8': 'UTF-8',
  shift_jis: 'Shift_JIS',
};

export const LEVEL_LABELS: Record<Level, string> = { warn: '注意', info: '情報' };
export const LEVEL_ICONS: Record<Level, string> = { warn: '⚠', info: 'ℹ' };
