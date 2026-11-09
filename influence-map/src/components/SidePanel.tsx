import { useEffect, useRef, useState } from 'react';
import { bond, type Comparison, type WorkplaceIndex, pairKey, type GraphLink, type GraphNode } from '../lib/graph';
import { EDGE_GROUP_BY_ID } from '../lib/schema';
import type { Layout, Selection } from '../lib/view';
import { NodePanel } from './panel/NodePanel';
import { PairPanel } from './panel/PairPanel';
import { ComparePanel } from './panel/ComparePanel';
import type { BackingTools } from './panel/BackingSection';
import type { PullTools } from './panel/PullSection';

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
  /** Who worked where (from timelines), for the bond meter. */
  workplaces: WorkplaceIndex;
  pullTools: PullTools;
  backingTools: BackingTools;
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
  workplaces,
  pullTools,
  backingTools,
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
    body = (
      <ComparePanel
        c={comparison!}
        nameOf={nameOf}
        isOrg={isOrg}
        onSelect={onSelect}
        meter={
          comparison!.direct.length > 0 ? (
            <BondMeter
              a={nodeById.get(comparison!.a)}
              b={nodeById.get(comparison!.b)}
              links={comparison!.direct}
              workplaces={workplaces}
            />
          ) : null
        }
      />
    );
  } else if (selection.kind === 'node') {
    const node = nodeById.get(selection.id);
    if (node)
      body = (
        <NodePanel
          key={node.id}
          node={node}
          links={links}
          nameOf={nameOf}
          isOrg={(id) => !!nodeById.get(id)?.isOrg}
          hasFile={(id) => nodeById.has(id)}
          onSelect={onSelect}
          onWorld={onWorld}
          others={nodes}
          onCompare={onCompare}
          nodeOf={(id) => nodeById.get(id)}
          workplaces={workplaces}
          pullTools={pullTools}
          backingTools={backingTools}
        />
      );
  } else {
    const pair = links.filter((l) => pairKey(l.sourceId, l.targetId) === selection.id);
    if (pair.length)
      body = (
        <PairPanel
          links={pair}
          nameOf={nameOf}
          isOrg={isOrg}
          onSelect={onSelect}
          onCompare={onCompare}
          meter={
            <BondMeter
              a={nodeById.get(pair[0].sourceId)}
              b={nodeById.get(pair[0].targetId)}
              links={pair}
              workplaces={workplaces}
            />
          }
        />
      );
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


function BondMeter({
  a,
  b,
  links,
  workplaces,
}: {
  a: GraphNode | undefined;
  b: GraphNode | undefined;
  links: GraphLink[];
  workplaces: WorkplaceIndex;
}) {
  // Orgs have no timelines; the meter is for people and orgs alike, from their links.
  const x = bond(a, b, links, workplaces);
  const now = new Date().getFullYear();
  const spanText = x.span ? (x.span[1] >= now && x.status !== 'ended' ? `${x.span[0]}–present` : `${x.span[0]}–${x.span[1]}`) : '';
  const rows: { label: string; value: number; text: string }[] = [
    {
      label: 'Depth',
      value: x.depth,
      text: x.kinds.length
        ? x.kinds.map((k) => EDGE_GROUP_BY_ID[k.group].label).join(' · ')
        : 'No friendly tie on record',
    },
    {
      label: 'Years together',
      value: x.years,
      text: x.family
        ? 'Family: lifelong'
        : `${x.yearsTogether} year${x.yearsTogether === 1 ? '' : 's'}${spanText ? ` (${spanText})` : ''}${
            x.undated ? ` · ${x.undated} tie${x.undated === 1 ? ' has' : 's have'} no dates` : ''
          }`,
    },
    {
      label: 'On the record',
      value: x.record,
      text: [
        `${x.sources} source${x.sources === 1 ? '' : 's'}`,
        ...x.workplaces.map((w) => `both at ${w.org} ${w.from === w.to ? w.from : `${w.from}–${w.to}`}`),
      ].join(' · '),
    },
  ];
  return (
    <section className={`bond bond-${x.status}`}>
      <h3>Bond</h3>
      <div className="closeness-top">
        <strong className="closeness-score">{x.score}</strong>
        <span>
          <strong>{x.label}</strong>
          <span className="muted small"> · out of 100</span>
        </span>
      </div>
      <div className="closeness-bar" aria-hidden="true">
        <span style={{ width: `${x.score}%` }} />
      </div>
      <p className="bond-status small">{x.statusNote}</p>
      <dl className="bond-rows">
        {rows.map((r) => (
          <div key={r.label} className="bond-row">
            <dt>
              {r.label}
              <span className="bond-mini" aria-hidden="true">
                <span style={{ width: `${Math.round(r.value * 100)}%` }} />
              </span>
            </dt>
            <dd className="small">{r.text}</dd>
          </div>
        ))}
      </dl>
      <p className="muted small bond-note">
        Based only on what ties these two: the kinds of tie (family and co-founders count most, then mentors,
        employers and friends, then donors and allies, then colleagues), their confidence, the years they cover, shared workplaces and
        how well documented it is. How many connections either has doesn't count. A rivalry or enmity now marks the
        bond broken.
      </p>
    </section>
  );
}
