import type { KeyboardEvent } from 'react';
import { WARNING_TITLES } from '../lib/rules';
import type { ColumnProfile } from '../lib/types';
import { formatCount } from './format';
import { LevelBadge } from './LevelBadge';
import { Value } from './Value';
import './Overview.css';

interface Props {
  profiles: ColumnProfile[];     // 表示順（注意のある列が上）に並べ替え済み
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export function Overview({ profiles, selectedIndex, onSelect }: Props) {
  function handleKey(e: KeyboardEvent<HTMLTableRowElement>, index: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(index);
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
              <th scope="col" className="num">件数</th>
              <th scope="col" className="num">欠損</th>
              <th scope="col" className="num">長さの種類</th>
              <th scope="col" className="num">文字種の種類</th>
              <th scope="col">警告</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const selected = p.index === selectedIndex;
              const hasWarn = p.warnings.some((w) => w.level === 'warn');
              const cls = [selected ? 'selected' : '', hasWarn ? 'has-warn' : '']
                .filter(Boolean)
                .join(' ');
              return (
                <tr
                  key={p.index}
                  className={cls || undefined}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(p.index)}
                  onKeyDown={(e) => handleKey(e, p.index)}
                >
                  <td className="col-name">
                    <Value value={p.name} />
                  </td>
                  <td className="num">{formatCount(p.total)}</td>
                  <td className="num">{formatCount(p.empty)}</td>
                  <td className="num">{formatCount(p.lengthDist.length)}</td>
                  <td className="num">{formatCount(p.classDist.length)}</td>
                  <td className="col-warnings">
                    {p.warnings.length === 0 ? (
                      <span className="none">なし</span>
                    ) : (
                      p.warnings.map((w) => (
                        <LevelBadge key={w.code} level={w.level} title={WARNING_TITLES[w.code]} />
                      ))
                    )}
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
