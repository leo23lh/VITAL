// Small pieces shared by the panels: source lists, confidence dots, copy buttons.
import { useRef, useState } from 'react';
import { linkEndId, type GraphLink } from '../../lib/graph';
import { sourceLabel, sourceUrl, type SourceRef } from '../../lib/schema';
import { GRADE_LABEL, type Evidence } from '../../lib/evidence';

export function SourceList({ sources, compact }: { sources?: SourceRef[]; compact?: boolean }) {
  if (!sources || sources.length === 0) return compact ? null : <div className="sources muted">No sources</div>;
  return (
    <div className={compact ? 'sources compact' : 'sources'}>
      {sources.map((s, i) => {
        const url = sourceUrl(s);
        const label = sourceLabel(s);
        if (!/^https?:\/\//i.test(url)) {
          return (
            <span key={i} className="source-chip muted" title={url}>
              {label}
            </span>
          );
        }
        return (
          <a key={i} className="source-chip" href={url} target="_blank" rel="noreferrer noopener" title={url}>
            {label}
          </a>
        );
      })}
    </div>
  );
}

export function Confidence({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const level = pct >= 85 ? 'high' : pct >= 60 ? 'medium' : 'low';
  return (
    <span className={`confidence confidence-${level}`} title={`Confidence ${pct}%`}>
      <span className="confidence-bar">
        <span style={{ width: `${pct}%` }} />
      </span>
      {pct}%
    </span>
  );
}

/** How well a tie is documented: "Strong · 3 independent sources (1 official record)". */
export function EvidenceTag({ evidence }: { evidence: Evidence }) {
  return (
    <span className={`evidence evidence-${evidence.grade}`}>
      <span className="evidence-grade">{GRADE_LABEL[evidence.grade]}</span>
      <span className="muted small"> · {evidence.note}</span>
    </span>
  );
}

export function CopyCommand({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  // Some app views refuse clipboard writes; fall back to selecting the text.
  const selectText = () => {
    const el = codeRef.current;
    const sel = window.getSelection();
    if (!el || !sel) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
  };
  return (
    <button
      className="copy-command"
      onClick={() => {
        if (!navigator.clipboard) return selectText();
        navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          },
          selectText,
        );
      }}
      title="Copy to clipboard"
    >
      <code ref={codeRef}>{text}</code>
      <span className="muted">{copied ? 'copied' : 'copy'}</span>
    </button>
  );
}

export function otherEnd(l: GraphLink, selfId: string): string {
  const s = linkEndId(l.source);
  return s === selfId ? linkEndId(l.target) : s;
}

export function uniqueDescriptions(l: GraphLink): string[] {
  return [...new Set(l.records.map((r) => r.connection.description?.trim()).filter((d): d is string => !!d))];
}

export function dedupeSources(sources: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const k = sourceUrl(s);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
