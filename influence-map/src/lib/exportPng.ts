import { EDGE_GROUPS, type EdgeGroup } from './schema';

/** Saves the graph canvas as a PNG with the legend drawn in the top-left corner. */
export function exportGraphPng(
  container: HTMLElement,
  opts: { background: string; hidden: Set<EdgeGroup>; counts: Record<EdgeGroup, number> },
) {
  const src = container.querySelector('canvas');
  if (!src) return;
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, 0, 0);

  const dpr = src.width / (src.clientWidth || src.width);
  ctx.scale(dpr, dpr);

  const groups = EDGE_GROUPS.filter((g) => !opts.hidden.has(g.id) && (opts.counts[g.id] ?? 0) > 0);
  const rowH = 18;
  const boxW = 210;
  const boxH = 44 + groups.length * rowH;
  ctx.fillStyle = 'rgba(20, 24, 35, 0.92)';
  roundRect(ctx, 12, 12, boxW, boxH, 8);
  ctx.fill();
  ctx.strokeStyle = '#2a3042';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#e6e9ef';
  ctx.font = '600 13px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Influence Map', 24, 30);
  ctx.fillStyle = '#8b93a7';
  ctx.font = '11px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(new Date().toISOString().slice(0, 10), 130, 30);

  groups.forEach((g, i) => {
    const y = 52 + i * rowH;
    ctx.fillStyle = g.color;
    ctx.fillRect(24, y - 1.5, 22, 3);
    ctx.fillStyle = '#d4d9e3';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(g.label, 54, y);
  });

  out.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `influence-map-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
