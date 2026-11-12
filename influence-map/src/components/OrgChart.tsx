// Org chart view: the government as a hierarchy instead of a web. Tap anyone to open their details.
import { useEffect, useRef } from 'react';
import { ago, OFFICE_DUE_DAYS } from '../lib/freshness';
import type { ChartRow, ChartUnit, OrgChart as Chart } from '../lib/orgchart';
import Avatar from './Avatar';

interface Props {
  chart: Chart;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function BondChip({ row }: { row: ChartRow }) {
  if (!row.bossId) return null;
  if (row.bond == null)
    return (
      <span className="org-bond none" title={`No recorded tie with ${row.bossName}`}>
        no tie on record
      </span>
    );
  const level = row.bond >= 60 ? 'strong' : row.bond >= 40 ? 'solid' : 'thin';
  return (
    <span className={`org-bond ${level}`} title={`Bond with ${row.bossName}: ${row.bondLabel}`}>
      bond {row.bond}
    </span>
  );
}

function Row({ row, selectedId, onSelect }: { row: ChartRow; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <li>
      <button
        className={`org-row${row.id === selectedId ? ' selected' : ''}`}
        data-id={row.id}
        onClick={() => onSelect(row.id)}
      >
        <Avatar name={row.name} photoUrl={row.photoUrl} />
        <span className="org-text">
          <span className="org-name">{row.name}</span>
          <span className="org-title">
            {row.title}
            {row.acting && <span className="org-acting">acting</span>}
            {row.checkedDays !== null && row.checkedDays > OFFICE_DUE_DAYS && (
              <span className="org-unchecked" title="Post not confirmed recently; it may have changed">
                checked {ago(row.checkedDays)}
              </span>
            )}
          </span>
          {(row.bossElsewhere || row.bossId) && (
            <span className="org-boss">
              {row.bossElsewhere && <>Reports to {row.bossName} · </>}
              <BondChip row={row} />
            </span>
          )}
        </span>
      </button>
      {row.children.length > 0 && (
        <ul className="org-tree">
          {row.children.map((c) => (
            <Row key={c.id} row={c} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

function Unit({ unit, selectedId, onSelect }: { unit: ChartUnit; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <article className="org-card" id={`org-${unit.id}`}>
      <header>
        <h3>{unit.label}</h3>
        <span className="muted small">{unit.count}</span>
      </header>
      <ul className="org-tree org-root">
        {unit.rows.map((r) => (
          <Row key={r.id} row={r} selectedId={selectedId} onSelect={onSelect} />
        ))}
      </ul>
    </article>
  );
}

export default function OrgChart({ chart, selectedId, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Searching for someone scrolls them into view.
  useEffect(() => {
    if (!selectedId) return;
    const el = ref.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(selectedId)}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  const all = [...chart.executive, ...chart.legislative];
  const jump = (id: string) =>
    ref.current?.querySelector(`#org-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });

  return (
    <div className="orgchart" ref={ref}>
      <nav className="org-jump" aria-label="Jump to">
        {all.map((u) => (
          <button key={u.id} className="org-jump-chip" onClick={() => jump(u.id)}>
            {u.label}
          </button>
        ))}
      </nav>
      <p className="org-key muted small">
        Who reports to whom, from each person's sourced post. “Bond” is their tie with their boss (0–100);
        “no tie on record” means the map has no documented relationship between them yet.
      </p>
      {chart.executive.length > 0 && (
        <section>
          <h2>Executive branch</h2>
          <div className="org-grid">
            {chart.executive.map((u) => (
              <Unit key={u.id} unit={u} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </div>
        </section>
      )}
      {chart.legislative.length > 0 && (
        <section>
          <h2>Congress</h2>
          <div className="org-grid">
            {chart.legislative.map((u) => (
              <Unit key={u.id} unit={u} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
