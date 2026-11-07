import { useEffect, useRef, useState } from 'react';
import {
  describeLink,
  familyOf,
  linkEndId,
  pairKey,
  roleOfOther,
  yearRange,
  type GraphLink,
  type GraphNode,
} from '../lib/graph';
import {
  EDGE_FAMILY_BY_ID,
  EDGE_GROUP_BY_ID,
  GROUPS,
  SECTOR_BY_ID,
  sourceLabel,
  sourceUrl,
  type Affiliation,
  type SourceRef,
} from '../lib/schema';
import type { Layout, Selection } from '../App';

interface Props {
  layout: Layout;
  selection: Selection;
  nodes: GraphNode[];
  links: GraphLink[];
  onSelect: (s: Selection) => void;
  onWorld: (id: string) => void;
  onClose: () => void;
}

export default function SidePanel({ layout, selection, nodes, links, onSelect, onWorld, onClose }: Props) {
  // Bottom sheet (folded phone): starts as a short peek, drag or tap the handle to expand.
  const [expanded, setExpanded] = useState(false);
  const drag = useRef<{ y: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const selKey = selection ? `${selection.kind}:${selection.id}` : '';
  useEffect(() => {
    setExpanded(false);
    bodyRef.current?.scrollTo({ top: 0 });
  }, [selKey]);

  if (!selection) return null;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const nameOf = (id: string) => nodeById.get(id)?.name ?? id;

  let body: React.ReactNode = null;
  if (selection.kind === 'node') {
    const node = nodeById.get(selection.id);
    if (node) body = <NodePanel node={node} links={links} nameOf={nameOf} onSelect={onSelect} onWorld={onWorld} />;
  } else {
    const pair = links.filter((l) => pairKey(l.sourceId, l.targetId) === selection.id);
    if (pair.length) body = <PairPanel links={pair} nameOf={nameOf} onSelect={onSelect} />;
  }
  if (!body) return null;

  const sheet = layout === 'sheet';
  return (
    <aside className={`panel panel-${layout}${sheet && expanded ? ' expanded' : ''}`} aria-label="Details">
      {sheet && (
        <button
          className="sheet-handle"
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
          onClick={() => setExpanded((e) => !e)}
          onPointerDown={(e) => (drag.current = { y: e.clientY })}
          onPointerUp={(e) => {
            const start = drag.current;
            drag.current = null;
            if (!start) return;
            const dy = e.clientY - start.y;
            if (dy < -24) setExpanded(true);
            else if (dy > 24) (expanded ? setExpanded(false) : onClose());
          }}
        >
          <span />
        </button>
      )}
      <button className="panel-close" onClick={onClose} aria-label="Close details">
        ×
      </button>
      <div className="panel-scroll" ref={bodyRef} onScroll={() => sheet && !expanded && setExpanded(true)}>
        {body}
      </div>
    </aside>
  );
}

function NodePanel({
  node,
  links,
  nameOf,
  onSelect,
  onWorld,
}: {
  node: GraphNode;
  links: GraphLink[];
  nameOf: (id: string) => string;
  onSelect: (s: Selection) => void;
  onWorld: (id: string) => void;
}) {
  const p = node.person;
  // One row per connected person, with every kind of link between them.
  const byOther = new Map<string, GraphLink[]>();
  for (const l of links) {
    if (linkEndId(l.source) !== node.id && linkEndId(l.target) !== node.id) continue;
    const other = otherEnd(l, node.id);
    if (!byOther.has(other)) byOther.set(other, []);
    byOther.get(other)!.push(l);
  }
  const people = [...byOther.entries()]
    .map(([id, ls]) => ({ id, links: ls, confidence: Math.max(...ls.map((l) => l.confidence)) }))
    .sort((a, b) => b.confidence - a.confidence || nameOf(a.id).localeCompare(nameOf(b.id)));
  const sector = node.sector ? SECTOR_BY_ID[node.sector] : null;
  const groupLabels = node.groups.map((g) => GROUPS.find((x) => x.id === g)?.label ?? g);

  const timeline = [...(p?.timeline ?? [])].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));

  return (
    <div className="panel-body">
      <header className="panel-header">
        <h2>{node.name}</h2>
        <div className="badges">
          {!node.researched && <span className="badge badge-suggested">Suggested · no file yet</span>}
          {node.researched && sector && (
            <span className="badge badge-sector">
              <span className="key-dot" style={{ background: sector.color }} /> {sector.label}
            </span>
          )}
          {node.researched && node.publicFigure && !sector && <span className="badge">Public figure</span>}
          {node.researched && !node.publicFigure && (
            <span className="badge badge-private">Not a public figure · user-provided info only</span>
          )}
        </div>
        {p?.aliases && p.aliases.length > 0 && <div className="muted">Also: {p.aliases.join(', ')}</div>}
        {p?.current_role && <div className="role">{p.current_role}</div>}
        <div className="panel-actions">
          <button onClick={() => onWorld(node.id)}>Focus</button>
          <span className="muted small">
            {people.length} connection{people.length === 1 ? '' : 's'}
            {groupLabels.length > 0 && ` · ${groupLabels.join(' · ')}`}
          </span>
        </div>
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
        <h3>Connections ({people.length})</h3>
        {people.length === 0 && <p className="muted">None recorded.</p>}
        <ul className="connections">
          {people.map(({ id: otherId, links: ls }) => {
            const descriptions = [...new Set(ls.flatMap(uniqueDescriptions))];
            const sources = dedupeSources(ls.flatMap((l) => l.sources));
            return (
              <li key={otherId} className="connection">
                <div className="conn-head">
                  <button className="link-button" onClick={() => onSelect({ kind: 'node', id: otherId })}>
                    {nameOf(otherId)}
                  </button>
                  <button
                    className="link-button small"
                    onClick={() => onSelect({ kind: 'link', id: pairKey(node.id, otherId) })}
                  >
                    details
                  </button>
                </div>
                <div className="conn-types">
                  {ls.map((l) => (
                    <span key={l.id} className="type-chip">
                      <span className="swatch" style={{ background: EDGE_FAMILY_BY_ID[familyOf(l)].color }} />
                      {roleOfOther(l, node.id)}
                      {yearRange(l.startYear, l.endYear) && (
                        <span className="muted"> · {yearRange(l.startYear, l.endYear)}</span>
                      )}
                      <span className="muted"> · {Math.round(l.confidence * 100)}%</span>
                    </span>
                  ))}
                </div>
                {descriptions.map((d, i) => (
                  <p key={i} className="conn-desc">
                    {d}
                  </p>
                ))}
                <SourceList sources={sources} compact />
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

function PairPanel({
  links,
  nameOf,
  onSelect,
}: {
  links: GraphLink[];
  nameOf: (id: string) => string;
  onSelect: (s: Selection) => void;
}) {
  const [a, b] = [links[0].sourceId, links[0].targetId].sort((x, y) => nameOf(x).localeCompare(nameOf(y)));
  return (
    <div className="panel-body">
      <header className="panel-header">
        <h2>
          <button className="link-button big" onClick={() => onSelect({ kind: 'node', id: a })}>
            {nameOf(a)}
          </button>
          <span className="muted"> &amp; </span>
          <button className="link-button big" onClick={() => onSelect({ kind: 'node', id: b })}>
            {nameOf(b)}
          </button>
        </h2>
        <div className="muted small">
          {links.length} kind{links.length === 1 ? '' : 's'} of link
        </div>
      </header>

      {links.map((link) => {
        const g = EDGE_GROUP_BY_ID[link.group];
        const f = EDGE_FAMILY_BY_ID[familyOf(link)];
        return (
          <section key={link.id} className="pair-link">
            <div className="edge-kind">
              <span className="swatch" style={{ background: f.color }} /> {g.label}
              <span className="muted"> · {f.label}</span>
            </div>
            <h3 className="edge-sentence">{describeLink(link, nameOf)}</h3>
            <div className="edge-facts">
              <div>
                <span className="muted">Dates</span>
                <div>{yearRange(link.startYear, link.endYear) || 'Not recorded'}</div>
              </div>
              <div>
                <span className="muted">Confidence</span>
                <Confidence value={link.confidence} />
              </div>
            </div>

            {link.disagreements.length > 0 && (
              <div className="conflicts">
                <h3>Files disagree</h3>
                <ul>
                  {link.disagreements.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {link.records.map((r, i) => (
              <div key={i} className="record">
                <h4>As recorded in {r.fromName}'s file</h4>
                {r.connection.description && <p>{r.connection.description}</p>}
                <div className="conn-meta">
                  <span>Type: {r.type}</span>
                  {yearRange(r.connection.start_year, r.connection.end_year) && (
                    <span>{yearRange(r.connection.start_year, r.connection.end_year)}</span>
                  )}
                  {typeof r.connection.confidence === 'number' && <Confidence value={r.connection.confidence} />}
                </div>
                <SourceList sources={r.connection.sources} />
              </div>
            ))}
          </section>
        );
      })}
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

function dedupeSources(sources: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const k = sourceUrl(s);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
