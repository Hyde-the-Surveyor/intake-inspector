import { useId, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import type { EncodingChoice } from '../lib/types';
import './FileInput.css';

interface Props {
  encoding: EncodingChoice;
  onEncodingChange: (choice: EncodingChoice) => void;
  hasHeader: boolean;
  onHasHeaderChange: (value: boolean) => void;
  onFile: (file: File) => void;
  onLoadSample: () => void;
  busy: boolean;
  error: string | null;
}

const ENCODINGS: { value: EncodingChoice; label: string }[] = [
  { value: 'auto', label: '自動' },
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'shift_jis', label: 'Shift_JIS' },
];

export function FileInput({
  encoding,
  onEncodingChange,
  hasHeader,
  onHasHeaderChange,
  onFile,
  onLoadSample,
  busy,
  error,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const headerId = useId();
  const groupId = useId();

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    // 同じファイルを選び直しても change が発火するように値をクリアする
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
    <section className="file-input" aria-label="読み込み">
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
          <button type="button" onClick={onLoadSample} disabled={busy}>
            サンプルを読み込む
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

      <div className="file-options">
        <fieldset className="encoding" aria-labelledby={groupId}>
          <legend id={groupId}>文字コード</legend>
          {ENCODINGS.map((enc) => (
            <label key={enc.value}>
              <input
                type="radio"
                name="encoding"
                value={enc.value}
                checked={encoding === enc.value}
                onChange={() => onEncodingChange(enc.value)}
              />
              {enc.label}
            </label>
          ))}
        </fieldset>
        <label className="header-toggle" htmlFor={headerId}>
          <input
            id={headerId}
            type="checkbox"
            checked={hasHeader}
            onChange={(e) => onHasHeaderChange(e.target.checked)}
          />
          1行目は見出し
        </label>
      </div>

      {busy && (
        <p className="file-status" role="status">
          読み込み中…
        </p>
      )}
      {error && (
        <p className="file-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
