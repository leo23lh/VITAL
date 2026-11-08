import { useEffect, useRef, useState } from 'react';
import {
  describeLink,
  familyOf,
  isPastRivalry,
  linkEndId,
  matchesQuery,
  type Comparison,
  type PairLink,
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
  ORG_KIND_LABEL,
  RECIPIENT_KIND_LABEL,
  SECTOR_BY_ID,
  formatUsd,
  leanLabel,
  orgSideColor,
  sourceLabel,
  sourceUrl,
  type Affiliation,
  type Giving,
  type GivingSide,
  type OrgFinance,
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
  /** Set in the compare view; shown when nothing is selected. */
  comparison: Comparison | null;
  onCompare: (a: string, b: string) => void;
  onClose: () => void;
}

export default function SidePanel({
  layout,
  selection,
  nodes,
  links,
  onSelect,
  onWorld,
  comparison,
  onCompare,
  onClose,
}: Props) {
  // Bottom sheet (folded phone): starts as a short peek, drag or tap the handle to expand.
  const [expanded, setExpanded] = useState(false);
  const drag = useRef<{ y: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const selKey = selection ? `${selection.kind}:${selection.id}` : comparison ? `cmp:${comparison.a}|${comparison.b}` : '';
  useEffect(() => {
    setExpanded(false);
    bodyRef.current?.scrollTo({ top: 0 });
  }, [selKey]);

  if (!selection && !comparison) return null;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const nameOf = (id: string) => nodeById.get(id)?.name ?? id;
  const isOrg = (id: string) => !!nodeById.get(id)?.isOrg;

  let body: React.ReactNode = null;
  if (!selection) {
    body = <ComparePanel c={comparison!} nameOf={nameOf} isOrg={isOrg} onSelect={onSelect} />;
  } else if (selection.kind === 'node') {
    const node = nodeById.get(selection.id);
    if (node)
      body = (
        <NodePanel
          node={node}
          links={links}
          nameOf={nameOf}
          isOrg={(id) => !!nodeById.get(id)?.isOrg}
          hasFile={(id) => nodeById.has(id)}
          onSelect={onSelect}
          onWorld={onWorld}
          others={nodes}
          onCompare={onCompare}
        />
      );
  } else {
    const pair = links.filter((l) => pairKey(l.sourceId, l.targetId) === selection.id);
    if (pair.length)
      body = <PairPanel links={pair} nameOf={nameOf} isOrg={isOrg} onSelect={onSelect} onCompare={onCompare} />;
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
  isOrg,
  hasFile,
  onSelect,
  onWorld,
  others,
  onCompare,
}: {
  node: GraphNode;
  links: GraphLink[];
  nameOf: (id: string) => string;
  isOrg: (id: string) => boolean;
  /** Whether a slug is a dot on the map (so it can be selected). */
  hasFile: (id: string) => boolean;
  onSelect: (s: Selection) => void;
  onWorld: (id: string) => void;
  /** Everyone on the map, for the Compare picker. */
  others: GraphNode[];
  onCompare: (a: string, b: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const p = node.person;
  const o = node.org;
  // Fields people and organizations share.
  const d = p ?? o;
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
        <div className="panel-title">
          {node.photoUrl && (
            <img
              className="panel-photo"
              src={node.photoUrl}
              alt=""
              style={{ borderColor: sector?.color ?? 'var(--border)' }}
            />
          )}
          <h2>{node.name}</h2>
        </div>
        <div className="badges">
          {!node.researched && <span className="badge badge-suggested">Suggested · no file yet</span>}
          {o && (
            <span className="badge badge-org">
              <span className="key-square" style={{ borderColor: orgSideColor(o.side) }} />
              {ORG_KIND_LABEL[o.kind] ?? 'Organization'}
              {o.side && <SideTag side={o.side} />}
            </span>
          )}
          {o && (o.founded || o.dissolved) && (
            <span className="badge">{o.dissolved ? `${o.founded ?? '?'}–${o.dissolved}` : `Founded ${o.founded}`}</span>
          )}
          {node.researched && sector && (
            <span className="badge badge-sector">
              <span className="key-dot" style={{ background: sector.color }} /> {sector.label}
            </span>
          )}
          {node.researched && !o && node.publicFigure && !sector && <span className="badge">Public figure</span>}
          {node.researched && !node.publicFigure && (
            <span className="badge badge-private">Not a public figure · user-provided info only</span>
          )}
        </div>
        {p?.race_2028 && (
          <div className="race-2028">
            <strong>2028:</strong>{' '}
            {p.race_2028.role === 'contender' ? (
              'likely contender'
            ) : (
              <>
                in the camp of{' '}
                {(p.race_2028.contenders ?? []).map((s, i) => (
                  <span key={s}>
                    {i > 0 && ', '}
                    <button className="link-button" onClick={() => onSelect({ kind: 'node', id: s })}>
                      {nameOf(s)}
                    </button>
                  </span>
                ))}
              </>
            )}
            <span className="muted"> · {p.race_2028.basis}</span>
            <SourceList sources={p.race_2028.sources} compact />
          </div>
        )}
        {d?.aliases && d.aliases.length > 0 && <div className="muted">Also: {d.aliases.join(', ')}</div>}
        {p?.current_role && <div className="role">{p.current_role}</div>}
        {p?.photo && (
          <div className="photo-credit muted">
            Photo:{' '}
            <a href={sourceUrl(p.photo.source)} target="_blank" rel="noreferrer noopener">
              {p.photo.credit}
            </a>
            , {p.photo.license}, via Wikimedia Commons
          </div>
        )}
        <div className="panel-actions">
          <button onClick={() => onWorld(node.id)}>Focus</button>
          <button className={picking ? 'on' : ''} onClick={() => setPicking((v) => !v)} aria-expanded={picking}>
            Compare
          </button>
          <span className="muted small">
            {people.length} connection{people.length === 1 ? '' : 's'}
            {groupLabels.length > 0 && ` · ${groupLabels.join(' · ')}`}
          </span>
        </div>
        {picking && (
          <ComparePicker
            selfId={node.id}
            selfName={node.name}
            nodes={others}
            onPick={(id) => {
              setPicking(false);
              onCompare(node.id, id);
            }}
          />
        )}
      </header>

      {!node.researched && (
        <section>
          <p className="muted">
            Mentioned in {node.mentionedBy.join(', ')}'s file. To research this person, run in Claude Code:
          </p>
          <CopyCommand text={`/add-person ${node.name}`} />
        </section>
      )}

      {d?.summary && (
        <section>
          <h3>Summary</h3>
          <p>{d.summary}</p>
          <SourceList sources={d.sources} />
        </section>
      )}

      {o?.finances && o.finances.length > 0 && <FinanceSection finances={o.finances} />}

      {p?.lean && p.lean.length > 0 && (
        <section>
          <h3>Political lean</h3>
          <ol className="timeline">
            {[...p.lean].reverse().map((l, i) => (
              <li key={i}>
                <span className="t-year">{yearRange(l.start_year, l.end_year ?? null) || 'all years'}</span>
                <div>
                  <div>
                    <strong>{leanLabel(l.value)}</strong>
                    <span className="muted"> ({l.value > 0 ? `+${l.value}` : l.value})</span>
                  </div>
                  <p className="small">{l.basis}</p>
                  <SourceList sources={l.sources} compact />
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {p?.giving && <GivingSection giving={p.giving} hasFile={hasFile} onSelect={onSelect} />}

      {d?.source_conflicts && d.source_conflicts.length > 0 && (
        <section className="conflicts">
          <h3>Sources disagree</h3>
          {d.source_conflicts.map((c, i) => (
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
                      {roleOfOther(l, node.id, isOrg)}
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

      {(d?.notes || d?.last_researched || node.file) && (
        <footer className="panel-footer muted">
          {d?.notes && <p>{d.notes}</p>}
          {d?.last_researched && <div>Last researched: {d.last_researched}</div>}
          {node.file && (
            <div>
              File: data/{o ? 'orgs' : 'people'}/{node.file}
            </div>
          )}
          {node.researched && <CopyCommand text={`/${o ? 'add-org' : 'refresh-person'} ${node.name}`} />}
        </footer>
      )}
    </div>
  );
}

const SIDE_LABEL: Record<GivingSide, string> = { D: 'Dem', R: 'GOP', both: 'Both parties', nonpartisan: 'Nonpartisan' };

function SideTag({ side }: { side?: GivingSide }) {
  if (!side) return null;
  return <span className={`side-tag side-${side}`}>{SIDE_LABEL[side]}</span>;
}

/** Donations by cycle, newest first, then the sourced outlook for the next cycle. */
function GivingSection({
  giving,
  hasFile,
  onSelect,
}: {
  giving: Giving;
  hasFile: (id: string) => boolean;
  onSelect: (s: Selection) => void;
}) {
  const cycles = [...(giving.cycles ?? [])].sort((a, b) => b.cycle - a.cycle);
  // An organization with its own file wins over the person who runs it.
  const target = (name: string, slug?: string, org?: string) => {
    const id = org && hasFile(org) ? org : slug && hasFile(slug) ? slug : null;
    return id ? (
      <button className="link-button" onClick={() => onSelect({ kind: 'node', id })}>
        {name}
      </button>
    ) : (
      <strong>{name}</strong>
    );
  };
  return (
    <section className="giving">
      <h3>Giving</h3>
      {cycles.map((c) => (
        <div key={c.cycle} className="giving-cycle">
          <div className="giving-head">
            <span className="giving-year">{c.cycle} cycle</span>
            {typeof c.total_usd === 'number' && <strong>{formatUsd(c.total_usd)}</strong>}
            {c.rank && <span className="giving-rank">#{c.rank}</span>}
            {c.ranking && <span className="muted small">· {c.ranking}</span>}
          </div>
          {c.description && <p className="small">{c.description}</p>}
          <SourceList sources={c.sources} compact />
          {c.recipients && c.recipients.length > 0 && (
            <ul className="giving-list">
              {[...c.recipients]
                .sort((a, b) => (b.amount_usd ?? 0) - (a.amount_usd ?? 0))
                .map((r, i) => (
                  <li key={i}>
                    <div className="giving-row">
                      <span className="giving-amt">{typeof r.amount_usd === 'number' ? formatUsd(r.amount_usd) : '—'}</span>
                      <span>
                        {target(r.name, r.slug, r.org)} <span className="muted small">{RECIPIENT_KIND_LABEL[r.kind] ?? r.kind}</span>{' '}
                        <SideTag side={r.side} />
                      </span>
                    </div>
                    {r.description && <p className="small giving-desc">{r.description}</p>}
                    <SourceList sources={r.sources} compact />
                  </li>
                ))}
            </ul>
          )}
        </div>
      ))}
      {giving.outlook && (
        <div className="giving-outlook">
          <h4>Likely in {giving.outlook.cycle}</h4>
          <p className="small">{giving.outlook.summary}</p>
          <SourceList sources={giving.outlook.sources} compact />
          {giving.outlook.likely && giving.outlook.likely.length > 0 && (
            <ul className="giving-list">
              {[...giving.outlook.likely]
                .sort((a, b) => b.confidence - a.confidence)
                .map((l, i) => (
                  <li key={i}>
                    <div className="giving-row">
                      <Confidence value={l.confidence} />
                      <span>
                        {target(l.name, l.slug, l.org)} <span className="muted small">{RECIPIENT_KIND_LABEL[l.kind] ?? l.kind}</span>{' '}
                        <SideTag side={l.side} />
                      </span>
                    </div>
                    <p className="small giving-desc">{l.basis}</p>
                    <SourceList sources={l.sources} compact />
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/** Money raised and spent by cycle, newest first. */
function FinanceSection({ finances }: { finances: OrgFinance[] }) {
  return (
    <section className="giving">
      <h3>Money</h3>
      {[...finances]
        .sort((a, b) => b.cycle - a.cycle)
        .map((f) => (
          <div key={f.cycle} className="giving-cycle">
            <div className="giving-head">
              <span className="giving-year">{f.cycle} cycle</span>
            </div>
            <div className="org-finance">
              {typeof f.raised_usd === 'number' && (
                <>
                  <span className="muted small">Raised</span>
                  <strong>{formatUsd(f.raised_usd)}</strong>
                </>
              )}
              {typeof f.spent_usd === 'number' && (
                <>
                  <span className="muted small">Spent</span>
                  <strong>{formatUsd(f.spent_usd)}</strong>
                </>
              )}
            </div>
            {f.description && <p className="small">{f.description}</p>}
            <SourceList sources={f.sources} compact />
          </div>
        ))}
    </section>
  );
}

function PairPanel({
  links,
  nameOf,
  isOrg,
  onSelect,
  onCompare,
}: {
  links: GraphLink[];
  nameOf: (id: string) => string;
  isOrg: (id: string) => boolean;
  onSelect: (s: Selection) => void;
  onCompare: (a: string, b: string) => void;
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
        <div className="panel-actions">
          <button onClick={() => onCompare(a, b)}>How close are they?</button>
          <span className="muted small">
            {links.length} kind{links.length === 1 ? '' : 's'} of link
          </span>
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
            <h3 className="edge-sentence">{describeLink(link, nameOf, isOrg)}</h3>
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

/** Search box for the second person in a comparison. */
function ComparePicker({
  selfId,
  selfName,
  nodes,
  onPick,
}: {
  selfId: string;
  selfName: string;
  nodes: GraphNode[];
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const results = q.trim()
    ? nodes
        .filter((n) => n.id !== selfId && matchesQuery(n, q.trim()))
        .sort((a, b) => Number(b.researched) - Number(a.researched) || b.degree - a.degree)
        .slice(0, 6)
    : [];
  return (
    <div className="compare-picker">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && results[0] && onPick(results[0].id)}
        placeholder={`Compare ${selfName} with…`}
        aria-label={`Compare ${selfName} with`}
      />
      {results.length > 0 && (
        <ul>
          {results.map((n) => (
            <li key={n.id}>
              <button className="link-button" onClick={() => onPick(n.id)}>
                {n.name}
              </button>
              {!n.researched && <span className="muted small"> suggested</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The pair's closest friendly link (rivalries only if there is nothing else). */
function bestTie(pair: PairLink): GraphLink {
  const friendly = pair.links.filter((l) => l.group !== 'rival' && l.group !== 'enemy');
  return [...(friendly.length ? friendly : pair.links)].sort((x, y) => y.confidence - x.confidence)[0];
}

/** "ally of", "donor to"…: how the other end of `link` relates to `anchor`. */
function tieLabel(link: GraphLink, anchor: string, isOrg: (id: string) => boolean): string {
  const otherIsSource = link.sourceId !== anchor;
  const other = otherIsSource ? link.sourceId : link.targetId;
  switch (link.group) {
    case 'mentorship':
      return otherIsSource ? 'mentor of' : 'protégé of';
    case 'employment':
      return otherIsSource ? 'employer of' : 'worked for';
    case 'funding':
      return otherIsSource ? 'donor to' : 'funded by';
    case 'co-founder':
      if (isOrg(other) !== isOrg(anchor)) return isOrg(other) ? 'founded by' : 'founder of';
      return 'co-founder with';
    case 'colleague':
      return 'colleague of';
    case 'ally':
      return 'ally of';
    case 'family':
      return 'family of';
    case 'rival':
      return 'rival of';
    case 'enemy':
      return 'enemy of';
  }
}

/** A colored chip like "ally of JD Vance". */
function TieChip({
  pair,
  anchor,
  nameOf,
  isOrg,
}: {
  pair: PairLink;
  anchor: string;
  nameOf: (id: string) => string;
  isOrg: (id: string) => boolean;
}) {
  const l = bestTie(pair);
  return (
    <span className="type-chip">
      <span className="swatch" style={{ background: EDGE_FAMILY_BY_ID[familyOf(l)].color }} />
      {tieLabel(l, anchor, isOrg)} {nameOf(anchor)}
    </span>
  );
}

function ComparePanel({
  c,
  nameOf,
  isOrg,
  onSelect,
}: {
  c: Comparison;
  nameOf: (id: string) => string;
  isOrg: (id: string) => boolean;
  onSelect: (s: Selection) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const person = (id: string) => (
    <button className="link-button" onClick={() => onSelect({ kind: 'node', id })}>
      {nameOf(id)}
    </button>
  );
  const via = c.chain && c.chain.length > 2 ? c.chain.slice(1, -1) : [];
  const why: string[] = [];
  if (c.chain?.length === 2) why.push('directly tied');
  else if (via.length) why.push(`strongest chain runs through ${via.map(nameOf).join(' → ')}`);
  else why.push('no friendly chain within 4 links');
  why.push(c.shared.length ? `${c.shared.length} in common` : 'no one in common');
  if (c.sharedGroups.length)
    why.push(`both in ${c.sharedGroups.map((g) => GROUPS.find((x) => x.id === g)?.label ?? g).join(', ')}`);
  if (c.tension) why.push(`${c.tension.group === 'enemy' ? 'enemies' : 'rivals'}${isPastRivalry(c.tension) ? ' in the past' : ''}`);
  const shared = showAll ? c.shared : c.shared.slice(0, 8);

  return (
    <div className="panel-body">
      <header className="panel-header">
        <h2>
          {person(c.a)}
          <span className="muted"> &amp; </span>
          {person(c.b)}
        </h2>
        <div className="closeness">
          <div className="closeness-top">
            <strong className="closeness-score">{c.score}</strong>
            <span>
              <strong>{c.label}</strong>
              <span className="muted small"> · closeness out of 100</span>
            </span>
          </div>
          <div className="closeness-bar" aria-hidden="true">
            <span style={{ width: `${c.score}%` }} />
          </div>
          <p className="small">{why.join(' · ').replace(/^./, (x) => x.toUpperCase())}.</p>
        </div>
      </header>

      {c.direct.length > 0 && (
        <section>
          <h3>Between them</h3>
          <ul className="plain-list">
            {c.direct.map((l) => (
              <li key={l.id}>
                <span className="swatch" style={{ background: EDGE_FAMILY_BY_ID[familyOf(l)].color }} />{' '}
                {describeLink(l, nameOf, isOrg)}
                <span className="muted small"> · {Math.round(l.confidence * 100)}%</span>
              </li>
            ))}
          </ul>
          <button className="link-button small" onClick={() => onSelect({ kind: 'link', id: pairKey(c.a, c.b) })}>
            details and sources
          </button>
        </section>
      )}

      {c.chain && c.chain.length > 2 && (
        <section>
          <h3>Strongest chain</h3>
          <p className="muted small">
            The path through the closest, best-sourced links that still hold. Rivalries don't count.
          </p>
          <ol className="chain">
            {c.chain.map((id, i) => (
              <li key={id}>
                {person(id)}
                {i < c.chainPairs.length && (
                  <div className="chain-step">
                    <span className="swatch" style={{ background: EDGE_FAMILY_BY_ID[familyOf(bestTie(c.chainPairs[i]))].color }} />
                    <span className="small">{describeLink(bestTie(c.chainPairs[i]), nameOf, isOrg)}</span>
                    <button
                      className="link-button small"
                      onClick={() => onSelect({ kind: 'link', id: c.chainPairs[i].id })}
                    >
                      sources
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <h3>Shared circle ({c.shared.length})</h3>
        {c.shared.length === 0 && <p className="muted">No one is tied to both.</p>}
        <ul className="connections">
          {shared.map((t) => (
            <li key={t.id} className="connection">
              <div className="conn-head">{person(t.id)}</div>
              <div className="conn-types">
                <TieChip pair={t.viaA} anchor={c.a} nameOf={nameOf} isOrg={isOrg} />
                <TieChip pair={t.viaB} anchor={c.b} nameOf={nameOf} isOrg={isOrg} />
              </div>
            </li>
          ))}
        </ul>
        {c.shared.length > 8 && (
          <button className="link-button small" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show fewer' : `Show all ${c.shared.length}`}
          </button>
        )}
      </section>

      <footer className="panel-footer muted small">
        The score combines the strongest chain (closer kinds of link and higher confidence count more), how many
        people and organizations they share, and shared groups. Ties that run through someone with a huge network
        (like Trump) count for less, ties that have ended count a bit over half, and a direct rivalry or enmity lowers
        the score. With a date range set, only links active in that range count.
      </footer>
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
