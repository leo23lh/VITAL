// The map's heads-up layer: frame corners at the map's edges and a small readout of what is on
// screen. Decoration only: it never takes taps (pointer-events: none in styles.css).

export default function MapHud({ people, ties, updated }: { people: number; ties: number; updated?: string }) {
  const n = (x: number) => x.toLocaleString('en-US');
  const day = updated
    ? new Date(`${updated}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
    : null;
  return (
    <div className="map-hud" aria-hidden="true">
      <span className="hud-corner hud-tl" />
      <span className="hud-corner hud-tr" />
      <span className="hud-corner hud-bl" />
      <span className="hud-corner hud-br" />
      <div className="hud-status">
        <span>
          {n(people)} <em>people</em>
        </span>
        <span>
          {n(ties)} <em>ties</em>
        </span>
        {day && (
          <span>
            <em>upd</em> {day}
          </span>
        )}
      </div>
    </div>
  );
}
