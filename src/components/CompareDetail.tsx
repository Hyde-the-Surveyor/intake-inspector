import { CHAR_CLASS_LABELS } from '../lib/classify';
import { DIFF_TITLES } from '../lib/compare';
import type { ColumnDiff } from '../lib/compare';
import type { ColumnProfile } from '../lib/types';
import { DistTable } from './DistTable';
import type { DistRow } from './DistTable';
import { formatCount } from './format';
import { LevelBadge } from './LevelBadge';
import { Value } from './Value';
import './ColumnDetail.css';

interface Props {
  column: ColumnDiff;
}

const NEW_TAG = '今回だけ';

function nonEmpty(p: ColumnProfile): number {
  return p.total - p.empty;
}

function DistPair({
  caption,
  valueHeader,
  prev,
  curr,
  prevRows,
  currRows,
  note,
}: {
  caption: string;
  valueHeader: string;
  prev: ColumnProfile | null;
  curr: ColumnProfile | null;
  prevRows: DistRow[];
  currRows: DistRow[];
  note: string;
}) {
  return (
    <div className="compare-pair">
      {prev && (
        <DistTable
          caption={`前回：${caption}`}
          valueHeader={valueHeader}
          rows={prevRows}
          total={nonEmpty(prev)}
        />
      )}
      {curr && (
        <DistTable
          caption={`今回：${caption}`}
          valueHeader={valueHeader}
          rows={currRows}
          total={nonEmpty(curr)}
          highlightTag={NEW_TAG}
          highlightNote={note}
        />
      )}
    </div>
  );
}

export function CompareDetail({ column }: Props) {
  const { prev, curr, findings } = column;

  // 強調は判定（findings）と一致させる。NEW_LENGTH が出ていない列（自由記述など）では長さを強調しない
  const hasNewLength = findings.some((f) => f.code === 'NEW_LENGTH');
  const hasNewClass = findings.some((f) => f.code === 'NEW_CLASS');
  const prevLengths = new Set(prev?.lengthDist.map((d) => d.length) ?? []);
  const prevClasses = new Set(prev?.classDist.map((d) => d.cls) ?? []);
  const newLengths = new Set(
    hasNewLength && curr ? curr.lengthDist.filter((d) => !prevLengths.has(d.length)).map((d) => d.length) : [],
  );

  const lengthRows = (p: ColumnProfile | null, mark: boolean): DistRow[] =>
    (p?.lengthDist ?? []).map((d) => ({
      key: String(d.length),
      label: <span>{formatCount(d.length)} 文字</span>,
      count: d.count,
      highlight: mark && newLengths.has(d.length),
    }));

  const classRows = (p: ColumnProfile | null, mark: boolean): DistRow[] =>
    (p?.classDist ?? []).map((d) => ({
      key: d.cls,
      label: <span>{CHAR_CLASS_LABELS[d.cls]}</span>,
      count: d.count,
      highlight: mark && hasNewClass && !prevClasses.has(d.cls),
    }));

  const hasValues = (prev?.lengthDist.length ?? 0) + (curr?.lengthDist.length ?? 0) > 0;
  const newPrefixGroups = curr?.prefixByLength.filter((g) => newLengths.has(g.length)) ?? [];

  return (
    <section className="detail" aria-label="列の詳細">
      <h2>
        列の詳細：<Value value={column.name} className="detail-name" />
      </h2>
      <p className="detail-meta">
        前回 {column.prevIndex === null ? '—' : `${column.prevIndex + 1} 列目`}（
        {prev ? `件数 ${formatCount(prev.total)} ／ 空欄 ${formatCount(prev.empty)}` : 'なし'}）
        ／ 今回 {column.currIndex === null ? '—' : `${column.currIndex + 1} 列目`}（
        {curr ? `件数 ${formatCount(curr.total)} ／ 空欄 ${formatCount(curr.empty)}` : 'なし'}）
      </p>

      <h3>変化</h3>
      {findings.length === 0 ? (
        <p className="detail-none">前回から形の変化はありません。</p>
      ) : (
        <ul className="warning-list">
          {findings.map((f, i) => (
            <li key={i} className={`warning warning-${f.level}`}>
              <div className="warning-head">
                <LevelBadge level={f.level} />
                <strong>{DIFF_TITLES[f.code]}</strong>
              </div>
              <p className="warning-message">{f.message}</p>
            </li>
          ))}
        </ul>
      )}

      {hasValues ? (
        <>
          <h3>長さの分布</h3>
          <DistPair
            caption="長さの分布"
            valueHeader="長さ"
            prev={prev}
            curr={curr}
            prevRows={lengthRows(prev, false)}
            currRows={lengthRows(curr, true)}
            note="前回のファイルになかった長さを強調しています。"
          />
          <h3>文字種の分布</h3>
          <DistPair
            caption="文字種の分布"
            valueHeader="文字種"
            prev={prev}
            curr={curr}
            prevRows={classRows(prev, false)}
            currRows={classRows(curr, true)}
            note="前回のファイルになかった文字種を強調しています。"
          />
        </>
      ) : (
        <p className="detail-none">空欄以外の値がないため、分布はありません。</p>
      )}

      {newPrefixGroups.length > 0 && (
        <div className="prefix-section">
          <h3>新しく出た長さの先頭3文字</h3>
          <div className="prefix-groups">
            {newPrefixGroups.map((g) => {
              const groupTotal = g.prefixes.reduce((s, p) => s + p.count, 0) + g.others;
              return (
                <div key={g.length} className="prefix-group minority">
                  <h4>
                    {formatCount(g.length)} 文字（{formatCount(groupTotal)} 件）
                    <span className="minority-tag">{NEW_TAG}</span>
                  </h4>
                  <ol className="prefix-list">
                    {g.prefixes.map((p) => (
                      <li key={p.prefix}>
                        <Value value={p.prefix} />
                        <span className="prefix-count">{formatCount(p.count)} 件</span>
                      </li>
                    ))}
                    {g.others > 0 && (
                      <li className="prefix-others">
                        <span>その他</span>
                        <span className="prefix-count">{formatCount(g.others)} 件</span>
                      </li>
                    )}
                  </ol>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
