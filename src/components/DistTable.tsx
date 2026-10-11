import type { ReactNode } from 'react';
import { formatCount, formatShare } from './format';
import './DistTable.css';

// 分布表の共通部品：値／件数／構成比／横棒。
// 横棒は <div> の幅（%）で描く。少数派の行は highlight で強調する。

export interface DistRow {
  key: string;
  label: ReactNode;
  count: number;
  highlight?: boolean;
}

interface Props {
  caption: string;
  valueHeader: string;
  rows: DistRow[];
  total: number;              // 構成比の分母（空欄を除いた件数）
  highlightNote?: string;     // 強調した行の意味（例：少数派）
}

export function DistTable({ caption, valueHeader, rows, total, highlightNote }: Props) {
  const hasHighlight = rows.some((r) => r.highlight);
  return (
    <div className="dist">
      <div className="table-scroll">
        <table className="dist-table">
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">{valueHeader}</th>
              <th scope="col" className="num">件数</th>
              <th scope="col" className="num">構成比</th>
              <th scope="col" className="bar-col">
                <span className="visually-hidden">横棒</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const share = total === 0 ? 0 : (r.count / total) * 100;
              return (
                <tr key={r.key} className={r.highlight ? 'minority' : undefined}>
                  <td>
                    {r.label}
                    {r.highlight && <span className="minority-tag">少数派</span>}
                  </td>
                  <td className="num">{formatCount(r.count)}</td>
                  <td className="num">{formatShare(r.count, total)}</td>
                  <td className="bar-col">
                    <div className="bar-track" aria-hidden="true">
                      <div className="bar" style={{ width: `${share}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasHighlight && highlightNote && <p className="dist-note">{highlightNote}</p>}
    </div>
  );
}
