import type { EncodingChoice } from './types';

export interface DecodeResult {
  text: string;
  detected: 'utf-8' | 'shift_jis';
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function decode(buf: ArrayBuffer, choice: EncodingChoice): DecodeResult {
  if (choice === 'utf-8') {
    return { text: stripBom(new TextDecoder('utf-8').decode(buf)), detected: 'utf-8' };
  }
  if (choice === 'shift_jis') {
    return { text: stripBom(new TextDecoder('shift_jis').decode(buf)), detected: 'shift_jis' };
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return { text: stripBom(text), detected: 'utf-8' };
  } catch {
    return { text: stripBom(new TextDecoder('shift_jis').decode(buf)), detected: 'shift_jis' };
  }
}
