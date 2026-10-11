export type EncodingChoice = 'auto' | 'utf-8' | 'shift_jis';

export type CharClass = 'empty' | 'digits' | 'alnum' | 'ascii' | 'fullwidth_digit' | 'non_ascii';
export type Level = 'info' | 'warn';

export type WarningCode =
  | 'MISSING' | 'WHITESPACE' | 'LEN_MIXED' | 'LEN_MINORITY'
  | 'CLASS_MIXED' | 'FULLWIDTH_DIGIT' | 'LEADING_ZERO';

export interface Warning {
  code: WarningCode;
  level: Level;
  message: string;        // 画面にそのまま出す日本語（仕様 6-6 参照）
}

export interface ColumnProfile {
  index: number;
  name: string;
  total: number;          // データ行数（見出しを除く）
  empty: number;          // value === ""
  whitespaceOnly: number; // value !== "" かつ value.trim() === ""
  trimIssues: number;     // value !== "" かつ value !== value.trim()
  leadingZero: number;    // /^0[0-9]/ に一致
  distinct: number;       // 空欄を除いた値の種類数
  lengthDist: { length: number; count: number }[];               // 空欄を除く。長さ昇順
  classDist: { cls: CharClass; count: number }[];                // 空欄を除く。件数降順
  prefixByLength: {                                              // 長さグループごとの先頭3文字
    length: number;
    prefixes: { prefix: string; count: number }[];               // 上位5件。件数降順
    others: number;                                              // 上位5件以外の件数
  }[];
  samples: string[];      // 空欄以外の値から先頭5件
  warnings: Warning[];
}
