import { describe, expect, it } from 'vitest';
import { decode } from '../src/lib/decode';

function toArrayBuffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

describe('decode', () => {
  it('UTF-8 のバイト列を utf-8 と判定する', () => {
    const bytes = [...new TextEncoder().encode('製造指示ID,数量')];
    const result = decode(toArrayBuffer(bytes), 'auto');
    expect(result.detected).toBe('utf-8');
    expect(result.text).toBe('製造指示ID,数量');
  });

  it('Shift_JIS のバイト列は shift_jis にフォールバックする', () => {
    // 「日本」の Shift_JIS 表現
    const result = decode(toArrayBuffer([0x93, 0xfa, 0x96, 0x7b]), 'auto');
    expect(result.detected).toBe('shift_jis');
    expect(result.text).toBe('日本');
  });

  it('先頭の BOM を取り除く', () => {
    const bytes = [0xef, 0xbb, 0xbf, ...new TextEncoder().encode('abc')];
    const result = decode(toArrayBuffer(bytes), 'auto');
    expect(result.detected).toBe('utf-8');
    expect(result.text).toBe('abc');
  });

  it('手動指定（shift_jis）はそのまま読む', () => {
    const result = decode(toArrayBuffer([0x93, 0xfa]), 'shift_jis');
    expect(result.detected).toBe('shift_jis');
    expect(result.text).toBe('日');
  });

  it('手動指定（utf-8）はそのまま読む', () => {
    const bytes = [...new TextEncoder().encode('abc')];
    const result = decode(toArrayBuffer(bytes), 'utf-8');
    expect(result.detected).toBe('utf-8');
    expect(result.text).toBe('abc');
  });
});
