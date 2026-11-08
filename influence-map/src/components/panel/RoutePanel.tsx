// Route view panel: the best chains of introductions from the map owner to someone.
import { MIN_ROUTE_BOND, type Route } from '../../lib/pull';
import type { Selection } from '../../lib/view';

export function RoutePanel({
  from,
  to,
  routes,
  nameOf,
  onSelect,
}: {
  from: string;
  to: string;
  routes: Route[];
  nameOf: (id: string) => string;
  onSelect: (s: Selection) => void;
}) {
  const Name = ({ id }: { id: string }) => (
    <button className="link-button" onClick={() => onSelect({ kind: 'node', id })}>
      {nameOf(id)}
    </button>
  );
  return (
    <div className="panel-body">
      <header className="panel-header">
        <div className="panel-title">
          <h2>Getting to {nameOf(to)}</h2>
        </div>
      </header>
      <section>
        <p className="muted small">
          The strongest chains of introductions from {nameOf(from)}, best first. Each step is the Bond between the two
          people (0–100); a route’s strength multiplies them, and going through someone senior counts for less, since
          they’re harder to ask. Ties under {MIN_ROUTE_BOND} aren’t used.
        </p>
      </section>
      {routes.length === 0 && (
        <section>
          <p>No route within four introductions. The map has no strong enough chain of ties yet.</p>
        </section>
      )}
      {routes.map((r, i) => (
        <section key={r.nodes.join('>')} className="route">
          <h3>
            {i === 0 ? 'Best route' : `Route ${i + 1}`} <span className="muted small">· strength {r.score}</span>
          </h3>
          <ol className="route-steps">
            {r.nodes.map((id, j) => (
              <li key={id}>
                <Name id={id} />
                {j > 0 && <span className="route-bond">bond {r.hops[j - 1]}</span>}
              </li>
            ))}
          </ol>
          {r.nodes.length === 2 ? (
            <p className="small">You have a direct tie: reach out to {nameOf(to)} yourself.</p>
          ) : (
            <p className="small">
              Ask {nameOf(r.nodes[1])} to introduce you to {nameOf(r.nodes[2])}
              {r.nodes.length > 3 ? `, who can then connect you onward to ${nameOf(to)}.` : '.'}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
