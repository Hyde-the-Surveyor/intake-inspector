import { useId, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import type { EncodingChoice } from '../lib/types';
import { ENCODING_LABELS } from './format';
import { Value } from './Value';
import './FileInput.css';

// 「前回と比べる」の片側の読み込み枠。ドロップ＋ファイル選択と、このファイルだけの文字コード

interface Props {
  title: string;
  fileName: string | null;
  detected: 'utf-8' | 'shift_jis' | null;
  encoding: EncodingChoice;
  onEncodingChange: (choice: EncodingChoice) => void;
  onFile: (file: File) => void;
  busy: boolean;
}

const ENCODINGS: { value: EncodingChoice; label: string }[] = [
  { value: 'auto', label: '自動' },
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'shift_jis', label: 'Shift_JIS' },
];

export function CompareFileSlot({
  title,
  fileName,
  detected,
  encoding,
  onEncodingChange,
  onFile,
  busy,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const radioName = useId();
  const legendId = useId();
  const titleId = useId();

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!dragging) setDragging(true);
  }

  return (
    <section className="compare-slot" aria-labelledby={titleId}>
      <h2 id={titleId} className="compare-slot-title">{title}</h2>
      <div
        className={dragging ? 'dropzone dragging' : 'dropzone'}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <p className="dropzone-text">CSVファイルをここにドロップ</p>
        <p className="dropzone-or">または</p>
        <div className="dropzone-actions">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
            ファイルを選択
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={handleChange}
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      <p className="compare-slot-file">
        {fileName ? (
          <>
            <Value value={fileName} />
            {detected && <span className="compare-slot-detected">（{ENCODING_LABELS[detected]}）</span>}
          </>
        ) : (
          <span className="none">未読み込み</span>
        )}
      </p>

      <fieldset className="encoding" aria-labelledby={legendId}>
        <legend id={legendId}>文字コード</legend>
        {ENCODINGS.map((enc) => (
          <label key={enc.value}>
            <input
              type="radio"
              name={radioName}
              value={enc.value}
              checked={encoding === enc.value}
              onChange={() => onEncodingChange(enc.value)}
            />
            {enc.label}
          </label>
        ))}
      </fieldset>
    </section>
  );
}
