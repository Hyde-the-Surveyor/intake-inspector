import type { Level } from '../lib/types';
import { LEVEL_ICONS, LEVEL_LABELS } from './format';

// 警告レベルのバッジ。色だけで区別せず、アイコンと「注意」「情報」の文字を必ず付ける
export function LevelBadge({ level, title }: { level: Level; title?: string }) {
  return (
    <span className={`badge badge-${level}`}>
      <span className="level-icon" aria-hidden="true">{LEVEL_ICONS[level]}</span>
      <span className="badge-level">{LEVEL_LABELS[level]}</span>
      {title && <span className="badge-title">{title}</span>}
    </span>
  );
}
