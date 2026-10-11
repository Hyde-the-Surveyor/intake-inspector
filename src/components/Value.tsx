// 値を 1 文字も変えずに等幅で表示する。
// 前後の空白（全角スペース U+3000 を含む）は見えないので、表示上だけ <span class="ws"> で囲んで背景色を付ける。
// 文字そのものは置き換えない。

const EDGE_WS = /^(\s*)([\s\S]*?)(\s*)$/;

interface Props {
  value: string;
  className?: string;
}

export function Value({ value, className }: Props) {
  const m = EDGE_WS.exec(value);
  const lead = m?.[1] ?? '';
  const body = m?.[2] ?? value;
  const trail = m?.[3] ?? '';
  const cls = className ? `value ${className}` : 'value';

  if (lead === '' && trail === '') {
    return <code className={cls}>{value}</code>;
  }
  return (
    <code className={cls}>
      {lead !== '' && (
        <span className="ws" title={`先頭に空白 ${[...lead].length} 文字`}>
          {lead}
        </span>
      )}
      {body}
      {trail !== '' && (
        <span className="ws" title={`末尾に空白 ${[...trail].length} 文字`}>
          {trail}
        </span>
      )}
    </code>
  );
}
