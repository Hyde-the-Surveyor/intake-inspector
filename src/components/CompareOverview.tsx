import type { KeyboardEvent } from 'react';
import { DIFF_TITLES } from '../lib/compare';
import type { ColumnDiff } from '../lib/compare';
import { formatCount } from './format';
import { LevelBadge } from './LevelBadge';
import { Value } from './Value';
import './Overview.css';

interface Props {
  // [diff.columns 内の位置, 列] の組。表示順（注意のある列が上）に並べ替え済み
  rows: { key: number; column: ColumnDiff }[];
  selectedKey: number | null;
  onSelect: (key: number) => void;
}

function lengthKinds(col: ColumnDiff['prev']): string {
  return col ? formatCount(col.lengthDist.length) : '—';
}

export function CompareOverview({ rows, selectedKey, onSelect }: Props) {
  function handleKey(e: KeyboardEvent<HTMLTableRowElement>, key: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(key);
    }
  }

  return (
    <section className="overview" aria-label="列の一覧">
      <h2>列の一覧</h2>
      <p className="overview-hint">行をクリックすると、その列の詳細を表示します。注意のある列を上に並べています。</p>
      <div className="table-scroll">
        <table className="overview-table">
          <thead>
            <tr>
              <th scope="col">列名</th>
              <th scope="col">変化</th>
              <th scope="col" className="num">長さの種類（前回 → 今回）</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, column: c }) => {
              const selected = key === selectedKey;
              const hasWarn = c.findings.some((f) => f.level === 'warn');
              const cls = [selected ? 'selected' : '', hasWarn ? 'has-warn' : '']
                .filter(Boolean)
                .join(' ');
              return (
                <tr
                  key={key}
                  className={cls || undefined}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(key)}
                  onKeyDown={(e) => handleKey(e, key)}
                >
                  <td className="col-name">
                    <Value value={c.name} />
                  </td>
                  <td className="col-warnings">
                    {c.findings.length === 0 ? (
                      <span className="none compare-nochange">変化なし</span>
                    ) : (
                      c.findings.map((f, i) => (
                        <LevelBadge key={i} level={f.level} title={DIFF_TITLES[f.code]} />
                      ))
                    )}
                  </td>
                  <td className="num">
                    {lengthKinds(c.prev)} → {lengthKinds(c.curr)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
