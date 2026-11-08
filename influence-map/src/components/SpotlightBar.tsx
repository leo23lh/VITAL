interface Outsider {
  id: string;
  name: string;
  /** How many of the view's people they're tied to. */
  members: number;
}

interface Props {
  /** How many people the view itself has. */
  members: number;
  outsiders: Outsider[];
  /** Outsiders already brought onto the map. */
  added: Set<string>;
  onToggle: (id: string) => void;
}

/**
 * Spotlight views show only their own people. This row offers the outsiders tied
 * to the most of them; tapping one adds them to the map (tap again to remove).
 */
export default function SpotlightBar({ members, outsiders, added, onToggle }: Props) {
  if (!outsiders.length) return null;
  return (
    <div className="spotlight-bar" role="group" aria-label="People outside this view">
      <span className="spotlight-label">
        {members} in view · tied in from outside
      </span>
      <div className="spotlight-row">
        {outsiders.map((o) => (
          <button
            key={o.id}
            className={`spotlight-chip${added.has(o.id) ? ' on' : ''}`}
            onClick={() => onToggle(o.id)}
            aria-pressed={added.has(o.id)}
            title={`${o.name}: tied to ${o.members} in this view. Tap to ${added.has(o.id) ? 'remove from' : 'add to'} the map.`}
          >
            <span className="spotlight-plus" aria-hidden="true">
              {added.has(o.id) ? '−' : '+'}
            </span>
            {o.name}
            <span className="spotlight-count">{o.members}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
