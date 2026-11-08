import { formatCount } from './format';
import './Summary.css';

interface Props {
  prevName: string;
  currName: string;
  prevRows: number;
  currRows: number;
  prevColumns: number;
  currColumns: number;
  warnCount: number;
  infoCount: number;
}

export function CompareSummary({
  prevName,
  currName,
  prevRows,
  currRows,
  prevColumns,
  currColumns,
  warnCount,
  infoCount,
}: Props) {
  return (
    <section className="summary" aria-label="比較のサマリー">
      <dl className="summary-list">
        <div className="summary-item compare-summary-file">
          <dt>前回のファイル</dt>
          <dd>
            <code className="value">{prevName}</code>
          </dd>
        </div>
        <div className="summary-item compare-summary-file">
          <dt>今回のファイル</dt>
          <dd>
            <code className="value">{currName}</code>
          </dd>
        </div>
        <div className="summary-item">
          <dt>行数（前回 → 今回）</dt>
          <dd>
            {formatCount(prevRows)} → {formatCount(currRows)}
          </dd>
        </div>
        <div className="summary-item">
          <dt>列数（前回 → 今回）</dt>
          <dd>
            {formatCount(prevColumns)} → {formatCount(currColumns)}
          </dd>
        </div>
        <div className={warnCount > 0 ? 'summary-item has-warn' : 'summary-item'}>
          <dt>
            <span className="level-icon" aria-hidden="true">⚠</span> 注意
          </dt>
          <dd>{formatCount(warnCount)} 件</dd>
        </div>
        <div className="summary-item">
          <dt>
            <span className="level-icon" aria-hidden="true">ℹ</span> 情報
          </dt>
          <dd>{formatCount(infoCount)} 件</dd>
        </div>
      </dl>
    </section>
  );
}
