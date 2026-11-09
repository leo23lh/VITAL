// Details panel for one person or organization: overview, ties, money and record tabs.
import { useState } from 'react';
import { bond, familyOf, linkEndId, matchesQuery, type WorkplaceIndex, pairKey, roleOfOther, yearRange, type GraphLink, type GraphNode } from '../../lib/graph';
import { EDGE_FAMILY_BY_ID, GROUPS, ORG_KIND_LABEL, RECIPIENT_KIND_LABEL, SECTOR_BY_ID, formatUsd, leanLabel, orgSideColor, sourceUrl, type Affiliation, type Giving, type GivingSide, type OrgFinance } from '../../lib/schema';
import type { Selection } from '../../lib/view';
import { Confidence, CopyCommand, SourceList, dedupeSources, otherEnd, uniqueDescriptions } from './parts';
import { PullSection, type PullTools } from './PullSection';

export function NodePanel({
  node,
  links,
  nameOf,
  isOrg,
  hasFile,
  onSelect,
  onWorld,
  others,
  onCompare,
  nodeOf,
  workplaces,
  pullTools,
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
  nodeOf: (id: string) => GraphNode | undefined;
  workplaces: WorkplaceIndex;
  pullTools: PullTools;
}) {
  const [picking, setPicking] = useState(false);
  const [tab, setTab] = useState<'overview' | 'ties' | 'pull' | 'money' | 'record'>('overview');
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
  // Strongest bonds first (see bond()), then by confidence.
  const people = [...byOther.entries()]
    .map(([id, ls]) => ({
      id,
      links: ls,
      confidence: Math.max(...ls.map((l) => l.confidence)),
      bond: bond(node, nodeOf(id), ls, workplaces),
    }))
    .sort(
      (a, b) =>
        b.bond.score - a.bond.score || b.confidence - a.confidence || nameOf(a.id).localeCompare(nameOf(b.id)),
    );
  const sector = node.sector ? SECTOR_BY_ID[node.sector] : null;
  const groupLabels = node.groups.map((g) => GROUPS.find((x) => x.id === g)?.label ?? g);

  const timeline = [...(p?.timeline ?? [])].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  const hasMoney = !!(p?.giving || (o?.finances && o.finances.length > 0));

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

      <nav className="panel-tabs" role="tablist" aria-label="Sections">
        {(
          [
            ['overview', 'Overview'],
            ['ties', `Ties ${people.length}`],
            ...(!node.isOrg && node.researched ? ([['pull', 'Pull']] as const) : []),
            ...(hasMoney ? ([['money', 'Money']] as const) : []),
            ['record', 'Record'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'on' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <>
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

      <section>
        <h3>Closest ties</h3>
        {people.length === 0 && <p className="muted">None recorded.</p>}
        <ul className="closest">
          {people.slice(0, 5).map(({ id: otherId, links: ls, bond: b }) => (
            <li key={otherId}>
              <button className="closest-row" onClick={() => onSelect({ kind: 'link', id: pairKey(node.id, otherId) })}>
                <span className="closest-name">{nameOf(otherId)}</span>
                <span className="closest-roles muted small">
                  {[...new Set(ls.map((l) => roleOfOther(l, node.id, isOrg)))].join(' · ')}
                </span>
                <span className="closest-score" title={`Bond ${b.score}: ${b.label}`}>
                  <span className="bond-mini" aria-hidden="true">
                    <span style={{ width: `${b.score}%` }} />
                  </span>
                  <strong>{b.score}</strong>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {people.length > 5 && (
          <button className="link-button small" onClick={() => setTab('ties')}>
            See all {people.length} ties
          </button>
        )}
      </section>
        </>
      )}

      {tab === 'ties' && (
        <>
      <section>
        <h3>All ties ({people.length})</h3>
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
                      {(l.evidence.grade === 'thin' || l.evidence.grade === 'none') && (
                        <span className="evidence-flag" title={l.evidence.note}>
                          {' '}
                          · 1 source
                        </span>
                      )}
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

        </>
      )}

      {tab === 'money' && (
        <>
      {o?.finances && o.finances.length > 0 && <FinanceSection finances={o.finances} />}

      {p?.giving && <GivingSection giving={p.giving} hasFile={hasFile} onSelect={onSelect} />}

        </>
      )}

      {tab === 'pull' && <PullSection node={node} tools={pullTools} nameOf={nameOf} onSelect={onSelect} />}

      {tab === 'record' && (
        <>
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
        </>
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
