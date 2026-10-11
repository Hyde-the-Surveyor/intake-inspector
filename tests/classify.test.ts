import { describe, expect, it } from 'vitest';
import { classify } from '../src/lib/classify';

describe('classify', () => {
  it('空文字は empty', () => {
    expect(classify('')).toBe('empty');
  });

  it('仕様 6-3 の例がすべて期待どおりに分類される', () => {
    expect(classify('7104800')).toBe('digits');
    expect(classify('ZZ84572033')).toBe('alnum');
    expect(classify('00133-B')).toBe('ascii');
    expect(classify('TST-61Y4')).toBe('ascii');
    expect(classify('１２０')).toBe('fullwidth_digit');
    expect(classify('ブッシュ')).toBe('non_ascii');
    expect(classify('ガイドφ12')).toBe('non_ascii');
  });

  it('空白だけの値は ascii（半角スペース）', () => {
    expect(classify(' ')).toBe('ascii');
  });
});
