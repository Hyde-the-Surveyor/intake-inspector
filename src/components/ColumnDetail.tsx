import { useMemo } from 'react';
import { CHAR_CLASS_LABELS } from '../lib/classify';
import { LEN_MINORITY_SHARE, WARNING_TITLES } from '../lib/rules';
import type { ColumnProfile } from '../lib/types';
import { DistTable } from './DistTable';
import type { DistRow } from './DistTable';
import { formatCount } from './format';
import { LevelBadge } from './LevelBadge';
import { Value } from './Value';
import './ColumnDetail.css';

interface Props {
  profile: ColumnProfile;
}

export function ColumnDetail({ profile }: Props) {
  const nonEmpty = profile.total - profile.empty;
  const hasLenMinority = profile.warnings.some((w) => w.code === 'LEN_MINORITY');
  const hasFullwidth = profile.warnings.some((w) => w.code === 'FULLWIDTH_DIGIT');

  // 長さの分布。LEN_MINORITY の警告がある列では、構成比が閾値未満の長さを「少数派」として強調する
  // （判定そのものは lib の rules.ts に従い、ここでは同じ閾値で該当行を見つけるだけ）
  const lengthRows = useMemo<DistRow[]>(
    () =>
      profile.lengthDist.map((d) => ({
        key: String(d.length),
        label: <span>{formatCount(d.length)} 文字</span>,
        count: d.count,
        highlight: hasLenMinority && nonEmpty > 0 && d.count / nonEmpty < LEN_MINORITY_SHARE,
      })),
    [profile.lengthDist, hasLenMinority, nonEmpty],
  );

  // 文字種の分布。全角数字を含む値（注意）と、構成比が閾値未満の少数派を強調する
  const classRows = useMemo<DistRow[]>(
    () =>
      profile.classDist.map((d) => ({
        key: d.cls,
        label: <span>{CHAR_CLASS_LABELS[d.cls]}</span>,
        count: d.count,
        highlight:
          (hasFullwidth && d.cls === 'fullwidth_digit') ||
          (profile.classDist.length >= 2 && nonEmpty > 0 && d.count / nonEmpty < LEN_MINORITY_SHARE),
      })),
    [profile.classDist, hasFullwidth, nonEmpty],
  );

  const minorityLengths = new Set(
    lengthRows.filter((r) => r.highlight).map((r) => Number(r.key)),
  );

  return (
    <section className="detail" aria-label="列の詳細">
      <h2>
        列の詳細：<Value value={profile.name} className="detail-name" />
      </h2>
      <p className="detail-meta">
        件数 {formatCount(profile.total)} ／ 空欄 {formatCount(profile.empty)} ／ 値の種類{' '}
        {formatCount(profile.distinct)}
      </p>

      <h3>警告</h3>
      {profile.warnings.length === 0 ? (
        <p className="detail-none">この列に警告はありません。</p>
      ) : (
        <ul className="warning-list">
          {profile.warnings.map((w) => (
            <li key={w.code} className={`warning warning-${w.level}`}>
              <div className="warning-head">
                <LevelBadge level={w.level} />
                <strong>{WARNING_TITLES[w.code]}</strong>
              </div>
              <p className="warning-message">{w.message}</p>
            </li>
          ))}
        </ul>
      )}

      {profile.lengthDist.length > 0 ? (
        <>
          <DistTable
            caption="長さの分布"
            valueHeader="長さ"
            rows={lengthRows}
            total={nonEmpty}
            highlightNote={`構成比が ${LEN_MINORITY_SHARE * 100}% 未満の長さを少数派として強調しています。`}
          />
          <DistTable
            caption="文字種の分布"
            valueHeader="文字種"
            rows={classRows}
            total={nonEmpty}
            highlightNote="全角数字を含む値と、構成比の小さい文字種を強調しています。"
          />
        </>
      ) : (
        <p className="detail-none">空欄以外の値がないため、分布はありません。</p>
      )}

      {profile.prefixByLength.length > 0 && (
        <div className="prefix-section">
          <h3>長さ別の先頭3文字</h3>
          <div className="prefix-groups">
            {profile.prefixByLength.map((g) => {
              const minority = minorityLengths.has(g.length);
              const groupTotal = g.prefixes.reduce((s, p) => s + p.count, 0) + g.others;
              return (
                <div key={g.length} className={minority ? 'prefix-group minority' : 'prefix-group'}>
                  <h4>
                    {formatCount(g.length)} 文字（{formatCount(groupTotal)} 件）
                    {minority && <span className="minority-tag">少数派</span>}
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

      <h3>サンプル値</h3>
      {profile.samples.length === 0 ? (
        <p className="detail-none">空欄以外の値がありません。</p>
      ) : (
        <ul className="sample-list">
          {profile.samples.map((s, i) => (
            <li key={i}>
              <Value value={s} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
