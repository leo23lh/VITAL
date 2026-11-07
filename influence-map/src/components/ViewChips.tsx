import type { View } from '../App';
import { viewLabel } from './Toolbar';

interface Props {
  view: View;
  year: number | null;
  nameOf: (id: string) => string;
  onView: (v: View) => void;
  onYear: (y: number | null) => void;
}

/** Floating chips over the map that say what's filtered, each with a way out. */
export default function ViewChips({ view, year, nameOf, onView, onYear }: Props) {
  if (view.kind === 'all' && year == null) return null;
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
      {year != null && (
        <span className="chip">
          <span className="chip-label">In {year}</span>
          <button className="chip-x" onClick={() => onYear(null)} aria-label="All years">
            ×
          </button>
        </span>
      )}
    </div>
  );
}
