import { ENCODING_LABELS, formatCount } from './format';
import './Summary.css';

interface Props {
  fileName: string;
  rowCount: number;          // データ行数（見出しを除く）
  columnCount: number;
  detected: 'utf-8' | 'shift_jis';
  warnCount: number;
  infoCount: number;
  mismatchedRowCount: number;
}

export function Summary({
  fileName,
  rowCount,
  columnCount,
  detected,
  warnCount,
  infoCount,
  mismatchedRowCount,
}: Props) {
  return (
    <section className="summary" aria-label="サマリー">
      <dl className="summary-list">
        <div className="summary-item summary-file">
          <dt>ファイル名</dt>
          <dd>
            <code className="value">{fileName}</code>
          </dd>
        </div>
        <div className="summary-item">
          <dt>行数</dt>
          <dd>{formatCount(rowCount)}</dd>
        </div>
        <div className="summary-item">
          <dt>列数</dt>
          <dd>{formatCount(columnCount)}</dd>
        </div>
        <div className="summary-item">
          <dt>検出した文字コード</dt>
          <dd>{ENCODING_LABELS[detected]}</dd>
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
        {mismatchedRowCount > 0 && (
          <div className="summary-item">
            <dt>列数が一致しない行</dt>
            <dd>{formatCount(mismatchedRowCount)} 行</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
