import { useRef, useState } from 'react';
import {
  describeLink,
  linkEndId,
  roleOfOther,
  yearRange,
  type GraphLink,
  type GraphNode,
} from '../lib/graph';
import {
  EDGE_GROUP_BY_ID,
  sourceLabel,
  sourceUrl,
  type Affiliation,
  type SourceRef,
} from '../lib/schema';
import type { Selection } from '../App';

interface Props {
  selection: Selection;
  nodes: GraphNode[];
  links: GraphLink[];
  onSelect: (s: Selection) => void;
  onClose: () => void;
}

export default function SidePanel({ selection, nodes, links, onSelect, onClose }: Props) {
  if (!selection) return null;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const nameOf = (id: string) => nodeById.get(id)?.name ?? id;

  let body: React.ReactNode = null;
  if (selection.kind === 'node') {
    const node = nodeById.get(selection.id);
    if (node) body = <NodePanel node={node} links={links} nameOf={nameOf} onSelect={onSelect} />;
  } else {
    const link = links.find((l) => l.id === selection.id);
    if (link) body = <LinkPanel link={link} nameOf={nameOf} onSelect={onSelect} />;
  }
  if (!body) return null;

  return (
    <aside className="panel" aria-label="Details">
      <button className="panel-close" onClick={onClose} aria-label="Close panel">
        ×
      </button>
      {body}
    </aside>
  );
}

function NodePanel({
  node,
  links,
  nameOf,
  onSelect,
}: {
  node: GraphNode;
  links: GraphLink[];
  nameOf: (id: string) => string;
  onSelect: (s: Selection) => void;
}) {
  const p = node.person;
  const incident = links
    .filter((l) => linkEndId(l.source) === node.id || linkEndId(l.target) === node.id)
    .sort((a, b) => b.confidence - a.confidence || nameOf(otherEnd(a, node.id)).localeCompare(nameOf(otherEnd(b, node.id))));

  const timeline = [...(p?.timeline ?? [])].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));

  return (
    <div className="panel-body">
      <header className="panel-header">
        <h2>{node.name}</h2>
        <div className="badges">
          {!node.researched && <span className="badge badge-suggested">Suggested · no file yet</span>}
          {node.researched && node.publicFigure && <span className="badge">Public figure</span>}
          {node.researched && !node.publicFigure && (
            <span className="badge badge-private">Not a public figure · user-provided info only</span>
          )}
        </div>
        {p?.aliases && p.aliases.length > 0 && <div className="muted">Also: {p.aliases.join(', ')}</div>}
        {p?.current_role && <div className="role">{p.current_role}</div>}
      </header>

      {!node.researched && (
        <section>
          <p className="muted">
            Mentioned in {node.mentionedBy.join(', ')}'s file. To research this person, run in Claude Code:
          </p>
          <CopyCommand text={`/add-person ${node.name}`} />
        </section>
      )}

      {p?.summary && (
        <section>
          <h3>Summary</h3>
          <p>{p.summary}</p>
          <SourceList sources={p.sources} />
        </section>
      )}

      {p?.source_conflicts && p.source_conflicts.length > 0 && (
        <section className="conflicts">
          <h3>Sources disagree</h3>
          {p.source_conflicts.map((c, i) => (
            <div key={i} className="conflict">
              <strong>{c.topic}</strong>
              <p>{c.details}</p>
              <SourceList sources={c.sources} />
            </div>
          ))}
        </section>
      )}

      {timeline.length > 0 && (
        <section>
          <h3>Timeline</h3>
          <ol className="timeline">
            {timeline.map((t, i) => (
              <li key={i}>
                <span className="t-year">{yearRange(t.year, t.end_year) || '—'}</span>
                <div>
                  <div>
                    <strong>{t.role}</strong>
                    {t.org ? <span className="muted"> · {t.org}</span> : null}
                  </div>
                  <SourceList sources={t.sources} compact />
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {p?.affiliations && p.affiliations.length > 0 && (
        <section>
          <h3>Affiliations</h3>
          <ul className="affiliations">
            {p.affiliations.map((a, i) => {
              const aff: Affiliation = typeof a === 'string' ? { name: a } : a;
              const years = yearRange(aff.start_year, aff.end_year);
              return (
                <li key={i}>
                  <strong>{aff.name}</strong>
                  {aff.role && <span className="muted"> · {aff.role}</span>}
                  {years && <span className="muted"> · {years}</span>}
                  <SourceList sources={aff.sources} compact />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h3>Connections ({incident.length})</h3>
        {incident.length === 0 && <p className="muted">None recorded.</p>}
        <ul className="connections">
          {incident.map((l) => {
            const otherId = otherEnd(l, node.id);
            const g = EDGE_GROUP_BY_ID[l.group];
            const descriptions = uniqueDescriptions(l);
            return (
              <li key={l.id} className="connection">
                <div className="conn-head">
                  <span className="swatch" style={{ background: g.color }} />
                  <button className="link-button" onClick={() => onSelect({ kind: 'node', id: otherId })}>
                    {nameOf(otherId)}
                  </button>
                  <span className="conn-type">{roleOfOther(l, node.id)}</span>
                  <button className="link-button small" onClick={() => onSelect({ kind: 'link', id: l.id })}>
                    details
                  </button>
                </div>
                <div className="conn-meta">
                  {yearRange(l.startYear, l.endYear) && <span>{yearRange(l.startYear, l.endYear)}</span>}
                  <Confidence value={l.confidence} />
                </div>
                {descriptions.map((d, i) => (
                  <p key={i} className="conn-desc">
                    {d}
                  </p>
                ))}
                <SourceList sources={l.sources} compact />
              </li>
            );
          })}
        </ul>
      </section>

      {(p?.notes || p?.last_researched || node.file) && (
        <footer className="panel-footer muted">
          {p?.notes && <p>{p.notes}</p>}
          {p?.last_researched && <div>Last researched: {p.last_researched}</div>}
          {node.file && <div>File: data/people/{node.file}</div>}
          {node.researched && <CopyCommand text={`/refresh-person ${node.name}`} />}
        </footer>
      )}
    </div>
  );
}

function LinkPanel({
  link,
  nameOf,
  onSelect,
}: {
  link: GraphLink;
  nameOf: (id: string) => string;
  onSelect: (s: Selection) => void;
}) {
  const g = EDGE_GROUP_BY_ID[link.group];
  return (
    <div className="panel-body">
      <header className="panel-header">
        <div className="edge-kind">
          <span className="swatch" style={{ background: g.color }} /> {g.label}
        </div>
        <h2>{describeLink(link, nameOf)}</h2>
        <div className="edge-people">
          <button className="link-button" onClick={() => onSelect({ kind: 'node', id: link.sourceId })}>
            {nameOf(link.sourceId)}
          </button>
          <span className="muted">{link.directed ? ' → ' : ' — '}</span>
          <button className="link-button" onClick={() => onSelect({ kind: 'node', id: link.targetId })}>
            {nameOf(link.targetId)}
          </button>
        </div>
      </header>

      <section className="edge-facts">
        <div>
          <span className="muted">Dates</span>
          <div>{yearRange(link.startYear, link.endYear) || 'Not recorded'}</div>
        </div>
        <div>
          <span className="muted">Confidence</span>
          <Confidence value={link.confidence} />
        </div>
      </section>

      {link.disagreements.length > 0 && (
        <section className="conflicts">
          <h3>Files disagree</h3>
          <ul>
            {link.disagreements.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </section>
      )}

      {link.records.map((r, i) => (
        <section key={i}>
          <h3>As recorded in {r.fromName}'s file</h3>
          {r.connection.description && <p>{r.connection.description}</p>}
          <div className="conn-meta">
            <span>Type: {r.type}</span>
            {yearRange(r.connection.start_year, r.connection.end_year) && (
              <span>{yearRange(r.connection.start_year, r.connection.end_year)}</span>
            )}
            {typeof r.connection.confidence === 'number' && <Confidence value={r.connection.confidence} />}
          </div>
          <SourceList sources={r.connection.sources} />
        </section>
      ))}
    </div>
  );
}

function SourceList({ sources, compact }: { sources?: SourceRef[]; compact?: boolean }) {
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

function Confidence({ value }: { value: number }) {
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

function CopyCommand({ text }: { text: string }) {
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

function otherEnd(l: GraphLink, selfId: string): string {
  const s = linkEndId(l.source);
  return s === selfId ? linkEndId(l.target) : s;
}

function uniqueDescriptions(l: GraphLink): string[] {
  return [...new Set(l.records.map((r) => r.connection.description?.trim()).filter((d): d is string => !!d))];
}
