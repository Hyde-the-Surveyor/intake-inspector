import { useCallback, useMemo, useState } from 'react';
import { decode } from './lib/decode';
import { parse } from './lib/parse';
import { profileColumns } from './lib/profile';
import type { ColumnProfile, EncodingChoice } from './lib/types';
import { FileInput } from './components/FileInput';
import { Summary } from './components/Summary';
import { Overview } from './components/Overview';
import { ColumnDetail } from './components/ColumnDetail';
import './App.css';

const REPO_URL = 'https://github.com/Hyde-the-Surveyor/intake-inspector';
const SAMPLE_PATH = `${import.meta.env.BASE_URL}sample/sample_seizo_shiji.csv`;

// 読み込んだファイル。ArrayBuffer をそのまま保持し、文字コードや見出しの切替時はここから再判定する
interface Source {
  name: string;
  buffer: ArrayBuffer;
}

interface Analysis {
  detected: 'utf-8' | 'shift_jis';
  rowCount: number;
  columnCount: number;
  mismatchedRowCount: number;
  profiles: ColumnProfile[];
  sorted: ColumnProfile[];     // 注意（warn）のある列を上に並べた表示順
  warnCount: number;
  infoCount: number;
}

function analyze(source: Source, encoding: EncodingChoice, hasHeader: boolean): Analysis {
  const { text, detected } = decode(source.buffer, encoding);
  const { rows, mismatchedRowCount } = parse(text);
  const profiles = profileColumns(rows, hasHeader);

  const hasWarn = (p: ColumnProfile) => p.warnings.some((w) => w.level === 'warn');
  const sorted = [...profiles].sort((a, b) => Number(hasWarn(b)) - Number(hasWarn(a)));

  let warnCount = 0;
  let infoCount = 0;
  for (const p of profiles) {
    for (const w of p.warnings) {
      if (w.level === 'warn') warnCount++;
      else infoCount++;
    }
  }

  return {
    detected,
    rowCount: profiles[0]?.total ?? 0,
    columnCount: profiles.length,
    mismatchedRowCount,
    profiles,
    sorted,
    warnCount,
    infoCount,
  };
}

function App() {
  const [source, setSource] = useState<Source | null>(null);
  const [encoding, setEncoding] = useState<EncodingChoice>('auto');
  const [hasHeader, setHasHeader] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ユーザーが一覧で選んだ列。null のときは最初の注意列を自動で選ぶ
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);

  const analysis = useMemo(
    () => (source ? analyze(source, encoding, hasHeader) : null),
    [source, encoding, hasHeader],
  );

  const selectedIndex = useMemo(() => {
    if (!analysis || analysis.profiles.length === 0) return null;
    if (pickedIndex !== null && pickedIndex < analysis.profiles.length) return pickedIndex;
    return analysis.sorted[0].index;
  }, [analysis, pickedIndex]);

  const selected = analysis && selectedIndex !== null ? analysis.profiles[selectedIndex] : null;

  const loadBuffer = useCallback((name: string, buffer: ArrayBuffer) => {
    setSource({ name, buffer });
    setPickedIndex(null);
    setError(null);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const buffer = await file.arrayBuffer();
        loadBuffer(file.name, buffer);
      } catch (e) {
        setError(`ファイルを読み込めませんでした。${e instanceof Error ? e.message : ''}`);
      } finally {
        setBusy(false);
      }
    },
    [loadBuffer],
  );

  const handleLoadSample = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(SAMPLE_PATH);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      loadBuffer('sample_seizo_shiji.csv', buffer);
    } catch (e) {
      setError(`サンプルを読み込めませんでした。${e instanceof Error ? e.message : ''}`);
    } finally {
      setBusy(false);
    }
  }, [loadBuffer]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>intake-inspector</h1>
        <p className="tagline">CSVを読むだけで、いつもと違う形の値を見つけます</p>
        <p className="privacy">読み込んだファイルはブラウザの外に送信されません</p>
      </header>

      <main>
        <FileInput
          encoding={encoding}
          onEncodingChange={setEncoding}
          hasHeader={hasHeader}
          onHasHeaderChange={setHasHeader}
          onFile={(file) => void handleFile(file)}
          onLoadSample={() => void handleLoadSample()}
          busy={busy}
          error={error}
        />

        {analysis && source && analysis.profiles.length === 0 && (
          <p className="empty-result">このファイルには行がありません。</p>
        )}

        {analysis && source && analysis.profiles.length > 0 && (
          <>
            <Summary
              fileName={source.name}
              rowCount={analysis.rowCount}
              columnCount={analysis.columnCount}
              detected={analysis.detected}
              warnCount={analysis.warnCount}
              infoCount={analysis.infoCount}
              mismatchedRowCount={analysis.mismatchedRowCount}
            />
            <Overview
              profiles={analysis.sorted}
              selectedIndex={selectedIndex}
              onSelect={setPickedIndex}
            />
            {selected && <ColumnDetail profile={selected} />}
          </>
        )}
      </main>

      <footer className="app-footer">
        <span>by Hyde the Surveyor</span>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}

export default App;
