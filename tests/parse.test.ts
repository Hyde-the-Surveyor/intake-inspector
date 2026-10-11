import { describe, expect, it } from 'vitest';
import { parse } from '../src/lib/parse';

describe('parse', () => {
  it('先頭が 0 の値が文字列のまま残る', () => {
    const { rows } = parse('id\r\n00071048\r\n');
    expect(rows[1][0]).toBe('00071048');
  });

  it('引用符内のカンマ・改行が正しく扱われる', () => {
    const { rows } = parse('a,b\r\n"x,y","p\r\nq"\r\n');
    expect(rows[1]).toEqual(['x,y', 'p\r\nq']);
  });

  it('列数が足りない行は "" で埋まる', () => {
    const { rows, mismatchedRowCount } = parse('a,b,c\r\n1,2\r\n4,5,6\r\n');
    expect(rows[1]).toEqual(['1', '2', '']);
    expect(rows[2]).toEqual(['4', '5', '6']);
    expect(mismatchedRowCount).toBe(1);
  });

  it('値を数値に変換しない', () => {
    const { rows } = parse('n\r\n123\r\ntrue\r\n');
    expect(rows[1][0]).toBe('123');
    expect(rows[2][0]).toBe('true');
  });

  it('空行を読み飛ばす', () => {
    const { rows } = parse('a,b\r\n1,2\r\n\r\n3,4\r\n');
    expect(rows).toHaveLength(3);
  });
});
