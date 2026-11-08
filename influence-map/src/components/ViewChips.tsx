import type { View } from '../lib/view';
import type { YearRange } from '../lib/graph';
import { viewLabel } from './Toolbar';

interface Props {
  view: View;
  years: YearRange | null;
  /** Without a date range: current ties only, or every tie ever recorded. */
  timeMode: 'now' | 'all';
  onTimeMode: (m: 'now' | 'all') => void;
  nameOf: (id: string) => string;
  onView: (v: View) => void;
  onYears: (r: YearRange | null) => void;
}

/** Floating chips over the map that say what's filtered, each with a way out. */
export default function ViewChips({ view, years, timeMode, onTimeMode, nameOf, onView, onYears }: Props) {
  return (
    <div className="chips">
      {view.kind !== 'all' && (
        <span className="chip">
          <span className="chip-label">{viewLabel(view, nameOf)}</span>
          {view.kind === 'world' && (
            <span className="chip-seg" role="group" aria-label="How far out">
              {([1, 2] as const).map((d) => (
                <button
                  key={d}
                  className={view.depth === d ? 'on' : ''}
                  onClick={() => onView({ ...view, depth: d })}
                >
                  {d} step{d === 2 ? 's' : ''}
                </button>
              ))}
            </span>
          )}
          <button className="chip-x" onClick={() => onView({ kind: 'all' })} aria-label="Back to whole network">
            ×
          </button>
        </span>
      )}
      {years ? (
        <span className="chip">
          <span className="chip-label">{years.from === years.to ? `In ${years.from}` : `${years.from}–${years.to}`}</span>
          <button className="chip-x" onClick={() => onYears(null)} aria-label="All years">
            ×
          </button>
        </span>
      ) : view.kind === 'org' || view.kind === 'pull' ? null : (
        <span className="chip-seg time-seg" role="group" aria-label="Which ties to show">
          {(
            [
              ['now', 'Now'],
              ['all', 'All time'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              className={timeMode === m ? 'on' : ''}
              aria-pressed={timeMode === m}
              title={m === 'now' ? 'Only ties still standing' : 'Every tie ever recorded, including ended ones'}
              onClick={() => onTimeMode(m)}
            >
              {label}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}
