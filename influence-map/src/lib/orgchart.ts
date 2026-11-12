// The government org chart: who holds which post and who they report to, from each file's `office`.
import { bond, pairKey, type GraphLink, type GraphNode, type WorkplaceIndex } from './graph';
import { daysSince, officeChecked } from './freshness';
import { OFFICE_UNITS, type OfficeUnit } from './schema';

export interface ChartRow {
  id: string;
  name: string;
  title: string;
  acting: boolean;
  /** Days since the post was last confirmed (its `verified` date, else the file's research date). */
  checkedDays: number | null;
  rank: number;
  photoUrl?: string;
  /** Who they report to, when recorded. */
  bossId?: string;
  bossName?: string;
  /** The boss sits in another unit (e.g. a secretary reporting to the President). */
  bossElsewhere: boolean;
  /** Bond score (0–100) with the boss; null = no recorded tie between them. */
  bond: number | null;
  bondLabel?: string;
  children: ChartRow[];
}

export interface ChartUnit {
  id: OfficeUnit;
  label: string;
  branch: 'executive' | 'legislative';
  /** People whose boss is outside the unit (or not recorded). */
  rows: ChartRow[];
  count: number;
}

export interface OrgChart {
  executive: ChartUnit[];
  legislative: ChartUnit[];
}

const byRankThenName = (a: ChartRow, b: ChartRow) => a.rank - b.rank || a.name.localeCompare(b.name);

export function buildOrgChart(nodes: GraphNode[], links: GraphLink[], workplaces: WorkplaceIndex): OrgChart {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pairLinks = new Map<string, GraphLink[]>();
  for (const l of links) {
    const k = pairKey(l.sourceId, l.targetId);
    const list = pairLinks.get(k);
    if (list) list.push(l);
    else pairLinks.set(k, [l]);
  }
  const holders = nodes.filter((n) => n.person?.office);

  const rowOf = (n: GraphNode): ChartRow => {
    const o = n.person!.office!;
    const boss = o.reports_to ? byId.get(o.reports_to) : undefined;
    const tie = boss ? pairLinks.get(pairKey(n.id, boss.id)) : undefined;
    const b = boss && tie?.length ? bond(n, boss, tie, workplaces) : null;
    return {
      id: n.id,
      name: n.name,
      title: o.title,
      acting: !!o.acting,
      checkedDays: daysSince(officeChecked(n)),
      rank: o.rank,
      photoUrl: n.photoUrl,
      bossId: boss?.id,
      bossName: boss?.name,
      bossElsewhere: !!boss && boss.person?.office?.unit !== o.unit,
      bond: b ? b.score : null,
      bondLabel: b?.label,
      children: [],
    };
  };

  const units: ChartUnit[] = [];
  for (const u of OFFICE_UNITS) {
    const members = holders.filter((n) => n.person!.office!.unit === u.id);
    if (!members.length) continue;
    const rows = new Map(members.map((n) => [n.id, rowOf(n)]));
    const roots: ChartRow[] = [];
    for (const r of rows.values()) {
      const parent = r.bossId && !r.bossElsewhere ? rows.get(r.bossId) : undefined;
      if (parent) parent.children.push(r);
      else roots.push(r);
    }
    for (const r of rows.values()) r.children.sort(byRankThenName);
    roots.sort(byRankThenName);
    units.push({ id: u.id, label: u.label, branch: u.branch, rows: roots, count: members.length });
  }
  return {
    executive: units.filter((u) => u.branch === 'executive'),
    legislative: units.filter((u) => u.branch === 'legislative'),
  };
}
