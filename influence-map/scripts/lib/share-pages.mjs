// Link previews for the public site. Chat apps and social sites read <meta> tags from the
// page they fetch and run no JavaScript, so every person and organization gets a tiny static
// page at p/<slug>/ with its own title, description and picture, which then sends the
// browser on to ../../?p=<slug>. The viewer's Share button hands out these addresses.

export const SITE_TITLE = 'Influence Map';
export const SITE_DESCRIPTION =
  'Who is tied to whom in American power: officials, donors, tech and media figures, with a source for every link. Pull, 2028 backing, factions and rift watch.';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function clip(s, n) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).replace(/\s+\S*$/, '')}…`;
}

/** The <meta> tags for a preview. `url` and `image` must be absolute. */
export function metaTags({ title, description, url, image, imageAlt, large = false }) {
  return [
    `<meta name="description" content="${esc(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_TITLE}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    imageAlt ? `<meta property="og:image:alt" content="${esc(imageAlt)}" />` : '',
    `<meta name="twitter:card" content="${large ? 'summary_large_image' : 'summary'}" />`,
  ]
    .filter(Boolean)
    .join('\n    ');
}

/** What a preview says about one person or organization from its (public) file. */
export function previewOf(f, site) {
  const d = f.data;
  const ties = (d.connections ?? []).length;
  const lead = d.current_role || clip(d.summary, 140) || (d.kind ? `${d.kind}` : '');
  const description = clip(`${lead ? `${lead}. ` : ''}${ties} sourced tie${ties === 1 ? '' : 's'} on the Influence Map.`, 200);
  const photo = d.photo?.file ? `${site}photos/${encodeURIComponent(d.photo.file)}` : null;
  return {
    slug: f.slug,
    name: d.name || f.slug,
    title: `${d.name || f.slug} · ${SITE_TITLE}`,
    description,
    url: `${site}p/${encodeURIComponent(f.slug)}/`,
    image: photo ?? `${site}og.png`,
    imageAlt: photo ? `Photo of ${d.name}` : SITE_TITLE,
    large: !photo,
    credit: photo && d.photo.credit ? `Photo: ${d.photo.credit}, ${d.photo.license ?? ''}, via Wikimedia Commons` : '',
  };
}

/** The whole p/<slug>/index.html page. */
export function sharePage(p) {
  const target = `../../?p=${encodeURIComponent(p.slug)}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(p.title)}</title>
    ${metaTags(p)}
    <link rel="canonical" href="${esc(p.url)}" />
    <meta http-equiv="refresh" content="0; url=${esc(target)}" />
    <script>location.replace(${JSON.stringify(target)} + location.hash);</script>
    <style>body{margin:0;padding:24px;background:#08090b;color:#eceef0;font:16px/1.5 system-ui,sans-serif}a{color:#ffb21a}</style>
  </head>
  <body>
    <p><a href="${esc(target)}">${esc(p.name)} on the Influence Map</a></p>
    <p>${esc(p.description)}</p>
    ${p.credit ? `<p><small>${esc(p.credit)}</small></p>` : ''}
  </body>
</html>
`;
}
