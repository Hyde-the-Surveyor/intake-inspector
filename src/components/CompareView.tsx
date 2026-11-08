import { useCallback, useId, useMemo, useState } from 'react';
import { compare } from '../lib/compare';
import { decode } from '../lib/decode';
import { parse } from '../lib/parse';
import { profileColumns } from '../lib/profile';
import type { ColumnProfile, EncodingChoice } from '../lib/types';
import { CompareDetail } from './CompareDetail';
import { CompareFileSlot } from './CompareFileSlot';
import { CompareOverview } from './CompareOverview';
import { CompareSummary } from './CompareSummary';
import './FileInput.css';
import './Compare.css';

const SAMPLE_PREV = 'sample_seizo_shiji_prev.csv';
const SAMPLE_CURR = 'sample_seizo_shiji.csv';
const sampleUrl = (file: string) => `${import.meta.env.BASE_URL}sample/${file}`;

// 読み込んだファイルはメモリ上にだけ持つ（保存しない）
interface Source {
  name: string;
  buffer: ArrayBuffer;
}

interface Side {
  detected: 'utf-8' | 'shift_jis';
  profiles: ColumnProfile[];
}

function analyzeSide(source: Source, encoding: EncodingChoice, hasHeader: boolean): Side {
  const { text, detected } = decode(source.buffer, encoding);
  const { rows } = parse(text);
  return { detected, profiles: profileColumns(rows, hasHeader) };
}

async function fetchSample(file: string): Promise<Source> {
  const res = await fetch(sampleUrl(file));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { name: file, buffer: await res.arrayBuffer() };
}

export function CompareView() {
  const [prevSource, setPrevSource] = useState<Source | null>(null);
  const [currSource, setCurrSource] = useState<Source | null>(null);
  const [prevEncoding, setPrevEncoding] = useState<EncodingChoice>('auto');
  const [currEncoding, setCurrEncoding] = useState<EncodingChoice>('auto');
  const [hasHeader, setHasHeader] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ユーザーが一覧で選んだ列（diff.columns 内の位置）。null のときは最初の注意列を自動で選ぶ
  const [pickedKey, setPickedKey] = useState<number | null>(null);
  const headerId = useId();

  const prevSide = useMemo(
    () => (prevSource ? analyzeSide(prevSource, prevEncoding, hasHeader) : null),
    [prevSource, prevEncoding, hasHeader],
  );
  const currSide = useMemo(
    () => (currSource ? analyzeSide(currSource, currEncoding, hasHeader) : null),
    [currSource, currEncoding, hasHeader],
  );

  const result = useMemo(() => {
    if (!prevSide || !currSide) return null;
    const diff = compare(prevSide.profiles, currSide.profiles, {
      matchBy: hasHeader ? 'name' : 'position',
    });
    const hasWarn = (i: number) => diff.columns[i].findings.some((f) => f.level === 'warn');
    const rows = diff.columns
      .map((column, key) => ({ key, column }))
      .sort((a, b) => Number(hasWarn(b.key)) - Number(hasWarn(a.key)));
    let warnCount = 0;
    let infoCount = 0;
    for (const c of diff.columns) {
      for (const f of c.findings) {
        if (f.level === 'warn') warnCount++;
        else infoCount++;
      }
    }
    return { diff, rows, warnCount, infoCount };
  }, [prevSide, currSide, hasHeader]);

  const selectedKey = useMemo(() => {
    if (!result || result.rows.length === 0) return null;
    if (pickedKey !== null && pickedKey < result.diff.columns.length) return pickedKey;
    return result.rows[0].key;
  }, [result, pickedKey]);

  const readFile = useCallback(async (file: File, set: (s: Source) => void) => {
    setBusy(true);
    setError(null);
    try {
      set({ name: file.name, buffer: await file.arrayBuffer() });
      setPickedKey(null);
    } catch (e) {
      setError(`ファイルを読み込めませんでした。${e instanceof Error ? e.message : ''}`);
    } finally {
      setBusy(false);
    }
  }, []);

  const handleLoadSamples = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([fetchSample(SAMPLE_PREV), fetchSample(SAMPLE_CURR)]);
      setPrevSource(p);
      setCurrSource(c);
      setPickedKey(null);
    } catch (e) {
      setError(`サンプルを読み込めませんでした。${e instanceof Error ? e.message : ''}`);
    } finally {
      setBusy(false);
    }
  }, []);

  const bothEmpty =
    prevSide && currSide && (prevSide.profiles.length === 0 || currSide.profiles.length === 0);

  return (
    <>
      <section className="file-input" aria-label="読み込み">
        <div className="compare-slots">
          <CompareFileSlot
            title="前回のファイル"
            fileName={prevSource?.name ?? null}
            detected={prevSide?.detected ?? null}
            encoding={prevEncoding}
            onEncodingChange={setPrevEncoding}
            onFile={(f) => void readFile(f, setPrevSource)}
            busy={busy}
          />
          <CompareFileSlot
            title="今回のファイル"
            fileName={currSource?.name ?? null}
            detected={currSide?.detected ?? null}
            encoding={currEncoding}
            onEncodingChange={setCurrEncoding}
            onFile={(f) => void readFile(f, setCurrSource)}
            busy={busy}
          />
        </div>

        <div className="file-options">
          <label className="header-toggle" htmlFor={headerId}>
            <input
              id={headerId}
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => setHasHeader(e.target.checked)}
            />
            1行目は見出し（2つのファイル共通）
          </label>
          <button type="button" onClick={() => void handleLoadSamples()} disabled={busy}>
            サンプル（前回・今回）を読み込む
          </button>
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

      {(prevSource === null) !== (currSource === null) && (
        <p className="empty-result">
          {prevSource ? '今回' : '前回'}のファイルを読み込むと比較します。
        </p>
      )}

      {bothEmpty && <p className="empty-result">行のないファイルがあるため、比較できません。</p>}

      {result && !bothEmpty && prevSource && currSource && (
        <>
          <CompareSummary
            prevName={prevSource.name}
            currName={currSource.name}
            prevRows={result.diff.prevRows}
            currRows={result.diff.currRows}
            prevColumns={prevSide!.profiles.length}
            currColumns={currSide!.profiles.length}
            warnCount={result.warnCount}
            infoCount={result.infoCount}
          />
          <CompareOverview rows={result.rows} selectedKey={selectedKey} onSelect={setPickedKey} />
          {selectedKey !== null && <CompareDetail column={result.diff.columns[selectedKey]} />}
        </>
      )}
    </>
  );
}
