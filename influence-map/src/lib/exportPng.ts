import { IS_ARTIFACT, capability, type ArtifactDownloads } from './platform';
import { EDGE_FAMILIES, SECTORS, type EdgeFamily } from './schema';

/** Saves the graph canvas as a PNG with the legend drawn in the top-left corner. */
export async function exportGraphPng(
  container: HTMLElement,
  opts: { background: string; hidden: Set<EdgeFamily>; counts: Record<EdgeFamily, number> },
): Promise<void> {
  const blob = await renderPng(container, opts);
  if (!blob) return;
  const filename = `influence-map-${new Date().toISOString().slice(0, 10)}.png`;

  if (IS_ARTIFACT) {
    // Artifact pages can't start downloads themselves; the viewer confirms the save.
    const downloads = await capability<ArtifactDownloads>('downloads');
    await downloads?.save({ filename, data: blob }).catch(() => undefined);
    return;
  }

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Whether this view can save files (always locally; via the downloads capability as an Artifact). */
export async function canExport(): Promise<boolean> {
  if (!IS_ARTIFACT) return true;
  return (await capability<ArtifactDownloads>('downloads')) !== null;
}

function renderPng(
  container: HTMLElement,
  opts: { background: string; hidden: Set<EdgeFamily>; counts: Record<EdgeFamily, number> },
): Promise<Blob | null> {
  const src = container.querySelector('canvas');
  if (!src) return Promise.resolve(null);
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, 0, 0);

  const dpr = src.width / (src.clientWidth || src.width);
  ctx.scale(dpr, dpr);

  const families = EDGE_FAMILIES.filter((f) => !opts.hidden.has(f.id) && (opts.counts[f.id] ?? 0) > 0);
  const rowH = 18;
  const boxW = 220;
  const boxH = 44 + (families.length + SECTORS.length) * rowH + 10;
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

  ctx.font = '12px system-ui, -apple-system, Segoe UI, sans-serif';
  families.forEach((f, i) => {
    const y = 52 + i * rowH;
    ctx.fillStyle = f.color;
    if (f.dotted) for (let x = 24; x < 46; x += 5) ctx.fillRect(x, y - 1.5, 2, 3);
    else ctx.fillRect(24, y - 1.5, 22, 3);
    ctx.fillStyle = '#d4d9e3';
    ctx.fillText(`${f.label} (${f.hint})`, 54, y);
  });
  SECTORS.forEach((s, i) => {
    const y = 62 + (families.length + i) * rowH;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(35, y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#d4d9e3';
    ctx.fillText(s.label, 54, y);
  });

  return new Promise((resolve) => out.toBlob(resolve, 'image/png'));
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
