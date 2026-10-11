import { CHAR_CLASS_LABELS } from './classify';
import type { ColumnProfile, Warning, WarningCode } from './types';

export const LEN_MINORITY_SHARE = 0.05;  // 構成比 5% 未満の長さを「少数派」とみなす
export const LEN_DOMINANT_SHARE = 0.50;  // 最多の長さが 50% 以上を占める列だけを対象にする
export const LEN_MAX_GROUPS    = 5;      // 長さが 5 種類以下の列だけを対象にする

// 警告の見出し（仕様 6-6）。message は説明文のみを持つ
export const WARNING_TITLES: Record<WarningCode, string> = {
  MISSING: '欠損があります',
  WHITESPACE: '前後に空白があります',
  LEN_MIXED: '長さがそろっていません',
  LEN_MINORITY: '少数派の長さがあります',
  CLASS_MIXED: '文字の種類がそろっていません',
  FULLWIDTH_DIGIT: '全角数字が含まれています',
  LEADING_ZERO: '先頭が 0 の値があります',
};

function percent(n: number, total: number): string {
  if (total === 0) return '0';
  return String(Math.round((n / total) * 1000) / 10);
}

type WarningInput = Pick<
  ColumnProfile,
  'total' | 'empty' | 'whitespaceOnly' | 'trimIssues' | 'leadingZero' | 'lengthDist' | 'classDist'
>;

export function buildWarnings(col: WarningInput): Warning[] {
  const warnings: Warning[] = [];

  if (col.empty > 0) {
    warnings.push({
      code: 'MISSING',
      level: 'info',
      message: `空欄の値が ${col.empty} 件（${percent(col.empty, col.total)}%）あります。`,
    });
  }

  // 空白だけの値（whitespaceOnly）は trimIssues の条件も満たすため、件数は trimIssues に含まれる
  if (col.trimIssues > 0 || col.whitespaceOnly > 0) {
    warnings.push({
      code: 'WHITESPACE',
      level: 'warn',
      message: `見た目は同じでも、突合では別の値として扱われます。（${col.trimIssues} 件）`,
    });
  }

  if (col.lengthDist.length >= 2) {
    warnings.push({
      code: 'LEN_MIXED',
      level: 'info',
      message: `${col.lengthDist.length} 種類の長さが混在しています。`,
    });
  }

  const minority = findLengthMinority(col.lengthDist);
  if (minority) {
    const parts = minority.minorities
      .map((m) => `${m.length} 文字の値が ${m.count} 件`)
      .join('、');
    warnings.push({
      code: 'LEN_MINORITY',
      level: 'warn',
      message: `ほとんどの値は ${minority.dominantLength} 文字ですが、${parts}だけあります。形式の変更や混入の可能性があります。`,
    });
  }

  if (col.classDist.length >= 2) {
    const labels = col.classDist.map((c) => CHAR_CLASS_LABELS[c.cls]).join('、');
    warnings.push({
      code: 'CLASS_MIXED',
      level: 'info',
      message: `${labels} が混在しています。`,
    });
  }

  const fullwidth = col.classDist.find((c) => c.cls === 'fullwidth_digit');
  if (fullwidth && fullwidth.count > 0) {
    warnings.push({
      code: 'FULLWIDTH_DIGIT',
      level: 'warn',
      message: `数値として扱われず、比較や集計で一致しない原因になります。（${fullwidth.count} 件）`,
    });
  }

  if (col.leadingZero > 0) {
    warnings.push({
      code: 'LEADING_ZERO',
      level: 'info',
      message: `Excel で開くと 0 が消えることがあります。（${col.leadingZero} 件）`,
    });
  }

  return warnings;
}

// LEN_MINORITY の 3 条件（仕様 6-5）。構成比の分母は空欄を除いた件数
function findLengthMinority(lengthDist: { length: number; count: number }[]):
  | { dominantLength: number; minorities: { length: number; count: number }[] }
  | null {
  const groups = lengthDist.length;
  if (groups < 2 || groups > LEN_MAX_GROUPS) return null;

  const nonEmptyTotal = lengthDist.reduce((sum, d) => sum + d.count, 0);
  if (nonEmptyTotal === 0) return null;

  const dominant = lengthDist.reduce((a, b) => (b.count > a.count ? b : a));
  if (dominant.count / nonEmptyTotal < LEN_DOMINANT_SHARE) return null;

  const minorities = lengthDist.filter((d) => d.count / nonEmptyTotal < LEN_MINORITY_SHARE);
  if (minorities.length === 0) return null;

  return { dominantLength: dominant.length, minorities };
}
